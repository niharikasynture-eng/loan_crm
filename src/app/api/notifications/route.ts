import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import Notification from '@/models/Notification';

// GET /api/notifications
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const { searchParams } = req.nextUrl;
    const limit = parseInt(searchParams.get('limit') || '20');

    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userId: auth.userId })
        .sort({ createdAt: -1 })
        .limit(limit)
        .lean(),
      Notification.countDocuments({ userId: auth.userId, read: false }),
    ]);

    return apiSuccess({ notifications, unreadCount });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    // Log the real DB/server error but return empty payload so the client doesn't crash
    console.error('[NOTIFICATIONS_GET_ERROR]', err instanceof Error ? err.message : err);
    return apiSuccess({ notifications: [], unreadCount: 0 });
  }
}

// PATCH /api/notifications — mark as read
export async function PATCH(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const { notificationId, markAllRead } = await req.json();

    if (markAllRead) {
      await Notification.updateMany({ userId: auth.userId, read: false }, { read: true });
      return apiSuccess({}, 'All notifications marked as read');
    }

    if (notificationId) {
      const notif = await Notification.findOneAndUpdate(
        { _id: notificationId, userId: auth.userId },
        { read: true },
        { new: true }
      );
      if (!notif) return apiError('Notification not found', 404);
      return apiSuccess({ notification: notif });
    }

    return apiError('notificationId or markAllRead required');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to update notification', 500);
  }
}
