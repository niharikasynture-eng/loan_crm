import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import Lead from '@/models/Lead';
import User from '@/models/User';
import Notification from '@/models/Notification';
import AuditLog from '@/models/AuditLog';
import { sendLeadAssignedEmail } from '@/lib/email';
import mongoose from 'mongoose';

// PATCH /api/leads/bulk - Bulk Assign Leads
export async function PATCH(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role === ROLES.SUPER_ADMIN) {
      return apiError('Super admin cannot modify organization data', 403);
    }

    const { leadIds, assignedTo } = await req.json();

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return apiError('No lead IDs provided');
    }

    if (!assignedTo) return apiError('Select a salesperson to assign leads to');

    // 1. Verify assigned user exists
    const targetUser = await User.findById(assignedTo).select('name email role');
    if (!targetUser) return apiError('Assigned user not found');

    const leadObjectIds = leadIds.map(id => new mongoose.Types.ObjectId(id));
    const query: Record<string, any> = {
      _id: { $in: leadObjectIds },
      organizationId: auth.organizationId,
    };

    // 2. Bulk Update
    const result = await Lead.updateMany(
      query,
      { $set: { assignedTo: new mongoose.Types.ObjectId(assignedTo), assignedAt: new Date(), ghostAlertSent: false, isGhost: false } }
    );

    // 3. Process Notifications & Audits for each lead
    const leads = await Lead.find({ _id: { $in: leadObjectIds } }).select('name').lean();
    
    const notifications = leads.map(l => ({
      userId: assignedTo,
      organizationId: auth.organizationId,
      type: 'lead_assigned',
      title: 'Lead Assigned to You',
      message: `You have been assigned the lead: "${l.name}"`,
      link: `/leads/${l._id}`,
    }));

    const auditLogs = leads.map(l => ({
      action: 'lead_assigned',
      performedBy: auth.userId,
      targetId: l._id,
      targetType: 'Lead',
      organizationId: auth.organizationId,
      metadata: { assignedTo, assignedToName: targetUser.name, isBulk: true },
    }));

    await Promise.all([
      Notification.insertMany(notifications),
      AuditLog.insertMany(auditLogs)
    ]);

    if (targetUser.role === ROLES.SALES_AGENT) {
      for (const l of leads.slice(0, 10)) {
        await sendLeadAssignedEmail(targetUser.email, targetUser.name, l.name, l._id.toString()).catch(() => {});
      }
    }

    return apiSuccess({ modifiedCount: result.modifiedCount }, `Successfully assigned ${result.modifiedCount} leads to ${targetUser.name}`);
  } catch (err: unknown) {
    console.error('Bulk Assign Error:', err);
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to perform bulk assignment', 500);
  }
}

// DELETE /api/leads/bulk - Bulk Delete Leads
export async function DELETE(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role === ROLES.SUPER_ADMIN) {
      return apiError('Super admin cannot delete organization data', 403);
    }

    let leadIds: string[] = [];
    try {
      const body = await req.json();
      leadIds = body.leadIds || body.ids || [];
    } catch {
      const { searchParams } = req.nextUrl;
      const idsParam = searchParams.get('ids');
      if (idsParam) leadIds = idsParam.split(',').filter(Boolean);
    }

    if (!Array.isArray(leadIds) || leadIds.length === 0) {
      return apiError('No lead IDs provided for deletion');
    }

    const leadObjectIds = leadIds.map((id: string) => new mongoose.Types.ObjectId(id));
    const query: Record<string, any> = {
      _id: { $in: leadObjectIds },
      organizationId: auth.organizationId,
    };

    // Sales Agent and Onsite Visitor can delete leads assigned to or created by them
    if (auth.role === ROLES.SALES_AGENT || auth.role === ROLES.ONSITE_VISITOR) {
      const userObjId = new mongoose.Types.ObjectId(auth.userId);
      query.$or = [
        { assignedTo: userObjId },
        { createdBy: userObjId }
      ];
    }

    const result = await Lead.deleteMany(query);

    return apiSuccess({ deletedCount: result.deletedCount }, `Successfully deleted ${result.deletedCount} leads`);
  } catch (err: unknown) {
    console.error('Bulk Delete Error:', err);
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to perform bulk deletion', 500);
  }
}
