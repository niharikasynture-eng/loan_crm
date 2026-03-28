import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { signToken } from '@/lib/jwt';
import { apiError, apiSuccess } from '@/lib/auth';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';

// POST /api/auth/set-password
// Body: { token: string, password: string }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { token, password } = await req.json();

    if (!token || !password) return apiError('Token and password are required');
    if (password.length < 8) return apiError('Password must be at least 8 characters');

    // Find user with matching token that hasn't expired
    const user = await User.findOne({
      passwordSetToken: token,
      passwordSetExpiry: { $gt: new Date() },
    }).select('+password');

    if (!user) return apiError('Invalid or expired link. Please contact your admin.', 400);

    // Set new password and activate user
    user.password = password;
    user.passwordSetToken = undefined;
    user.passwordSetExpiry = undefined;
    user.isActive = true;
    await user.save();

    // Log the password set action
    await AuditLog.create({
      action: 'password_set',
      performedBy: user._id,
      targetId: user._id,
      targetType: 'User',
      organizationId: user.organizationId,
    });

    // Auto-login: generate token
    const jwtToken = signToken({
      userId: user._id.toString(),
      organizationId: user.organizationId.toString(),
      role: user.role,
      email: user.email,
    });

    return apiSuccess(
      {
        token: jwtToken,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          organizationId: user.organizationId,
        },
      },
      'Password set successfully. Welcome to SalesCRM!'
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to set password';
    return apiError(message, 500);
  }
}
