import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import InventoryUnit from '@/models/InventoryUnit';
import Project from '@/models/Project';

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const { searchParams } = req.nextUrl;
    const projectId = searchParams.get('projectId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '100');

    const query: Record<string, unknown> = { organizationId: auth.organizationId };
    if (projectId) query.project_id = projectId;

    const [inventory, total] = await Promise.all([
      InventoryUnit.find(query)
        .populate('project_id', 'name')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      InventoryUnit.countDocuments(query),
    ]);

    return apiSuccess({ inventory, total, page, limit });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch inventory', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const allowedRoles = [ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN, ROLES.MANAGER] as string[];
    if (!allowedRoles.includes(auth.role)) return apiError('Forbidden', 403);

    await connectDB();
    const data = await req.json();

    const unit = await InventoryUnit.create({
      ...data,
      organizationId: auth.organizationId,
      createdBy: auth.userId,
    });

    return apiSuccess(unit, 'Inventory unit created', 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to create inventory unit', 500);
  }
}
