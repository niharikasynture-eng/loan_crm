import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import CallLog from '@/models/CallLog';
import User from '@/models/User';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ leadId: string }> }
) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const { leadId } = await params;

    const callLogs = await CallLog.find({
      leadId,
      organizationId: auth.organizationId,
    })
      .populate('salesPersonId', 'name')
      .sort({ startedAt: -1 })
      .lean();

    return apiSuccess({ calls: callLogs });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    if (err instanceof Error && err.message === 'FORBIDDEN') return apiError('Forbidden', 403);
    console.error(err);
    return apiError('Failed to fetch call history', 500);
  }
}
