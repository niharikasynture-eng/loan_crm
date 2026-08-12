import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import Deal from '@/models/Deal';
import Lead from '@/models/Lead';
import User from '@/models/User';

// GET /api/deals
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role === ROLES.SUPER_ADMIN) return apiError('Access denied', 403);

    const { searchParams } = req.nextUrl;
    const stage = searchParams.get('stage');
    const assignedTo = searchParams.get('assignedTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: Record<string, unknown> = { organizationId: auth.organizationId };
    
    // Sales agent: only see deals they are assigned to
    if (auth.role === ROLES.SALES_AGENT) {
      query.assignedTo = auth.userId;
    } else {
      if (assignedTo) query.assignedTo = assignedTo;
    }

    if (stage) query.stage = stage;

    const [deals, total] = await Promise.all([
      Deal.find(query)
        .populate('assignedTo', 'name email avatar')
        .populate('leadId', 'name email phone company')
        .sort({ position: 1, createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Deal.countDocuments(query),
    ]);

    return apiSuccess({ deals, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch deals', 500);
  }
}

// POST /api/deals
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role === ROLES.SUPER_ADMIN) return apiError('Access denied', 403);

    const body = await req.json();
    const { leadId, title, value, stage, probability, expectedCloseDate, assignedTo, notes } = body;

    if (!leadId || !title) return apiError('leadId and title are required');

    // Ensure lead belongs to org and (if salesperson) is assigned to them
    const leadQuery: Record<string, unknown> = { _id: leadId, organizationId: auth.organizationId };
    if (auth.role === ROLES.SALES_AGENT) leadQuery.assignedTo = auth.userId;

    const lead = await Lead.findOne(leadQuery);
    if (!lead) return apiError('Lead not found or access denied', 404);

    // Update lead status to qualified if deal is created
    await Lead.findByIdAndUpdate(leadId, { status: 'qualified', pipelineStage: 'qualified' });

    const deal = await Deal.create({
      organizationId: auth.organizationId,
      leadId,
      title,
      value: value || 0,
      stage: stage || 'new',
      probability,
      expectedCloseDate: expectedCloseDate ? new Date(expectedCloseDate) : undefined,
      assignedTo: assignedTo || auth.userId,
      notes,
      createdBy: auth.userId,
    });

    const populated = await Deal.findById(deal._id)
      .populate('assignedTo', 'name email avatar')
      .populate('leadId', 'name email phone company')
      .lean();

    return apiSuccess({ deal: populated }, 'Deal created', 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to create deal', 500);
  }
}
