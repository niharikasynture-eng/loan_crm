import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import CallLog from '@/models/CallLog';
import Activity from '@/models/Activity';

const MAX_BROWSER_CALL_SECONDS = 600; // 10 min hard cap

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ callLogId: string }> }
) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const { callLogId } = await params;

    const callLog = await CallLog.findOne({
      _id: callLogId,
      organizationId: auth.organizationId,
      salesPersonId: auth.userId,
      status: 'initiated',
    });

    if (!callLog) return apiError('Call log already completed or not found', 404);

    const now = new Date();
    // ── STEP 1: PRIORITIZE HARDWARE SYNC ──
    // Check if a hardware sync already came in for this lead/salesperson in the last 60 minutes
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const hardwareVerifiedSync = await Activity.findOne({ 
      leadId: callLog.leadId, 
      createdBy: auth.userId, 
      type: 'call', 
      createdAt: { $gte: oneHourAgo },
      notes: /Verified/i 
    });

    if (hardwareVerifiedSync) {
      // If a hardware sync already arrived, this browser timer is redundant.
      // Delete the placeholder initiated log and exit silently.
      await CallLog.findByIdAndDelete(callLogId);
      return apiSuccess({
        duration: hardwareVerifiedSync.duration || 0,
        trustLabel: '✅ Auto-Synced by Device',
        syncStatus: 'already_verified'
      }, 'Call already verified via hardware sync. Cleanup successful.');
    }

    // ── STEP 2: CALCULATE BROWSER DURATION ──
    const rawDurationSeconds = Math.round((now.getTime() - callLog.startedAt.getTime()) / 1000);
    const duration = Math.min(rawDurationSeconds, MAX_BROWSER_CALL_SECONDS);
    const adjustedDuration = Math.max(0, duration - 5);

    const trustLabel = rawDurationSeconds > MAX_BROWSER_CALL_SECONDS * 1.5 
      ? '🚨 Suspicious' 
      : rawDurationSeconds > MAX_BROWSER_CALL_SECONDS 
      ? '⚠️ Capped' 
      : '📱 Browser Timer';

    // Update CallLog to completed (only if not verified by phone yet)
    callLog.status = 'completed';
    callLog.duration = adjustedDuration;
    callLog.connectedDuration = adjustedDuration;
    callLog.endedAt = now;
    callLog.syncId = 'MANUAL';
    callLog.notes = `Browser Timer. Raw: ${rawDurationSeconds}s`;
    await callLog.save();

    await Activity.create({
      organizationId: auth.organizationId,
      leadId: callLog.leadId,
      type: 'call',
      notes: `${trustLabel}. Duration: ${adjustedDuration}s (⏱ Syncing...)`,
      duration: adjustedDuration,
      callLogId,
      createdBy: auth.userId,
      status: 'completed',
      completedAt: now,
    });

    return apiSuccess({
      duration: adjustedDuration,
      rawDuration: rawDurationSeconds,
      trustLabel,
    }, 'Call logged via browser timer placeholder');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    console.error(err);
    return apiError('Failed to end browser call', 500);
  }
}
