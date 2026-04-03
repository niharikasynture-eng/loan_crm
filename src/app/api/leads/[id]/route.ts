import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import Lead from '@/models/Lead';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { sendLeadAssignedEmail } from '@/lib/email';
import AuditLog from '@/models/AuditLog';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req);
    const { id } = await params;
    await connectDB();

    if (auth.role === ROLES.SUPER_ADMIN) return apiError('Access denied', 403);

    const query: Record<string, unknown> = { _id: id, organizationId: auth.organizationId };
    // Sales agent can only view their assigned leads
    if (auth.role === ROLES.SALES_AGENT) query.assignedTo = auth.userId;

    const lead = await Lead.findOne(query)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .lean();

    if (!lead) return apiError('Lead not found', 404);
    return apiSuccess({ lead });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch lead', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req);
    const { id } = await params;
    await connectDB();

    if (auth.role === ROLES.SUPER_ADMIN) return apiError('Access denied', 403);

    const body = await req.json();

    // Sales agent can now update basic contact info for their leads
    const saleAgentAllowed = ['name', 'phone', 'email', 'company', 'status', 'pipelineStage', 'notes', 'lastContactedAt', 'customFields', 'tags'];
    const allAllowed = ['name', 'phone', 'email', 'company', 'source', 'status', 'pipelineStage', 'assignedTo', 'value', 'notes', 'tags', 'lastContactedAt', 'customFields'];

    const allowedFields = auth.role === ROLES.SALES_AGENT ? saleAgentAllowed : allAllowed;

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    // Sales agent can only update their own leads
    const query: Record<string, unknown> = { _id: id, organizationId: auth.organizationId };
    if (auth.role === ROLES.SALES_AGENT) query.assignedTo = auth.userId;

    const previousLead = await Lead.findOne(query).lean();
    if (!previousLead) return apiError('Lead not found', 404);

    const lead = await Lead.findOneAndUpdate(query, updates, { new: true })
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .lean();

    if (!lead) return apiError('Lead not found', 404);

    // Audit status change
    if (body.status && body.status !== (previousLead as {status: string}).status) {
      await AuditLog.create({
        action: 'lead_status_changed',
        performedBy: auth.userId,
        targetId: id,
        targetType: 'Lead',
        organizationId: auth.organizationId,
        metadata: { from: (previousLead as {status: string}).status, to: body.status },
      });
    }

    // Handle assignment change — notify newly assigned salesperson
    const prevAssigned = (previousLead as {assignedTo?: unknown}).assignedTo?.toString();
    if (body.assignedTo && body.assignedTo !== prevAssigned) {
      const assignedUser = await User.findById(body.assignedTo).select('name email role');
      if (assignedUser) {
        await Notification.create({
          userId: body.assignedTo,
          organizationId: auth.organizationId,
          type: 'lead_assigned',
          title: 'Lead Assigned to You',
          message: `You have been assigned the lead: "${(lead as {name: string}).name}"`,
          link: `/leads/${id}`,
        });
        if (assignedUser.role === ROLES.SALES_AGENT) {
          await sendLeadAssignedEmail(assignedUser.email, assignedUser.name, (lead as {name: string}).name, id);
        }
        await AuditLog.create({
          action: 'lead_assigned',
          performedBy: auth.userId,
          targetId: id,
          targetType: 'Lead',
          organizationId: auth.organizationId,
          metadata: { assignedTo: body.assignedTo, assignedToName: assignedUser.name },
        });
      }
    }

    return apiSuccess({ lead });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to update lead', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req);
    const { id } = await params;
    await connectDB();

    if (auth.role === ROLES.SUPER_ADMIN || auth.role === ROLES.SALES_AGENT) {
      return apiError('Access denied', 403);
    }

    const lead = await Lead.findOneAndDelete({ _id: id, organizationId: auth.organizationId });
    if (!lead) return apiError('Lead not found', 404);
    return apiSuccess(null, 'Lead deleted');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to delete lead', 500);
  }
}
