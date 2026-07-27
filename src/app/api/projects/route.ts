import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import Project from '@/models/Project';

export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const query = { organizationId: auth.organizationId };

    const [projects, total] = await Promise.all([
      Project.find(query)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Project.countDocuments(query),
    ]);

    return apiSuccess({ projects, total, page, limit });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch projects', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    const allowedRoles = [ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN, ROLES.MANAGER] as string[];
    if (!allowedRoles.includes(auth.role)) return apiError('Forbidden', 403);

    await connectDB();
    const data = await req.json();

    const project = await Project.create({
      ...data,
      organizationId: auth.organizationId,
      createdBy: auth.userId,
    });

    return apiSuccess(project, 'Project created', 201);
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to create project', 500);
  }
}
