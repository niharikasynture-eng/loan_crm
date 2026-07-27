import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import SiteVisit from '@/models/SiteVisit';

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query: Record<string, unknown> = { organizationId: auth.organizationId };
    
    if (auth.role === ROLES.SALES_AGENT) {
      query.sales_user_id = auth.userId;
    }

    const [visits, total] = await Promise.all([
      SiteVisit.find(query)
        .populate('lead_id', 'name phone')
        .populate('project_id', 'name')
        .populate('sales_user_id', 'name')
        .sort({ visit_date: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      SiteVisit.countDocuments(query),
    ]);

    return apiSuccess({ visits, total, page, limit });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch site visits', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();
    const data = await req.json();

    const visit = await SiteVisit.create({
      ...data,
      organizationId: auth.organizationId,
      createdBy: auth.userId,
      sales_user_id: data.sales_user_id || auth.userId, // Default to self if not specified
    });

    return apiSuccess(visit, 'Site visit scheduled', 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to schedule site visit', 500);
  }
}
