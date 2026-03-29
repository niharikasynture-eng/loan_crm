import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import Activity from '@/models/Activity';
import Lead from '@/models/Lead';

// GET /api/activities
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role === ROLES.SUPER_ADMIN) return apiError('Access denied', 403);

    const { searchParams } = req.nextUrl;
    const leadId = searchParams.get('leadId');
    const type = searchParams.get('type');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: Record<string, unknown> = { organizationId: auth.organizationId };
    
    // Sales agent: only see activities for leads they own
    if (auth.role === ROLES.SALES_AGENT) {
      const myLeads = await Lead.find({ assignedTo: auth.userId, organizationId: auth.organizationId }).select('_id').lean();
      const myLeadIds = myLeads.map(l => l._id);
      query.leadId = { $in: myLeadIds };
    }

    if (leadId) {
      // If direct leadId provided, ensure salesperson owns it
      if (auth.role === ROLES.SALES_AGENT) {
        const lead = await Lead.findOne({ _id: leadId, assignedTo: auth.userId, organizationId: auth.organizationId });
        if (!lead) query.leadId = 'nothing'; // block
        else query.leadId = leadId;
      } else {
        query.leadId = leadId;
      }
    }

    if (type) query.type = type;

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .populate('createdBy', 'name email avatar')
        .populate('leadId', 'name email phone')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Activity.countDocuments(query),
    ]);

    return apiSuccess({ activities, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch activities', 500);
  }
}

// POST /api/activities
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role === ROLES.SUPER_ADMIN) return apiError('Access denied', 403);

    const body = await req.json();
    const { leadId, type, outcome, duration, notes, link, scheduledAt, completedAt } = body;

    if (!leadId || !type) return apiError('leadId and type are required');

    // Ensure lead belongs to org and (if salesperson) is assigned to them
    const leadQuery: Record<string, unknown> = { _id: leadId, organizationId: auth.organizationId };
    if (auth.role === ROLES.SALES_AGENT) leadQuery.assignedTo = auth.userId;

    const lead = await Lead.findOne(leadQuery);
    if (!lead) return apiError('Lead not found or access denied', 404);

    const activity = await Activity.create({
      organizationId: auth.organizationId,
      leadId,
      type,
      outcome,
      duration,
      notes: notes || '',
      link,
      scheduledAt,
      completedAt,
      createdBy: auth.userId,
    });

    // Update lead's lastContactedAt
    if (type === 'call' || type === 'meeting') {
      await Lead.findByIdAndUpdate(leadId, { lastContactedAt: new Date() });
    }

    const populated = await Activity.findById(activity._id)
      .populate('createdBy', 'name email avatar')
      .lean();

    return apiSuccess({ activity: populated }, 'Activity logged', 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to log activity', 500);
  }
}
