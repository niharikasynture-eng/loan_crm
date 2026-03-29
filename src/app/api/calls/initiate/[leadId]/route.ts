import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import Lead from '@/models/Lead';
import User from '@/models/User';
import CallLog from '@/models/CallLog';
import { initiateCall } from '@/lib/twilio';

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

    const currentUser = await User.findById(auth.userId);
    if (!currentUser) return apiError('User not found', 404);
    if (!currentUser.phone) return apiError('You must set a phone number in your profile to make calls', 400);

    // Prepare TwiML URL for the second leg
    // This URL must be public for Twilio to access it
    const twimlUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/calls/twiml?leadPhone=${encodeURIComponent(lead.phone)}`;

    const { sid } = await initiateCall(currentUser.phone, lead.phone, twimlUrl);

    const callLog = await CallLog.create({
      leadId: lead._id,
      orgId: auth.organizationId,
      salesPersonId: auth.userId,
      twilioCallSid: sid,
      status: 'initiated',
    });

    return apiSuccess({ 
      callLogId: callLog._id, 
      callSid: sid,
      success: true 
    }, 'Call initiated');
  } catch (err: any) {
    console.error('Initiate Call Error:', err);
    if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(err.message || 'Failed to initiate call', 500);
  }
}
