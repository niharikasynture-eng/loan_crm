import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import Lead from '@/models/Lead';
import User from '@/models/User';
import Notification from '@/models/Notification';
import { sendLeadAssignedEmail } from '@/lib/email';

// GET /api/leads
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    // Super admin cannot access org CRM data
    if (auth.role === ROLES.SUPER_ADMIN) {
      return apiError('Super admin cannot access organization data', 403);
    }

    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const status = searchParams.get('status');
    const assignedTo = searchParams.get('assignedTo');
    const source = searchParams.get('source');
    const search = searchParams.get('search');

    const query: Record<string, unknown> = { organizationId: auth.organizationId };

    // Sales agent and Onsite Visitor can only see their own leads
    if (auth.role === ROLES.SALES_AGENT || auth.role === ROLES.ONSITE_VISITOR) {
      query.assignedTo = auth.userId;
    }

    if (status) query.status = status;
    if (assignedTo && auth.role !== ROLES.SALES_AGENT) query.assignedTo = assignedTo;
    if (source) query.source = source;
    if (search) {
      query.$text = { $search: search };
    }

    const [leads, total] = await Promise.all([
      Lead.find(query)
        .populate('assignedTo', 'name email avatar')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Lead.countDocuments(query),
    ]);

    return apiSuccess({ leads, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch leads', 500);
  }
}

// POST /api/leads
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    // Super admin cannot create leads
    if (auth.role === ROLES.SUPER_ADMIN) {
      return apiError('Super admin cannot access organization data', 403);
    }

    const body = await req.json();
    const { 
      name, phone, email, company, source, status, assignedTo, value, notes, tags,
      secondaryPhone, address, flatNo, landmark, area, pincode, income, occupation, education,
      dateOfVisit, timeOfVisit, mapLink, hasMedeclaim, sumAssured, insuranceCompany, healthStatus,
      familyAges, tseName, tlName, visitDate, customFields
    } = body;

    if (!name) return apiError('Lead name is required');

    const lead = await Lead.create({
      organizationId: auth.organizationId,
      name,
      phone,
      email,
      company,
      source: source || 'Other',
      status: status || 'new',
      assignedTo: assignedTo || null,
      value,
      notes,
      tags: tags || [],
      secondaryPhone, address, flatNo, landmark, area, pincode, income, occupation, education,
      dateOfVisit, timeOfVisit, mapLink, hasMedeclaim, sumAssured, insuranceCompany, healthStatus,
      familyAges, tseName, tlName, visitDate,
      customFields: customFields || {},
      createdBy: auth.userId,
    });

    const populated = await Lead.findById(lead._id)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .lean();

    // Trigger notifications: org_admin + managers
    await notifyNewLead(auth.organizationId, lead._id.toString(), name, assignedTo);

    return apiSuccess({ lead: populated }, 'Lead created', 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to create lead', 500);
  }
}

// Helper: notify org_admin and managers about new lead
export async function notifyNewLead(
  organizationId: string,
  leadId: string,
  leadName: string,
  assignedToId?: string
) {
  try {
    /* 
    // STAFF NOTIFICATIONS DISABLED AS PER USER REQUEST
    // Find org admins and managers to notify
    const recipients = await User.find({
      organizationId,
      role: { $in: [ROLES.ORG_ADMIN, ROLES.MANAGER] },
      isActive: true,
    }).select('_id').lean();

    if (recipients.length > 0) {
      await Notification.insertMany(
        recipients.map((r) => ({
          userId: r._id,
          organizationId,
          type: 'new_lead',
          title: 'New Lead Received',
          message: `A new lead "${leadName}" has been added.`,
          link: `/leads/${leadId}`,
        }))
      );
    }

    // Notify assigned salesperson (if assigned to someone other than creator)
    if (assignedToId) {
      const assignedUser = await User.findById(assignedToId).select('name email role');
      if (assignedUser && assignedUser.role === ROLES.SALES_AGENT) {
        await Notification.create({
          userId: assignedToId,
          organizationId,
          type: 'lead_assigned',
          title: 'Lead Assigned to You',
          message: `You have been assigned the lead: "${leadName}"`,
          link: `/leads/${leadId}`,
        });
        // Also send email
        await sendLeadAssignedEmail(assignedUser.email, assignedUser.name, leadName, leadId);
      }
    }
    */
  } catch (err) {
    console.error('Failed to send lead notifications:', err);
  }
}
