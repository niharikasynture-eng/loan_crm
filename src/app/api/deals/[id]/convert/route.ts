import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import Deal from '@/models/Deal';
import Booking from '@/models/Booking';
import Task from '@/models/Task';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role === ROLES.SUPER_ADMIN || auth.role === ROLES.ONSITE_VISITOR) {
      return apiError('Access denied', 403);
    }

    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    const deal = await Deal.findOne({ _id: id, organizationId: auth.organizationId })
      .populate('leadId', 'name email phone company')
      .populate('assignedTo', 'name email avatar');

    if (!deal) return apiError('Deal not found', 404);

    // Check if contract already exists
    const existing = await Booking.findOne({ organizationId: auth.organizationId, dealId: deal._id });
    if (existing) {
      return apiSuccess({ booking: existing, alreadyExisted: true }, 'Post-Sales contract already exists for this deal');
    }

    const totalVal = body.totalAmount || deal.value || 1000000;
    const unitNumber = body.unitNumber || deal.title || 'Enterprise Software Solution';
    const projectName = body.projectName || `${(deal.leadId as any)?.company || (deal.leadId as any)?.name || 'Client'} Implementation`;

    // Ensure deal is marked as won
    deal.stage = 'closed_won';
    deal.actualCloseDate = new Date();
    await deal.save();

    const booking = await Booking.create({
      organizationId: auth.organizationId,
      leadId: (deal.leadId as any)?._id || deal.leadId,
      salesPersonId: (deal.assignedTo as any)?._id || deal.assignedTo || auth.userId,
      dealId: deal._id,
      unitNumber,
      projectName,
      totalAmount: totalVal,
      bookingDate: new Date(),
      status: 'contract_signed',
      paymentMilestones: body.paymentMilestones || [
        { name: '20% Execution Deposit & Contract Signoff', amount: totalVal * 0.2, dueDate: new Date(Date.now() + 7 * 86400000), status: 'pending', paidAmount: 0 },
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

    // Create onboarding task for account rep
    await Task.create({
      organizationId: auth.organizationId,
      leadId: (deal.leadId as any)?._id || deal.leadId,
      bookingId: booking._id,
      category: 'handover',
      title: `🚀 Initiate Post-Sales Onboarding: ${unitNumber}`,
      description: `Deal "${unitNumber}" (₹${(totalVal / 100000).toFixed(1)}L) converted to Post-Sales Contract! Start Stage 1 contract execution.`,
      status: 'pending',
      priority: 'high',
      dueDate: new Date(Date.now() + 2 * 86400000),
      assignedTo: (deal.assignedTo as any)?._id || auth.userId,
      createdBy: auth.userId,
    }).catch(() => {});

    return apiSuccess({ booking, alreadyExisted: false }, 'Deal successfully converted into Post-Sales Contract', 201);
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(err.message || 'Failed to convert deal to contract', 500);
  }
}
