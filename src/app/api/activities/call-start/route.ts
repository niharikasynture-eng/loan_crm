import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import Activity from '@/models/Activity';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';

/**
 * Register when a call is initiated from the CRM UI.
 * This is crucial for Samsung phones that might send their own number
 * instead of the target lead's number during sync.
 */
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();
    
    const { leadId } = await req.json();

    if (!leadId) {
      return apiError('leadId is required', 400);
    }

    // Create a "pending" activity to record the intention to call
    // This will be used as a "hint" for the sync-call-log API
    const activity = await Activity.create({
      organizationId: auth.organizationId,
      leadId,
      type: 'call',
      status: 'pending',
      notes: 'Call initiated from CRM (Predictive Hint)',
      createdBy: auth.userId,
    });

    return apiSuccess({ activityId: activity._id }, 'Call initiation registered');
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    console.error('CALL START ERROR:', err.message);
    return apiError(err.message || 'Failed to register call start', 500);
  }
}
