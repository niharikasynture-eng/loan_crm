import { NextRequest } from 'next/server';
import fs from 'fs';
import { connectDB } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { apiError, apiSuccess } from '@/lib/auth';
import User from '@/models/User';
import Organization from '@/models/Organization';

// POST /api/auth/login
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email, password } = await req.json();

    if (!email || !password) return apiError('Email and password required');

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    if (!user) return apiError('Invalid credentials', 401);

    // Super admin: skip org status check
    if (user.role !== 'super_admin') {
      if (!user.isActive) {
        return apiError('Your account is not active. Please check your email for a setup link.', 403);
      }

      const org = await Organization.findById(user.organizationId);
      if (!org) return apiError('Organization not found', 403);

      if (org.status === 'pending') {
        return apiError('Your organization is pending approval. You will receive an email shortly.', 403);
      }
      if (org.status === 'rejected') {
        return apiError(
          `Your organization request was rejected${org.rejectionReason ? ': ' + org.rejectionReason : ''}.`,
          403
        );
      }
      if (org.status === 'deleted') {
        return apiError('This organization has been removed.', 403);
      }
      if (org.status === 'inactive') {
        return apiError('Your organization is currently inactive. Please contact support.', 403);
      }
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return apiError('Invalid credentials', 401);

    user.lastLogin = new Date();
    await user.save();

    const org = user.role === 'super_admin'
      ? await Organization.findById(user.organizationId)
      : await Organization.findById(user.organizationId);

    const token = signToken({
      userId: user._id.toString(),
      organizationId: user.organizationId.toString(),
      role: user.role,
      email: user.email,
    });

    return apiSuccess({
      token,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        organizationId: user.organizationId.toString(),
        avatar: user.avatar,
        phone: user.phone,
      },
      organization: org
        ? {
            id: org._id,
            name: org.name,
            slug: org.slug,
            status: org.status,
            leadFormToken: org.leadFormToken,
          }
        : { id: user.organizationId, name: 'Platform', slug: 'platform', status: 'active' },
    });
  } catch (err: unknown) {
    const logData = `ERROR: ${err instanceof Error ? err.message : String(err)}\nTIME: ${new Date().toISOString()}\n`;
    try { fs.appendFileSync('error_log.txt', logData); } catch {}
    return apiError('Login failed', 500);
  }
}
