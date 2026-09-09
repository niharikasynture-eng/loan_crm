import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import Lead from '@/models/Lead';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { sendLeadAssignedEmail } from '@/lib/email';
import AuditLog from '@/models/AuditLog';
import Booking from '@/models/Booking';
import Task from '@/models/Task';

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
    // Sales agent and Onsite Visitor can only view their assigned leads
    if (auth.role === ROLES.SALES_AGENT || auth.role === ROLES.ONSITE_VISITOR) query.assignedTo = auth.userId;

    const lead = await Lead.findOne(query)
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email role avatar')
      .populate('lastStageChangedBy', 'name email avatar')
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

    // Field restrictions based on role
    const newFields = [
      'secondaryPhone', 'address', 'flatNo', 'landmark', 'area', 'pincode', 'region', 'industry', 'income', 'occupation', 'education',
      'dateOfVisit', 'timeOfVisit', 'mapLink', 'hasMedeclaim', 'sumAssured', 'insuranceCompany', 'healthStatus',
      'familyAges', 'tseName', 'tlName', 'visitDate'
    ];

    const saleAgentAllowed = ['name', 'phone', 'email', 'company', 'status', 'pipelineStage', 'notes', 'lastContactedAt', 'customFields', 'tags', 'lostReason', 'isGhost', ...newFields];
    const managerAllowed = ['name', 'phone', 'email', 'company', 'source', 'status', 'pipelineStage', 'assignedTo', 'value', 'notes', 'tags', 'lastContactedAt', 'customFields', 'lostReason', 'isGhost', ...newFields];
    const adminAllowed = ['name', 'phone', 'email', 'company', 'source', 'status', 'pipelineStage', 'value', 'notes', 'tags', 'lastContactedAt', 'customFields', 'lostReason', 'notes', 'isGhost', ...newFields];

    let allowedFields: string[];
    if (auth.role === ROLES.MANAGER) {
      allowedFields = managerAllowed;
    } else if (auth.role === ROLES.SALES_AGENT) {
      allowedFields = saleAgentAllowed;
    } else if (auth.role === ROLES.ONSITE_VISITOR) {
      allowedFields = ['isReadByVisitor'];
    } else {
      // org_admin (cannot assign leads)
      allowedFields = adminAllowed;
    }

    const updates: Record<string, unknown> = {};
    for (const key of allowedFields) {
      if (body[key] !== undefined) updates[key] = body[key];
    }

    const query: Record<string, unknown> = { _id: id, organizationId: auth.organizationId };

    const previousLead = await Lead.findOne(query).lean();
    if (!previousLead) return apiError('Lead not found', 404);

    // Track status/stage change audit details
    const newStage = body.pipelineStage || body.status;
    const oldStage = (previousLead as any).pipelineStage || (previousLead as any).status;
    if (newStage && newStage !== oldStage) {
      updates.previousStage = oldStage;
      updates.lastStageChangedBy = auth.userId;
      updates.lastStageChangedAt = new Date();
    }

    const lead = await Lead.findOneAndUpdate(query, updates, { new: true })
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('lastStageChangedBy', 'name email avatar')
      .lean();

    if (!lead) return apiError('Lead not found', 404);

    // Handoff Workflow: Auto-create Post-Sales Booking when lead stage changes to 'won' or 'closed_won'
    if (newStage === 'won' || newStage === 'closed_won') {
      try {
        const assignedObj = (lead as any).assignedTo;
        const salesPersonId = assignedObj && typeof assignedObj === 'object' && assignedObj._id 
          ? assignedObj._id 
          : typeof assignedObj === 'string' && assignedObj 
            ? assignedObj 
            : auth.userId;

        const totalVal = (lead as any).value || 1000000;
        const leadCompany = (lead as any).company || (lead as any).name || 'Client';

        let existingBooking = await Booking.findOne({ organizationId: auth.organizationId, leadId: lead._id });
        if (!existingBooking) {
          existingBooking = await Booking.create({
            organizationId: auth.organizationId,
            leadId: (lead as any)._id,
            salesPersonId,
            unitNumber: `${(lead as any).name}'s SAP Contract`,
            projectName: `${leadCompany} Implementation Project`,
            totalAmount: totalVal,
            bookingDate: new Date(),
            contractEndDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            renewalStatus: 'active',
            status: 'contract_signed',
            paymentMilestones: [
              { name: '20% Execution Deposit & Contract Signing', amount: totalVal * 0.2, dueDate: new Date(Date.now() + 7 * 86400000), status: 'pending', paidAmount: 0 },
              { name: '40% System Blueprint & Configuration', amount: totalVal * 0.4, dueDate: new Date(Date.now() + 45 * 86400000), status: 'pending', paidAmount: 0 },
              { name: '40% Go-Live Production Handover', amount: totalVal * 0.4, dueDate: new Date(Date.now() + 90 * 86400000), status: 'pending', paidAmount: 0 },
            ],
            documents: [
              { name: 'Master Services Agreement (MSA)', status: 'pending' },
              { name: 'Service Level Agreement (SLA)', status: 'pending' },
              { name: 'Software License Entitlement Certificate', status: 'pending' },
            ],
            handoverChecklist: [
              { item: 'Tenant Provisioning & Admin Credentials Activation', completed: false },
              { item: 'Single Sign-On (SSO) & Security Audit Pass', completed: false },
              { item: 'Official Production Go-Live Certificate & Handover', completed: false },
            ],
          });

          await Task.create({
            organizationId: auth.organizationId,
            leadId: (lead as any)._id,
            category: 'handover',
            title: `🚀 Initiate Post-Sales Onboarding: ${(lead as any).name}`,
            description: `Client "${(lead as any).name}" moved to Won! Post-Sales delivery contract created.`,
            status: 'pending',
            priority: 'high',
            dueDate: new Date(Date.now() + 2 * 86400000),
            assignedTo: salesPersonId,
            createdBy: auth.userId,
          }).catch(() => {});
        } else {
          // If existing booking exists, ensure total amount or assigned salesperson is synchronized
          let dirty = false;
          if (totalVal && existingBooking.totalAmount !== totalVal) {
            existingBooking.totalAmount = totalVal;
            dirty = true;
          }
          if (existingBooking.status === undefined) {
            existingBooking.status = 'contract_signed';
            dirty = true;
          }
          if (dirty) {
            await existingBooking.save();
          }
        }
      } catch (err: any) {
        console.error('Lead → Booking handoff warning:', err);
      }
    }
    
    // Handle Mark as Read by Onsite Visitor
    if (body.isReadByVisitor === true && !(previousLead as any).isReadByVisitor) {
      const visitor = await User.findById(auth.userId).select('managerId name').lean();
      if (visitor && visitor.managerId) {
        await Lead.findByIdAndUpdate(id, { readAt: new Date() });
        await Notification.create({
          userId: visitor.managerId,
          organizationId: auth.organizationId,
          type: 'lead_assigned', 
          title: 'Lead Receipt Acknowledged',
          message: `${visitor.name} marked Lead "${(lead as any).name}" as read.`,
          link: `/leads/${id}`,
        });
      }
    }

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
        const leadVal = (lead as any).value || 0;
        const leadTags = (lead as any).tags || [];
        const isHighPriority =
          leadVal >= 50000 ||
          leadTags.some((t: string) => ['urgent', 'high-priority', 'hot', 'vip'].includes(t.toLowerCase()));

        const title = isHighPriority ? '🚨 HIGH PRIORITY: Urgent Client Assigned!' : '📋 Client Assigned to You';
        const message = isHighPriority
          ? `Urgent: High-value client "${(lead as {name: string}).name}" has been assigned to you.`
          : `You have been assigned the client: "${(lead as {name: string}).name}"`;

        await Notification.create({
          userId: body.assignedTo,
          organizationId: auth.organizationId,
          type: 'lead_assigned',
          title,
          message,
          link: `/leads/${id}`,
        });

        if (assignedUser.email) {
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
