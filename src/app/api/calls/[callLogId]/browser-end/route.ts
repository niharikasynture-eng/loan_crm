import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import CallLog from '@/models/CallLog';
import Activity from '@/models/Activity';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ callLogId: string }> }
) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const { callLogId } = await params;
    const body = await req.json().catch(() => ({}));
    const clientDuration = body.clientDuration || 0;

    const callLog = await CallLog.findOne({
      _id: callLogId,
      organizationId: auth.organizationId,
      salesPersonId: auth.userId,
    });

    if (!callLog) return apiError('Call log not found', 404);

    const now = new Date();
    
    // ── STEP 1: If already completed (by Hardware Sync), return gracefully ──
    if (callLog.status === 'completed' && callLog.syncId !== 'BROWSER_TIMER') {
      return apiSuccess({
        duration: callLog.duration || 0,
        trustLabel: '✅ Auto-Synced by Device',
        syncStatus: 'already_verified'
      }, 'Call already verified via hardware sync.');
    }

    // ── STEP 2: Calculate Smart Estimate ──
    // Browser measurements include ringing/switching time. 
    // We subtract an 8s constant buffer to get a realistic talk-time guess.
    const adjustedDuration = Math.max(0, clientDuration - 8);
    
    callLog.status = 'completed';
    callLog.endedAt = now;
    callLog.syncId = 'BROWSER_TIMER';
    callLog.notes = `Updated via Browser Smart Timer. (Adjusted: ${adjustedDuration}s)`;
    callLog.duration = adjustedDuration;
    callLog.connectedDuration = adjustedDuration;
    await callLog.save();

    // ── STEP 3: Create/Update the Activity ──
    // sync-call-log (Automate app) will still overwrite this with 100% accurate data if it arrives.
    const activity = await Activity.findOneAndUpdate(
      { callLogId, organizationId: auth.organizationId },
      {
        organizationId: auth.organizationId,
        leadId: callLog.leadId,
        type: 'call',
        notes: `✅ Verified Outgoing Call. Duration: ${adjustedDuration}s`,
        duration: adjustedDuration,
        callLogId,
        createdBy: auth.userId,
        status: 'completed',
        completedAt: now,
        syncId: 'BROWSER_TIMER',
      },
      { upsert: true, new: true }
    );

    return apiSuccess({
      duration: adjustedDuration,
      clientDuration,
      trustLabel: '✅ Verified (Smart Estimate)',
    }, 'Call estimate logged. Hardware sync will overwrite with exact data if available.');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    console.error(err);
    return apiError('Failed to end browser call', 500);
  }
}
