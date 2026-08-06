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
    const createdBy = searchParams.get('createdBy');
    const isScheduled = searchParams.get('isScheduled') === 'true';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const remindersOnly = searchParams.get('remindersOnly') === 'true';

    const query: Record<string, unknown> = { organizationId: auth.organizationId };

    if (remindersOnly) {
      // Fetch activities scheduled within a wide window to handle any server timezone.
      // The client (ReminderChecker) does the precise time check.
      // Window: yesterday 00:00 UTC → tomorrow 23:59 UTC (covers IST +5:30 and other zones)
      const windowStart = new Date();
      windowStart.setUTCDate(windowStart.getUTCDate() - 1);
      windowStart.setUTCHours(0, 0, 0, 0);
      const windowEnd = new Date();
      windowEnd.setUTCDate(windowEnd.getUTCDate() + 1);
      windowEnd.setUTCHours(23, 59, 59, 999);

      query.scheduledAt = { $gte: windowStart, $lte: windowEnd };
      // NOTE: Do NOT filter by status — activities default to 'completed', not 'pending'
      query.type = { $in: ['note', 'call'] };
      // Scope to this user's leads (for sales agents)
      if (auth.role === ROLES.SALES_AGENT || auth.role === ROLES.ONSITE_VISITOR) {
        const myLeads = await Lead.find({ assignedTo: auth.userId, organizationId: auth.organizationId }).select('_id').lean();
        query.leadId = { $in: myLeads.map(l => l._id) };
      }
      // Filter to this user's created activities
      query.createdBy = auth.userId;
    } else {
      if (isScheduled) query.scheduledAt = { $exists: true, $ne: null };
      
      // Sales agent and Onsite Visitor: only see activities for leads they own
      if (auth.role === ROLES.SALES_AGENT || auth.role === ROLES.ONSITE_VISITOR) {
        const myLeads = await Lead.find({ assignedTo: auth.userId, organizationId: auth.organizationId }).select('_id').lean();
        const myLeadIds = myLeads.map(l => l._id);
        query.leadId = { $in: myLeadIds };
      }

      if (leadId) {
        // If direct leadId provided, ensure salesperson owns it
        if (auth.role === ROLES.SALES_AGENT || auth.role === ROLES.ONSITE_VISITOR) {
          const lead = await Lead.findOne({ _id: leadId, assignedTo: auth.userId, organizationId: auth.organizationId });
          if (!lead) query.leadId = 'nothing'; // block
          else query.leadId = leadId;
        } else {
          query.leadId = leadId;
        }
      }

      if (type) query.type = type;
      
      // Admin/Manager can filter by salesperson
      if (createdBy && auth.role !== ROLES.SALES_AGENT) {
        query.createdBy = createdBy;
      }
    }

    const [activities, total] = await Promise.all([
      Activity.find(query)
        .populate('createdBy', 'name email avatar')
        .populate('leadId', 'name email phone')
        .sort(remindersOnly ? { scheduledAt: 1 } : { createdAt: -1 })
        .skip(remindersOnly ? 0 : (page - 1) * limit)
        .limit(remindersOnly ? 50 : limit)
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

    if (auth.role === ROLES.SUPER_ADMIN || auth.role === ROLES.ONSITE_VISITOR) return apiError('Access denied', 403);

    const body = await req.json();
    const { leadId, type, outcome, duration, notes, link, scheduledAt, completedAt, priority } = body;

    if (!leadId || !type) return apiError('leadId and type are required');

    // Ensure lead belongs to org
    const lead = await Lead.findOne({ _id: leadId, organizationId: auth.organizationId });
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
      priority,
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
