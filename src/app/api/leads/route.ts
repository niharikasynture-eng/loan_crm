import { NextRequest } from 'next/server';
import mongoose from 'mongoose';

import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import Lead from '@/models/Lead';
import Deal from '@/models/Deal';
import AuditLog from '@/models/AuditLog';

export async function notifyNewLead(
  orgIdOrLead: any,
  leadId?: string,
  name?: string,
  assignedAgentId?: string,
  extra?: any
) {
  try {
    const Notification = (await import('@/models/Notification')).default;
    const User = (await import('@/models/User')).default;

    let orgId: string | undefined;
    let targetLeadId: string | undefined;
    let leadName: string | undefined;
    let targetAgentId: string | undefined = assignedAgentId;

    if (typeof orgIdOrLead === 'object' && orgIdOrLead !== null) {
      orgId = orgIdOrLead.organizationId?.toString();
      targetLeadId = orgIdOrLead._id?.toString();
      leadName = orgIdOrLead.name;
      targetAgentId = orgIdOrLead.assignedTo?.toString();
    } else {
      orgId = orgIdOrLead;
      targetLeadId = leadId;
      leadName = name;
    }

    let targetUserId = targetAgentId;
    if (!targetUserId && orgId) {
      const admin = await User.findOne({ organizationId: orgId, role: 'org_admin' });
      targetUserId = admin?._id?.toString();
    }

    if (targetUserId && orgId) {
      await Notification.create({
        userId: targetUserId,
        organizationId: orgId,
        type: 'lead_assigned',
        title: 'New Lead Created',
        message: `New lead "${leadName || 'Lead'}" has been submitted/created.`,
        link: `/leads/${targetLeadId}`,
      });
    }
  } catch (err) {
    console.error('Failed to notify new lead:', err);
  }
}

// GET /api/leads — List leads with search, filters, pagination
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    // Super Admin does not manage leads directly
    if (auth.role === ROLES.SUPER_ADMIN) {
      return apiSuccess({ leads: [], total: 0, page: 1, limit: 20 });
    }

    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const skipParam = searchParams.get('skip');
    const skip = skipParam !== null ? parseInt(skipParam) : (page - 1) * limit;

    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const source = searchParams.get('source');
    const search = searchParams.get('search');
    const industry = searchParams.get('industry');
    const region = searchParams.get('region');
    const dateRange = searchParams.get('dateRange');

    const query: Record<string, any> = { organizationId: auth.organizationId };

    // Sales agent and Onsite Visitor can see leads assigned to them OR created/imported by them
    if (auth.role === ROLES.SALES_AGENT || auth.role === ROLES.ONSITE_VISITOR) {
      const userObjId = new mongoose.Types.ObjectId(auth.userId);
      query.$or = [
        { assignedTo: userObjId },
        { createdBy: userObjId }
      ];
    }

    if (status && status !== 'all') query.status = status;
    if (assignedTo && assignedTo !== 'all' && auth.role !== ROLES.SALES_AGENT) query.assignedTo = assignedTo;
    if (source && source !== 'all') query.source = source;
    
    if (industry && industry !== 'all') {
      const reg = new RegExp(industry.split(' ')[0], 'i');
      const domainFilter = [
        { industry: reg },
        { companyDomain: reg },
        { company: reg },
      ];
      if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: domainFilter }
        ];
        delete query.$or;
      } else {
        query.$or = domainFilter;
      }
    }

    if (region && region !== 'all') {
      const regPattern = new RegExp(region.split(' ')[0], 'i');
      const regionFilter = [
        { region: regPattern },
        { address: regPattern },
        { area: regPattern },
      ];
      if (query.$and && Array.isArray(query.$and)) {
        query.$and.push({ $or: regionFilter });
      } else if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: regionFilter }
        ];
        delete query.$or;
      } else {
        query.$or = regionFilter;
      }
    }

    if (dateRange && dateRange !== 'all') {
      const now = new Date();
      let start: Date | null = null;
      let end: Date | null = null;

      if (dateRange === 'today') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateRange === 'yesterday') {
        start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      } else if (dateRange === '7days') {
        start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      } else if (dateRange === '30days') {
        start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      } else if (dateRange === 'thisMonth') {
        start = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      if (start) {
        const dateFilter: Record<string, Date> = { $gte: start };
        if (end) dateFilter.$lt = end;
        query.createdAt = dateFilter;
      }
    }

    if (search) {
      const searchRegex = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      const searchConditions = [
        { name: searchRegex },
        { company: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
      if (query.$and && Array.isArray(query.$and)) {
        query.$and.push({ $or: searchConditions });
      } else if (query.$or) {
        query.$and = [
          { $or: query.$or },
          { $or: searchConditions },
        ];
        delete query.$or;
      } else {
        query.$or = searchConditions;
      }
    }

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate('assignedTo', 'name email avatar')
        .populate('createdBy', 'name email')
        .populate('lastStageChangedBy', 'name email avatar')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Lead.countDocuments(query),
    ]);

    return apiSuccess({ leads, total, page, limit });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
      if (err.message === 'FORBIDDEN') return apiError('Forbidden', 403);
    }
    console.error('[GET /api/leads ERROR]', err);
    return apiError('Failed to fetch leads', 500);
  }
}

// POST /api/leads — Create single lead manually
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role === ROLES.SUPER_ADMIN) {
      return apiError('Super admin cannot create leads', 403);
    }

    const body = await req.json();
    const { name, email, phone, company, value, source, region, notes, assignedTo } = body;

    if (!name) return apiError('Lead name is required');

    // Sales agents always assign leads to themselves
    const finalAssignedTo =
      auth.role === ROLES.SALES_AGENT || auth.role === ROLES.ONSITE_VISITOR
        ? auth.userId
        : assignedTo || auth.userId;

    const lead = await Lead.create({
      organizationId: auth.organizationId,
      name,
      email,
      phone,
      company,
      value: value ? Number(value) : 0,
      source: source || 'other',
      region: region || 'Central',
      notes,
      assignedTo: finalAssignedTo,
      createdBy: auth.userId,
      status: 'new',
      pipelineStage: 'new',
    });

    // Create deal entry for pipeline
    await Deal.create({
      organizationId: auth.organizationId,
      leadId: lead._id,
      title: `${name}${company ? ` - ${company}` : ''}`,
      value: value ? Number(value) : 0,
      stage: 'new',
      assignedTo: finalAssignedTo,
      createdBy: auth.userId,
      position: 0,
    });

    await notifyNewLead(lead);

    // Audit log
    await AuditLog.create({
      action: 'lead_created',
      performedBy: auth.userId,
      targetId: lead._id,
      targetType: 'Lead',
      metadata: { leadName: name, company },
    });

    return apiSuccess({ lead }, 'Lead created successfully', 201);
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
      if (err.message === 'FORBIDDEN') return apiError('Forbidden', 403);
    }
    console.error('[POST /api/leads ERROR]', err);
    return apiError('Failed to create lead', 500);
  }
}
