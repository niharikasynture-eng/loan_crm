import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import User from '@/models/User';

// GET /api/users/[id]
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req);
    const { id } = await params;
    await connectDB();

    const user = await User.findOne({ _id: id, organizationId: auth.organizationId })
      .select('-password')
      .populate('managerId', 'name email')
      .lean();

    if (!user) return apiError('User not found', 404);
    return apiSuccess({ user });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch user', 500);
  }
}

// PATCH /api/users/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req);
    const { id } = await params;
    await connectDB();

    const allowed = [ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN];
    const isSelf = auth.userId === id;
    if (!isSelf && !allowed.includes(auth.role as typeof ROLES[keyof typeof ROLES])) {
      return apiError('Forbidden', 403);
    }

    const body = await req.json();
    const { name, phone, avatar, role, managerId, isActive } = body;

    const updates: Record<string, unknown> = {};
    if (name) updates.name = name;
    if (phone !== undefined) updates.phone = phone;
    if (avatar !== undefined) updates.avatar = avatar;
    // Only admins can change roles
    if (role && allowed.includes(auth.role as typeof ROLES[keyof typeof ROLES])) updates.role = role;
    if (managerId !== undefined) updates.managerId = managerId;
    if (isActive !== undefined && allowed.includes(auth.role as typeof ROLES[keyof typeof ROLES])) updates.isActive = isActive;

    const user = await User.findOneAndUpdate(
      { _id: id, organizationId: auth.organizationId },
      updates,
      { new: true }
    ).select('-password');

    if (!user) return apiError('User not found', 404);
    return apiSuccess({ user });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to update user', 500);
  }
}

// DELETE /api/users/[id]
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req);
    if (![ROLES.ORG_ADMIN, ROLES.SUPER_ADMIN].includes(auth.role as typeof ROLES[keyof typeof ROLES])) {
      return apiError('Forbidden', 403);
    }
    const { id } = await params;
    await connectDB();

    await User.findOneAndUpdate(
      { _id: id, organizationId: auth.organizationId },
      { isActive: false }
    );
    return apiSuccess(null, 'User deactivated');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to delete user', 500);
  }
}
