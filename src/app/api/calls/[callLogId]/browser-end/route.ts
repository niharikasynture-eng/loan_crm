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

    const callLog = await CallLog.findOne({
      _id: callLogId,
      organizationId: auth.organizationId,
      salesPersonId: auth.userId,
    });

    if (!callLog) return apiError('Call log not found', 404);

    const now = new Date();

    // ── STEP 1: If already completed (by Hardware Sync), return gracefully ──
    if (callLog.status === 'completed') {
      return apiSuccess({
        duration: callLog.duration || 0,
        trustLabel: '✅ Auto-Synced by Device',
        syncStatus: 'already_verified'
      }, 'Call already verified via hardware sync.');
    }

    // ── STEP 2: Mark CallLog as placeholder — do NOT use browser elapsed time as duration ──
    // Browser click-to-return time includes dialing + ringing (easily 15-25s even for a 5s call).
    // The ONLY source of truth for real talk duration is the Automate app hardware sync.
    const rawBrowserElapsed = Math.round((now.getTime() - callLog.startedAt.getTime()) / 1000);

    callLog.status = 'completed';
    callLog.endedAt = now;
    callLog.syncId = 'BROWSER_TIMER';
    // Store elapsed for debugging only — never shown to users
    callLog.notes = `[Placeholder: browser elapsed ${rawBrowserElapsed}s — awaiting hardware sync]`;
    callLog.duration = 0;            // Hardware sync sets the real duration
    callLog.connectedDuration = 0;
    await callLog.save();

    // ── STEP 3: Create a provisional Activity with duration 0 ──
    // sync-call-log (Automate app) will find this by syncId: 'BROWSER_TIMER' and overwrite with real data.
    const existingActivity = await Activity.findOne({
      callLogId,
      organizationId: auth.organizationId,
    });

    if (!existingActivity) {
      await Activity.create({
        organizationId: auth.organizationId,
        leadId: callLog.leadId,
        type: 'call',
        notes: `📱 Call logged. Syncing duration from device...`,
        duration: 0,
        callLogId,
        createdBy: auth.userId,
        status: 'completed',
        completedAt: now,
        syncId: 'BROWSER_TIMER',
      });
    }

    return apiSuccess({
      duration: 0,
      rawBrowserElapsed,
      trustLabel: '📱 Awaiting device sync',
    }, 'Call placeholder created. Hardware sync will update duration.');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    console.error(err);
    return apiError('Failed to end browser call', 500);
  }
}
