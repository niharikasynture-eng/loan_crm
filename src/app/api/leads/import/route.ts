import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import Lead from '@/models/Lead';
import User from '@/models/User';
import Notification from '@/models/Notification';
import AuditLog from '@/models/AuditLog';
import { getAutoAssignedAgent } from '@/lib/lead-routing';
import mongoose from 'mongoose';

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role === ROLES.SUPER_ADMIN) {
      return apiError('Super admin cannot import organization leads', 403);
    }

    const body = await req.json();
    const {
      leads,
      assignmentStrategy = 'unassigned', // 'auto_route' | 'assigned_agent' | 'unassigned'
      assignedAgentId,
      skipDuplicates = true,
      defaultSource = 'File Import',
    } = body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return apiError('No lead data provided for import');
    }

    const orgId = auth.organizationId;
    const orgObjId = new mongoose.Types.ObjectId(orgId);
    const userIdObjId = new mongoose.Types.ObjectId(auth.userId);

    // Fetch active sales agents if auto-routing
    let activeAgents: any[] = [];
    if (assignmentStrategy === 'auto_route') {
      activeAgents = await User.find({
        organizationId: orgId,
        role: { $in: [ROLES.SALES_AGENT, ROLES.ONSITE_VISITOR] },
        isActive: true,
      }).select('_id name email').lean();
    }

    // Verify assigned agent if specific agent selected
    let targetAgentIdObj: mongoose.Types.ObjectId | null = null;
    if (assignmentStrategy === 'assigned_agent' && assignedAgentId) {
      const agentUser = await User.findById(assignedAgentId).select('_id');
      if (agentUser) targetAgentIdObj = agentUser._id;
    }

    // Deduplication check
    const validLeads: any[] = [];
    const errors: string[] = [];
    let skippedCount = 0;

    const phonesToCheck: string[] = [];
    const emailsToCheck: string[] = [];

    leads.forEach((l: any, idx: number) => {
      const name = l.name?.trim();
      const phone = l.phone?.toString().trim();
      const email = l.email?.toString().trim().toLowerCase();

      if (!name && !phone && !email) {
        errors.push(`Row ${idx + 1}: Missing name, phone, or email.`);
        return;
      }

      validLeads.push({
        raw: l,
        idx: idx + 1,
        name: name || (email ? email.split('@')[0] : `Lead-${phone?.slice(-4) || idx + 1}`),
        phone: phone || undefined,
        email: email || undefined,
      });

      if (phone) phonesToCheck.push(phone);
      if (email) emailsToCheck.push(email);
    });

    let existingPhoneSet = new Set<string>();
    let existingEmailSet = new Set<string>();

    if (skipDuplicates && (phonesToCheck.length > 0 || emailsToCheck.length > 0)) {
      const existingLeads = await Lead.find({
        organizationId: orgId,
        $or: [
          ...(phonesToCheck.length > 0 ? [{ phone: { $in: phonesToCheck } }] : []),
          ...(emailsToCheck.length > 0 ? [{ email: { $in: emailsToCheck } }] : []),
        ],
      }).select('phone email').lean();

      existingLeads.forEach(el => {
        if (el.phone) existingPhoneSet.add(el.phone);
        if (el.email) existingEmailSet.add(el.email.toLowerCase());
      });
    }

    // Filter duplicates and construct Mongoose documents
    const documentsToInsert: any[] = [];
    let agentIndex = 0;

    for (const item of validLeads) {
      if (skipDuplicates) {
        if (item.phone && existingPhoneSet.has(item.phone)) {
          skippedCount++;
          continue;
        }
        if (item.email && existingEmailSet.has(item.email)) {
          skippedCount++;
          continue;
        }
      }

      // Determine assigned agent
      let leadAssignedTo: mongoose.Types.ObjectId | undefined = undefined;
      if (assignmentStrategy === 'assigned_agent' && targetAgentIdObj) {
        leadAssignedTo = targetAgentIdObj;
      } else if (assignmentStrategy === 'auto_route' && activeAgents.length > 0) {
        leadAssignedTo = activeAgents[agentIndex % activeAgents.length]._id;
        agentIndex++;
      } else if (auth.role === ROLES.SALES_AGENT || auth.role === ROLES.ONSITE_VISITOR) {
        // Automatically assign leads to the agent uploading them if no other assignment chosen
        leadAssignedTo = userIdObjId;
      }

      const raw = item.raw;
      const doc = {
        organizationId: orgObjId,
        name: item.name,
        phone: item.phone,
        email: item.email,
        company: raw.company || raw.companyDomain || undefined,
        companyDomain: raw.companyDomain || undefined,
        source: raw.source || defaultSource,
        status: raw.status || 'new',
        pipelineStage: raw.status || 'new',
        value: typeof raw.value === 'number' ? raw.value : undefined,
        notes: raw.notes || undefined,
        secondaryPhone: raw.secondaryPhone || undefined,
        address: raw.address || raw.region || undefined,
        region: raw.region || raw.address || undefined,
        industry: raw.industry || undefined,
        customFields: raw.customFields || {},
        assignedTo: leadAssignedTo,
        assignedAt: leadAssignedTo ? new Date() : undefined,
        createdBy: userIdObjId,
      };

      documentsToInsert.push(doc);
    }

    if (documentsToInsert.length === 0) {
      return apiSuccess(
        {
          importedCount: 0,
          skippedCount,
          failedCount: errors.length,
          errors,
        },
        `No new leads were imported (${skippedCount} duplicates skipped)`
      );
    }

    // High performance batch insert in chunks of 500
    const CHUNK_SIZE = 500;
    let totalImported = 0;
    const insertedLeads: any[] = [];

    for (let i = 0; i < documentsToInsert.length; i += CHUNK_SIZE) {
      const chunk = documentsToInsert.slice(i, i + CHUNK_SIZE);
      const inserted = await Lead.insertMany(chunk, { ordered: false });
      totalImported += inserted.length;
      insertedLeads.push(...inserted);
    }

    // Batch Audit Log
    const auditLogs = insertedLeads.slice(0, 100).map(l => ({
      action: 'lead_imported',
      performedBy: auth.userId,
      targetId: l._id,
      targetType: 'Lead',
      organizationId: auth.organizationId,
      metadata: { source: l.source, isBulkImport: true },
    }));
    if (auditLogs.length > 0) {
      AuditLog.insertMany(auditLogs).catch(err => console.error('AuditLog insert error:', err));
    }

    // Notifications for assigned agents
    const assignedMap: Record<string, number> = {};
    insertedLeads.forEach(l => {
      if (l.assignedTo) {
        const idStr = l.assignedTo.toString();
        assignedMap[idStr] = (assignedMap[idStr] || 0) + 1;
      }
    });

    const notifs = Object.entries(assignedMap).map(([agentId, count]) => ({
      userId: agentId,
      organizationId: auth.organizationId,
      type: 'lead_assigned',
      title: '📥 Bulk Leads Assigned',
      message: `${count} new client lead(s) have been assigned to you via bulk file import.`,
      link: '/leads',
    }));
    if (notifs.length > 0) {
      Notification.insertMany(notifs).catch(err => console.error('Notification insert error:', err));
    }

    return apiSuccess({
      importedCount: totalImported,
      skippedCount,
      failedCount: errors.length,
      errors: errors.slice(0, 15),
    }, `Successfully imported ${totalImported} lead(s)`);
  } catch (err: any) {
    console.error('Lead import error:', err);
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(err.message || 'Failed to import leads', 500);
  }
}
