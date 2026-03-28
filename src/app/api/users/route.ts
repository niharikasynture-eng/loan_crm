import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import User from '@/models/User';

// GET /api/users - List users in org
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const role = searchParams.get('role');

    const query: Record<string, unknown> = { organizationId: auth.organizationId, isActive: true };
    if (role) query.role = role;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password')
        .populate('managerId', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      User.countDocuments(query),
    ]);

    return apiSuccess({ users, total, page, limit, pages: Math.ceil(total / limit) });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch users', 500);
  }
}

// POST /api/users - Invite / create user in org
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (![ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN, ROLES.MANAGER].includes(auth.role as typeof ROLES[keyof typeof ROLES])) {
      return apiError('Forbidden', 403);
    }
    await connectDB();

    const { name, email, password, role, managerId } = await req.json();
    if (!name || !email || !password) return apiError('Name, email, and password are required');

    const existing = await User.findOne({ email: email.toLowerCase(), organizationId: auth.organizationId });
    if (existing) return apiError('Email already in use', 409);

    const user = await User.create({
      organizationId: auth.organizationId,
      name,
      email,
      password,
      role: role || ROLES.SALES_AGENT,
      managerId,
    });

    return apiSuccess(
      { id: user._id, name: user.name, email: user.email, role: user.role },
      'User created',
      201
    );
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to create user', 500);
  }
}
