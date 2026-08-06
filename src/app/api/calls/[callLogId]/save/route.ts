import { NextRequest } from 'next/server';
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

    const { callLogId } = await params;
    const body = await req.json();
    const { outcome, notes, nextFollowUpDate, duration, connectedDuration } = body;

    const callLog = await CallLog.findOne({
      _id: callLogId,
      organizationId: auth.organizationId,
      salesPersonId: auth.userId,
    });

    if (!callLog) return apiError('Call log not found', 404);

    callLog.status = 'completed';
    if (outcome !== undefined) callLog.outcome = outcome;
    if (notes !== undefined) callLog.notes = notes;
    if (duration !== undefined) callLog.duration = duration;
    if (connectedDuration !== undefined) callLog.connectedDuration = connectedDuration;
    callLog.endedAt = new Date();
    
    if (nextFollowUpDate) {
      callLog.nextFollowUpDate = new Date(nextFollowUpDate);
    }
    
    await callLog.save();

    const lead = await Lead.findById(callLog.leadId);
    
    if (lead) {
      await Lead.updateOne(
        { _id: lead._id },
        { 
          $set: { 
            lastCallOutcome: outcome,
            lastContactedAt: new Date(),
            lastCalledAt: new Date(),
            status: 'contacted',
            isGhost: false,
          },
          $inc: { totalCalls: 1 }
        }
      );

      if ((outcome === 'interested' || outcome === 'callback') && nextFollowUpDate) {
        await Task.create({
          organizationId: auth.organizationId,
          leadId: lead._id,
          title: `Follow up — ${lead.name}`,
          dueDate: new Date(nextFollowUpDate),
          assignedTo: auth.userId,
          priority: 'high',
          status: 'pending',
          createdBy: auth.userId
        });
      }
    }

    const formatTime = (seconds?: number) => {
      if (!seconds && seconds !== 0) return '00:00';
      const m = Math.floor(seconds / 60).toString().padStart(2, '0');
      const s = (seconds % 60).toString().padStart(2, '0');
      return `${m}:${s}`;
    };

    const formatDuration = (seconds?: number) => {
      if (!seconds && seconds !== 0) return '0S';
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      if (m === 0) return `${s}S`;
      return s > 0 ? `${m}M ${s}S` : `${m}M`;
    };

    await Activity.create({
      organizationId: auth.organizationId,
      leadId: callLog.leadId,
      type: 'call',
      notes: `Manual Call via CRM. Duration: ${formatDuration(connectedDuration || duration)}.`,
      duration: connectedDuration || duration || 0,
      createdBy: auth.userId,
    });

    return apiSuccess({ success: true }, 'Call logged successfully');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403);
    console.error(err);
    return apiError('Failed to save call log', 500);
  }
}
