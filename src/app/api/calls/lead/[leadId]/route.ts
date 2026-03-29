import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError } from '@/lib/auth';
import CallLog from '@/models/CallLog';

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
      orgId: auth.organizationId 
    })
    .populate('salesPersonId', 'name')
    .sort({ startedAt: -1 })
    .lean();

    return Response.json({ success: true, data: callLogs });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(err.message || 'Failed to fetch call history', 500);
  }
}
