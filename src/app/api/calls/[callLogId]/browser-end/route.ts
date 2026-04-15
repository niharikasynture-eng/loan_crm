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

    if (!callLog) return apiError('Call log not found or already completed', 404);

    // ── SERVER-SIDE DURATION CALCULATION ──
    // startedAt was set by the server when salesperson clicked "Call"
    // The client CANNOT manipulate this value
    const now = new Date();
    const rawDurationSeconds = Math.round((now.getTime() - callLog.startedAt.getTime()) / 1000);

    // Hard cap: max 10 minutes via browser timer
    const duration = Math.min(rawDurationSeconds, MAX_BROWSER_CALL_SECONDS);

    // Flag if they returned suspiciously late (> 10 min)
    const isLateReturn = rawDurationSeconds > MAX_BROWSER_CALL_SECONDS;
    const isSuspicious = rawDurationSeconds > MAX_BROWSER_CALL_SECONDS * 1.5; // > 15 min

    const trustLabel = isSuspicious
      ? '🚨 Suspicious — Late Return'
      : isLateReturn
      ? '⚠️ Capped at 10 Min'
      : '📱 Browser Timer';

    // Subtract a 5-second "navigation buffer" as requested for better accuracy
    // (Time taken to alt-tab back to CRM)
    const adjustedDuration = Math.max(0, duration - 5);

    callLog.status = 'completed';
    callLog.duration = adjustedDuration;
    callLog.connectedDuration = adjustedDuration;
    callLog.endedAt = now;
    callLog.syncId = 'MANUAL';
    callLog.notes = `Browser Timer Call. ${trustLabel}. Raw: ${rawDurationSeconds}s, Saved: ${adjustedDuration}s`;
    await callLog.save();

    // Create or update activity
    const formatDuration = (s: number) => {
      const m = Math.floor(s / 60);
      const sec = s % 60;
      if (m === 0) return `${sec}s`;
      return sec > 0 ? `${m}m ${sec}s` : `${m}m`;
    };

    // Check if activity already exists for this callLogId (Duplication Prevention)
    // Also check if a "Verified" sync already came in for this lead/salesperson in the last 2 minutes
    const twoMinsAgo = new Date(now.getTime() - 2 * 60 * 1000);
    const existingActivity = await Activity.findOne({ 
      $or: [
        { callLogId },
        { 
          leadId: callLog.leadId, 
          createdBy: auth.userId, 
          type: 'call', 
          createdAt: { $gte: twoMinsAgo },
          notes: /Verified/i 
        }
      ]
    });

    if (existingActivity) {
      return apiSuccess({
        duration: adjustedDuration,
        rawDuration: rawDurationSeconds,
        isLateReturn,
        isSuspicious,
        trustLabel,
      }, 'Call already logged via hardware sync or previous request');
    }

    await Activity.create({
      organizationId: auth.organizationId,
      leadId: callLog.leadId,
      type: 'call',
      notes: `${trustLabel}. Duration: ${formatDuration(adjustedDuration)}.${isLateReturn ? ` ⚠️ Browser was hidden for ${formatDuration(rawDurationSeconds)} (capped).` : ''} (⏱ Waiting for phone sync...)`,
      duration: adjustedDuration,
      callLogId,
      createdBy: auth.userId,
      status: 'completed',
      completedAt: now,
    });

    return apiSuccess({
      duration: adjustedDuration,
      rawDuration: rawDurationSeconds,
      isLateReturn,
      isSuspicious,
      trustLabel,
    }, 'Call logged via browser timer');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    console.error(err);
    return apiError('Failed to end browser call', 500);
  }
}
