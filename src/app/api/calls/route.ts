import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import CallLog from '@/models/CallLog';
import Activity from '@/models/Activity';
import Lead from '@/models/Lead';

// GET /api/calls - Fetch organization call history
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const callLogs = await CallLog.find({ organizationId: auth.organizationId })
      .populate('leadId', 'name phone')
      .populate('salesPersonId', 'name email')
      .sort({ createdAt: -1 })
      .limit(50);

    return apiSuccess({ callLogs });
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(err.message, 500);
  }
}

// POST /api/calls - Save a manual call log (from Smart Web Dialer)
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const { leadId, duration, status, outcome, notes } = await req.json();

    if (!leadId) return apiError('Lead ID is required');

    const lead = await Lead.findOne({ _id: leadId, organizationId: auth.organizationId });
    if (!lead) return apiError('Lead not found');

    // 1. Create CallLog
    const callLog = await CallLog.create({
      leadId,
      organizationId: auth.organizationId,
      salesPersonId: auth.userId,
      status: status || 'completed',
      outcome: outcome || null,
      duration: duration || 0,
      connectedDuration: duration || 0,
      notes: notes || 'Manual web-synced call',
      startedAt: new Date(Date.now() - (duration || 0) * 1000),
      endedAt: new Date(),
    });

    // 2. Create Activity
    const activity = await Activity.create({
      organizationId: auth.organizationId,
      leadId,
      type: 'call',
      outcome,
      duration,
      notes: notes || `Web Call: ${outcome || 'Logged'} (${duration}s)`,
      createdBy: auth.userId,
      status: 'completed',
      completedAt: new Date(),
    });

    // 3. Update Lead stats
    lead.lastCalledAt = new Date();
    lead.lastContactedAt = new Date();
    lead.totalCalls = (lead.totalCalls || 0) + 1;
    lead.status = 'contacted';
    lead.lastCallOutcome = outcome || 'connected';
    
    // Update pipeline stage if it's new
    if (lead.pipelineStage === 'new') {
      lead.pipelineStage = 'contacted';
    }
    
    await lead.save();

    return apiSuccess({ activityId: activity._id, callLogId: callLog._id }, 'Call logged successfully', 201);
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(err.message, 500);
  }
}
