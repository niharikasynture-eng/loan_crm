import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import Task from '@/models/Task';
import Lead from '@/models/Lead';
import User from '@/models/User';

// GET /api/tasks
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role === ROLES.SUPER_ADMIN) return apiError('Access denied', 403);

    const { searchParams } = req.nextUrl;
    const assignedTo = searchParams.get('assignedTo');
    const status = searchParams.get('status');
    const leadId = searchParams.get('leadId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    const query: Record<string, unknown> = { organizationId: auth.organizationId };
    
    // Sales agent and Onsite Visitor: only see tasks assigned to them
    if (auth.role === ROLES.SALES_AGENT || auth.role === ROLES.ONSITE_VISITOR) {
      query.assignedTo = auth.userId;
    } else {
      if (assignedTo) query.assignedTo = assignedTo;
    }

    if (status) query.status = status;
    
    if (leadId) {
      // If salesperson, ensure lead is theirs
      if (auth.role === ROLES.SALES_AGENT || auth.role === ROLES.ONSITE_VISITOR) {
        const lead = await Lead.findOne({ _id: leadId, assignedTo: auth.userId, organizationId: auth.organizationId });
        if (!lead) query.leadId = 'nothing';
        else query.leadId = leadId;
      } else {
        query.leadId = leadId;
      }
    }

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .populate('assignedTo', 'name email avatar')
        .populate('leadId', 'name email phone')
        .populate('createdBy', 'name email')
        .sort({ dueDate: 1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Task.countDocuments(query),
    ]);

    return apiSuccess({ tasks, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch tasks', 500);
  }
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role === ROLES.SUPER_ADMIN || auth.role === ROLES.ONSITE_VISITOR) return apiError('Access denied', 403);

    const body = await req.json();
    const { title, description, leadId, dealId, bookingId, category, dueDate, priority, assignedTo, link } = body;

    if (!title || !dueDate) return apiError('Title and dueDate are required');

    // Ensure lead belongs to org if specified
    if (leadId) {
      const lead = await Lead.findOne({ _id: leadId, organizationId: auth.organizationId });
      if (!lead) return apiError('Lead not found or access denied', 404);
    }

    const task = await Task.create({
      organizationId: auth.organizationId,
      title,
      description,
      leadId,
      dealId,
      bookingId,
      category: category || 'sales',
      dueDate: new Date(dueDate),
      priority: priority || 'medium',
      link,
      assignedTo: assignedTo || auth.userId,
      createdBy: auth.userId,
    });

    const populated = await Task.findById(task._id)
      .populate('assignedTo', 'name email avatar')
      .populate('leadId', 'name email phone')
      .lean();

    return apiSuccess({ task: populated }, 'Task created', 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to create task', 500);
  }
}
