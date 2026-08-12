import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import CallLog from '@/models/CallLog';
import Lead from '@/models/Lead';
import Task from '@/models/Task';
import Activity from '@/models/Activity';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ callLogId: string }> }
) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const body = await req.json();
    const { callLogId } = await params;
    const { outcome, notes, nextFollowUpDate } = body;

    const callLog = await CallLog.findById(callLogId);
    if (!callLog) return apiError('Call log not found', 404);

    callLog.outcome = outcome;
    callLog.notes = notes;
    let followUpTime: Date | null = nextFollowUpDate ? new Date(nextFollowUpDate) : null;
    if (['callback', 'contacted', 'interested'].includes(outcome) && !followUpTime) {
      followUpTime = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24h default
    }

    if (followUpTime) callLog.nextFollowUpDate = followUpTime;
    await callLog.save();

    const lead = await Lead.findById(callLog.leadId);
    if (lead) {
      lead.lastCallOutcome = outcome;
      await lead.save();
    }

    // Create a follow-up task or meeting if needed
    if (followUpTime && ['interested', 'callback', 'contacted', 'meeting'].includes(outcome)) {
      const taskTitle = outcome === 'meeting' 
        ? `Meeting Scheduled - ${lead?.name || 'Lead'}`
        : `Follow up: Call Back — ${lead?.name || 'Lead'}`;

      await Task.create({
        organizationId: auth.organizationId,
        leadId: callLog.leadId,
        title: taskTitle,
        dueDate: followUpTime,
        assignedTo: auth.userId,
        status: 'pending',
        priority: outcome === 'meeting' ? 'high' : 'medium',
        createdBy: auth.userId
      });
    }

    // Map outcome for activity model
    const activityOutcome = outcome === 'not-interested' ? 'not_interested' : outcome;

    // Create entry in Activity Feed
    await Activity.create({
      organizationId: auth.organizationId,
      leadId: callLog.leadId,
      type: 'call',
      outcome: activityOutcome,
      duration: callLog.duration,
      notes: notes,
      status: ['callback', 'contacted'].includes(outcome) ? 'pending' : 'completed',
      scheduledAt: ['callback', 'contacted'].includes(outcome) && followUpTime ? followUpTime : undefined,
      createdBy: auth.userId
    });

    return apiSuccess({ success: true }, 'Outcome saved successfully');
  } catch (err: any) {
    console.error('Save Outcome Error:', err);
    if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(err.message || 'Failed to save outcome', 500);
  }
}
