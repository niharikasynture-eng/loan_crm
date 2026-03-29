import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import Lead from '@/models/Lead';
import CallLog from '@/models/CallLog';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const { leadId } = await params;
    const lead = await Lead.findById(leadId);
    if (!lead) return apiError('Lead not found', 404);
    if (!lead.phone) return apiError('Lead does not have a phone number', 400);

    const accountSid = process.env.TWILIO_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const twilioNumber = process.env.TWILIO_NUMBER;

    if (!accountSid || !authToken || !twilioNumber) {
      return apiError('Missing Twilio credentials', 500);
    }

    const cleanPhone = (phone: string) => {
      const digits = phone.replace(/\D/g, '');
      if (digits.length === 10) return `+91${digits}`;
      return digits.startsWith('+') ? digits : `+${digits}`;
    };

    const twimlUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/calls/twiml/promo`;
    const formData = new URLSearchParams();
    formData.append('From', twilioNumber);
    formData.append('To', cleanPhone(lead.phone));
    formData.append('Url', twimlUrl);
    formData.append('StatusCallback', `${process.env.NEXT_PUBLIC_APP_URL}/api/calls/webhook`);

    const authHeader = `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`;
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: formData,
      }
    );

    const data = await response.json();
    if (!response.ok) return apiError(data.message || 'Twilio Error', 400);

    if (!data.sid) return apiError('Failed to retrieve Call SID from Twilio', 500);

    const callLog = await CallLog.create({
      leadId: lead._id,
      orgId: auth.organizationId,
      salesPersonId: auth.userId,
      twilioCallSid: data.sid,
      status: 'initiated',
      notes: '[PROMOTIONAL CALL] Automated message sent.',
    });

    return apiSuccess({ callSid: data.sid, callLogId: callLog._id }, 'Promotional call sent');
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(err.message || 'Failed to send promo call', 500);
  }
}
