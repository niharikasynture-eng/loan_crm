import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import Activity from '@/models/Activity';

// GET /api/activities/reminders-debug
// Returns exactly what ReminderChecker would see, with full diagnostic info.
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const now = new Date();
    const windowStart = new Date();
    windowStart.setUTCDate(windowStart.getUTCDate() - 1);
    windowStart.setUTCHours(0, 0, 0, 0);
    const windowEnd = new Date();
    windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);
    windowEnd.setUTCHours(23, 59, 59, 999);

    const activities = await Activity.find({
      organizationId: auth.organizationId,
      scheduledAt: { $gte: windowStart, $lte: windowEnd },
      type: { $in: ['note', 'call'] },
      createdBy: auth.userId,
    })
      .populate('leadId', 'name email')
      .sort({ scheduledAt: 1 })
      .lean();

    const diagnosed = activities.map(a => {
      const scheduledMs = new Date(a.scheduledAt!).getTime();
      const nowMs = now.getTime();
      const diffMs = nowMs - scheduledMs;
      return {
        _id: a._id,
        type: a.type,
        priority: a.priority,
        status: a.status,
        notes: a.notes?.slice(0, 60),
        leadName: (a.leadId as any)?.name,
        scheduledAt: a.scheduledAt,
        scheduledAtLocal: new Date(a.scheduledAt!).toISOString(),
        nowUtc: now.toISOString(),
        diffSeconds: Math.round(diffMs / 1000),
        isPast: scheduledMs <= nowMs,
        isWithinCatchup: diffMs <= 5 * 60 * 1000,
        wouldFire: scheduledMs <= nowMs && diffMs <= 5 * 60 * 1000,
      };
    });

    return apiSuccess({
      serverNow: now.toISOString(),
      windowStart: windowStart.toISOString(),
      windowEnd: windowEnd.toISOString(),
      totalFound: activities.length,
      activities: diagnosed,
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Debug failed', 500);
  }
}
