import { NextRequest } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import { getAuthUser, apiError, apiSuccess } from '@/lib/auth';
import User from '@/models/User';
import Organization from '@/models/Organization';

// GET /api/auth/me
export async function GET(req: NextRequest) {
  try {
    const payload = getAuthUser(req);
    if (!payload) return apiError('Unauthorized', 401);

    await connectDB();
    const user = await User.findById(payload.userId).lean();
    if (!user) return apiError('User not found', 404);

    const org = await Organization.findById(payload.organizationId)
      .select('name slug status isActive leadFormToken')
      .lean();

    return apiSuccess({
      user: {
        id: (user as { _id: mongoose.Types.ObjectId })._id.toString(),
        name: (user as {name: string}).name,
        email: (user as {email: string}).email,
        role: (user as {role: string}).role,
        organizationId: (user as { organizationId: unknown }).organizationId,
        avatar: (user as { avatar?: string }).avatar,
        phone: (user as { phone?: string }).phone,
        callSyncToken: (user as { callSyncToken?: string }).callSyncToken,
      },
      organization: org
        ? {
            id: (org as {_id: unknown})._id,
            name: (org as {name: string}).name,
            slug: (org as {slug: string}).slug,
            status: (org as {status: string}).status,
            leadFormToken: (org as {leadFormToken: string}).leadFormToken,
          }
        : null,
    });
  } catch {
    return apiError('Internal error', 500);
  }
}
