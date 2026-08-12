import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import Activity from '@/models/Activity';
import Lead from '@/models/Lead';
import { sendWhatsApp } from '@/lib/ultramsg';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const body = await req.json();
    const { leadId, message, direct } = body;

    if (!leadId || !message) {
      return apiError('Missing leadId or message', 400);
    }

    const lead = await Lead.findOne({ _id: leadId, organizationId: auth.organizationId });
    if (!lead) return apiError('Lead not found or access denied', 404);
    if (!lead.phone) return apiError('Lead has no phone number', 400);

    const cleanPhone = lead.phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
    const waUrl = `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;

    // If direct link mode requested, log activity and return WhatsApp URL
    if (direct) {
      const activity = await Activity.create({
        leadId,
        type: 'whatsapp',
        notes: `Sent WhatsApp (Direct): ${message}`,
        createdBy: auth.userId,
        organizationId: auth.organizationId,
      });
      return apiSuccess({ activity, waUrl }, 'Direct WhatsApp initialized');
    }

    // Attempt sending via Ultramsg Gateway
    try {
      await sendWhatsApp(lead.phone, message);
    } catch (err: any) {
      console.error('Ultramsg Error:', err.message);
      const isPaymentError = err.message?.includes('Stopped due to non-payment') || err.message?.includes('subscription');
      const errorDetail = isPaymentError
        ? 'Ultramsg WhatsApp Gateway is suspended due to non-payment. Use "Direct WhatsApp" to send via WhatsApp Web/App.'
        : `Ultramsg Error: ${err.message}`;

      return apiError(errorDetail, 502);
    }

    // Log activity on API success
    const activity = await Activity.create({
      leadId,
      type: 'whatsapp',
      notes: `Sent WhatsApp (API): ${message}`,
      createdBy: auth.userId,
      organizationId: auth.organizationId,
    });

    return apiSuccess({ activity, waUrl }, 'WhatsApp message sent via gateway');
  } catch (err: any) {
    console.error('API Error:', err.message);
    if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(err.message || 'Failed to send WhatsApp message', 500);
  }
}
