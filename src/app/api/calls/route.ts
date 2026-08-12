import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import CallLog from '@/models/CallLog';
import Activity from '@/models/Activity';
import Lead from '@/models/Lead';
import User from '@/models/User';
import Task from '@/models/Task';

export const dynamic = 'force-dynamic';

// GET /api/calls - Fetch organization call history with analytics filtering
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const { searchParams } = req.nextUrl;
    const salesPersonId = searchParams.get('salesPersonId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = parseInt(searchParams.get('limit') || '500');

    const query: Record<string, any> = { organizationId: auth.organizationId };

    if (auth.role === 'sales_agent' || auth.role === 'onsite_visitor') {
      query.salesPersonId = auth.userId;
    } else if (salesPersonId && salesPersonId !== 'all') {
      query.salesPersonId = salesPersonId;
    }

    if (startDate || endDate) {
      query.startedAt = {};
      if (startDate) query.startedAt.$gte = new Date(startDate);
      if (endDate) query.startedAt.$lte = new Date(endDate);
    }

    const callLogs = await CallLog.find(query)
      .populate('leadId', 'name phone email company')
      .populate('salesPersonId', 'name email avatar')
      .sort({ startedAt: -1, createdAt: -1 })
      .limit(limit);

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

    // 4. AUTOMATION: Auto-complete any pending tasks for this lead
    await Task.updateMany(
      { leadId, organizationId: auth.organizationId, status: { $in: ['pending', 'in_progress'] } },
      { status: 'completed', completedAt: new Date() }
    ).catch((e) => console.error('Task auto-complete warning:', e));

    // 5. AUTOMATION: If outcome is callback or interested, auto-create follow-up task
    if (outcome === 'callback' || outcome === 'interested') {
      await Task.create({
        organizationId: auth.organizationId,
        leadId,
        category: 'sales',
        title: `📞 Follow-Up Call: ${lead.name}`,
        description: notes || `Auto-scheduled follow-up call after outcome: ${outcome}`,
        status: 'pending',
        priority: 'high',
        dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000), // Due in 24h
        assignedTo: auth.userId,
        createdBy: auth.userId,
      }).catch((e) => console.error('Auto follow-up task creation warning:', e));
    }

    return apiSuccess({ activityId: activity._id, callLogId: callLog._id }, 'Call logged successfully', 201);
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(err.message, 500);
  }
}
