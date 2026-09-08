import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import Booking from '@/models/Booking';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const { id } = await params;
    const body = await req.json();

    const booking = await Booking.findOne({
      _id: id,
      organizationId: auth.organizationId,
    });

    if (!booking) {
      return apiError('Booking not found', 404);
    }

    if (body.status) booking.status = body.status;
    if (body.paymentMilestones) booking.paymentMilestones = body.paymentMilestones;
    if (body.documents) booking.documents = body.documents;
    if (body.loanDetails) booking.loanDetails = { ...(booking.loanDetails || {}), ...body.loanDetails };
    if (body.homeLoanDetails) booking.homeLoanDetails = { ...booking.homeLoanDetails, ...body.homeLoanDetails };
    if (body.handoverChecklist) booking.handoverChecklist = body.handoverChecklist;

    await booking.save();

    const updated = await Booking.findById(booking._id)
      .populate('leadId', 'name email phone company status')
      .populate('salesPersonId', 'name email avatar');

    return apiSuccess({ booking: updated }, 'Booking updated successfully');
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(err.message, 500);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role !== 'super_admin' && auth.role !== 'org_admin' && auth.role !== 'manager') {
      return apiError('Access denied. Contract deletion is restricted to Admins and Managers.', 403);
    }

    const { id } = await params;
    const booking = await Booking.findOneAndDelete({
      _id: id,
      organizationId: auth.organizationId,
    });

    if (!booking) {
      return apiError('Contract record not found', 404);
    }

    return apiSuccess({ id }, 'SAP Contract deleted successfully');
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(err.message, 500);
  }
}
