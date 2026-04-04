// @ts-nocheck

import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import CallLog from '@/models/CallLog';
import Lead from '@/models/Lead';
import Task from '@/models/Task';
import Activity from '@/models/Activity';

export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const formData = await req.formData();
    
    // Twilio parameters are Form URL Encoded
    const sid = formData.get('CallSid') as string;
    const status = formData.get('CallStatus') as string;
    const duration = parseInt(formData.get('CallDuration') as string || '0');
    const recordingUrl = formData.get('RecordingUrl') as string;

    const callLog = await CallLog.findOne({ twilioCallSid: sid });
    if (!callLog) {
      return NextResponse.json({ error: 'Call log not found' }, { status: 404 });
    }

    // Mapping Twilio statuses to our CallLog status
    const statusMap: Record<string, string> = {
      'queued': 'initiated',
      'ringing': 'ringing',
      'in-progress': 'in-progress',
      'completed': 'completed',
      'failed': 'failed',
      'busy': 'busy',
      'no-answer': 'no-answer',
      'canceled': 'failed'
    };

    callLog.status = (statusMap[status] || status) as any;
    callLog.duration = duration;
    if (recordingUrl) {
      callLog.recordingUrl = recordingUrl;
    }
    callLog.endedAt = new Date();
    await callLog.save();

    // Update Lead stats
    await Lead.findByIdAndUpdate(callLog.leadId, {
      lastCalledAt: new Date(),
      $inc: { totalCalls: 1 }
    });

    // Create automatic Activity Feed entry
    await Activity.create({
      organizationId: callLog.orgId,
      leadId: callLog.leadId,
      type: 'call',
      outcome: callLog.status,
      duration: callLog.duration,
      notes: `Automated Log: Call ${callLog.status}. ${recordingUrl ? 'Recording available.' : ''}`,
      createdBy: callLog.salesPersonId
    });

    // Handle missed/busy calls
    if (['no-answer', 'busy', 'failed'].includes(callLog.status)) {
      const lead = await Lead.findById(callLog.leadId);
      const tomorrowAtTen = new Date();
      tomorrowAtTen.setDate(tomorrowAtTen.getDate() + 1);
      tomorrowAtTen.setHours(10, 0, 0, 0);

      await Task.create({
        organizationId: callLog.orgId,
        leadId: callLog.leadId,
        title: `Follow-up call - ${lead?.name || 'Lead'}`,
        dueDate: tomorrowAtTen,
        assignedTo: callLog.salesPersonId,
        status: 'pending',
        priority: 'medium',
        createdBy: callLog.salesPersonId
      });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    return NextResponse.json({ error: 'Webhook processing failed', details: err.message }, { status: 500 });
  }
}
