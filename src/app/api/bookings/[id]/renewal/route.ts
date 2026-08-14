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

    const booking = await Booking.findOne({ _id: id, organizationId: auth.organizationId });
    if (!booking) {
      return apiError('Contract / Booking record not found', 404);
    }

    // Role check: sales_agent can only edit their own booking
    if (auth.role === 'sales_agent' && booking.salesPersonId.toString() !== auth.userId) {
      return apiError('Access denied. You can only manage renewals for your assigned clients.', 403);
    }

    const body = await req.json();
    const { action, contractEndDate, renewalStatus, upsell } = body;

    // Action 1: Renew Contract
    if (action === 'renew_contract') {
      const extensionMonths = body.extensionMonths || 12;
      const currentEndDate = booking.contractEndDate ? new Date(booking.contractEndDate) : new Date();
      const newEndDate = new Date(currentEndDate.getTime() + extensionMonths * 30 * 24 * 60 * 60 * 1000);
      
      booking.contractEndDate = newEndDate;
      booking.renewalStatus = 'renewed';
      if (body.renewalAmount) {
        booking.totalAmount += Number(body.renewalAmount);
      }
      await booking.save();
      return apiSuccess({ booking }, 'Contract successfully renewed!');
    }

    // Action 2: Add Upsell Opportunity
    if (action === 'add_upsell') {
      if (!upsell || !upsell.title || !upsell.amount) {
        return apiError('Upsell title and amount are required', 400);
      }
      if (!booking.upsellOpportunities) {
        booking.upsellOpportunities = [];
      }
      booking.upsellOpportunities.push({
        title: upsell.title,
        amount: Number(upsell.amount),
        status: upsell.status || 'identified',
        notes: upsell.notes || '',
        createdAt: new Date()
      });
      await booking.save();
      return apiSuccess({ booking }, 'Upsell opportunity logged!');
    }

    // Action 3: Update Upsell Opportunity Status
    if (action === 'update_upsell_status') {
      const { upsellIndex, newStatus } = body;
      if (booking.upsellOpportunities && booking.upsellOpportunities[upsellIndex]) {
        booking.upsellOpportunities[upsellIndex].status = newStatus;
        if (newStatus === 'won') {
          // Add won upsell value to total contract amount
          booking.totalAmount += booking.upsellOpportunities[upsellIndex].amount;
        }
        await booking.save();
      }
      return apiSuccess({ booking }, 'Upsell opportunity status updated!');
    }

    // Fallback: Direct field updates
    if (contractEndDate) booking.contractEndDate = new Date(contractEndDate);
    if (renewalStatus) booking.renewalStatus = renewalStatus;
    await booking.save();

    return apiSuccess({ booking }, 'Contract renewal details updated successfully');
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(err.message, 500);
  }
}
