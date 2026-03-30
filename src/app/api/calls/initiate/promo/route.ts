import { NextRequest, NextResponse } from 'next/server';
import { triggerPromoCall } from '@/lib/bland';
import Lead from '@/models/Lead';
import Activity from '@/models/Activity';
import Organization from '@/models/Organization';
import { connectDB } from '@/lib/db';
import { getAuthUser } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const user = getAuthUser(req);
    if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });

    const { leadId } = await req.json();
    if (!leadId) return NextResponse.json({ message: 'Lead ID is required' }, { status: 400 });

    console.log('In Promo Route - Lead ID:', leadId);
    await connectDB();

    const lead = await Lead.findById(leadId);
    if (!lead) {
      console.log('Lead not found for ID:', leadId);
      return NextResponse.json({ message: 'Lead not found' }, { status: 404 });
    }

    const organization = await Organization.findById(lead.organizationId);
    if (!organization) {
      console.log('Organization not found for ID:', lead.organizationId);
      return NextResponse.json({ message: 'Organization not found' }, { status: 404 });
    }

    if (!lead.phone) return NextResponse.json({ message: 'Lead phone number is required for AI call' }, { status: 400 });

    console.log('Triggering Bland AI Call...');
    // Trigger AI Call
    const result = await triggerPromoCall(lead.phone, lead.name, organization.name);
    console.log('Bland AI Result:', result);

    // Update Lead last call info
    await Lead.findByIdAndUpdate(leadId, {
      $set: { 
        lastCalledAt: new Date(),
        lastCallOutcome: 'AI Promo'
      },
      $inc: { totalCalls: 1 }
    });

    // Log Activity
    console.log('Creating Activity Log with User ID:', user.userId);
    const activity = await Activity.create({
      leadId: lead._id,
      organizationId: lead.organizationId,
      createdBy: user.userId as any,
      type: 'call',
      outcome: 'connected',
      notes: `Triggered automated AI promo call to ${lead.phone}. (Call ID: ${result.call_id || result.id || 'initiated'})`,
      completedAt: new Date()
    });
    console.log('Activity Created:', activity._id);

    return NextResponse.json({ 
      message: 'AI Call Triggered Successfully', 
      callId: result.call_id || result.id 
    });
  } catch (err: any) {
    console.error('PROMO ROUTE CRITICAL ERROR:', err);
    return NextResponse.json({ message: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
