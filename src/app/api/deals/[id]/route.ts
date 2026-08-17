import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import Deal from '@/models/Deal';
import Lead from '@/models/Lead';
import User from '@/models/User';
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

    const deal = await Deal.findOne({ _id: id, organizationId: auth.organizationId })
      .populate('assignedTo', 'name email avatar')
      .populate('leadId', 'name email phone company')
      .lean();

    if (!deal) return apiError('Deal not found', 404);
    return apiSuccess({ deal });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch deal', 500);
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

    const body = await req.json();
    const allowed = ['title', 'value', 'stage', 'probability', 'expectedCloseDate', 'actualCloseDate', 'assignedTo', 'lostReason', 'notes', 'position'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (body.stage === 'closed_won' || body.stage === 'closed_lost' || body.stage === 'won') {
      updates.actualCloseDate = new Date();
    }

    const deal = await Deal.findOneAndUpdate(
      { _id: id, organizationId: auth.organizationId },
      updates,
      { new: true }
    )
      .populate('assignedTo', 'name email avatar')
      .populate('leadId', 'name email phone company');

    if (!deal) return apiError('Deal not found', 404);

    // Handoff Workflow: Auto-convert Won Deal to Post-Sales Booking Contract if stage is closed_won / won
    if (body.stage === 'closed_won' || body.stage === 'won') {
      try {
        const assignedObj = deal.assignedTo as any;
        const salesPersonId = assignedObj && typeof assignedObj === 'object' && assignedObj._id 
          ? assignedObj._id 
          : typeof assignedObj === 'string' && assignedObj 
            ? assignedObj 
            : auth.userId;

        const totalVal = deal.value || 1000000;
        const leadObj = deal.leadId as any;
        const leadCompany = leadObj?.company || leadObj?.name || 'Client';

        let existingBooking = await Booking.findOne({ organizationId: auth.organizationId, dealId: deal._id });
        if (!existingBooking) {
          existingBooking = await Booking.create({
            organizationId: auth.organizationId,
            leadId: leadObj?._id || deal.leadId,
            salesPersonId,
            dealId: deal._id,
            unitNumber: deal.title || 'Enterprise Software Solution',
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

          // Create onboarding notification task for rep
          await Task.create({
            organizationId: auth.organizationId,
            leadId: leadObj?._id || deal.leadId,
            category: 'handover',
            title: `🚀 Initiate Post-Sales Onboarding: ${deal.title}`,
            description: `Deal "${deal.title}" (₹${(totalVal / 100000).toFixed(1)}L) closed won! Post-Sales delivery contract created.`,
            status: 'pending',
            priority: 'high',
            dueDate: new Date(Date.now() + 2 * 86400000),
            assignedTo: salesPersonId,
            createdBy: auth.userId,
          }).catch(() => {});
        } else {
          let dirty = false;
          if (totalVal && existingBooking.totalAmount !== totalVal) {
            existingBooking.totalAmount = totalVal;
            dirty = true;
          }
          if (dirty) {
            await existingBooking.save();
          }
        }
      } catch (err: any) {
        console.error('Deal → Booking handoff warning:', err);
      }
    }

    return apiSuccess({ deal });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to update deal', 500);
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

    await Deal.findOneAndDelete({ _id: id, organizationId: auth.organizationId });
    return apiSuccess(null, 'Deal deleted');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to delete deal', 500);
  }
}
