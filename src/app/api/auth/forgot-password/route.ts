import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/auth';
import User from '@/models/User';
import { sendPasswordResetEmail } from '@/lib/email';

// POST /api/auth/forgot-password
// Body: { email: string }
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const { email } = await req.json();

    if (!email) {
      return apiError('Email address is required', 400);
    }

    const cleanEmail = email.trim();
    console.log(`[FORGOT_PASSWORD] Processing request for email: "${cleanEmail}"`);

    // Case-insensitive exact match
    const user = await User.findOne({
      email: { $regex: new RegExp(`^${cleanEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
    });

    if (user) {
      console.log(`[FORGOT_PASSWORD] ✅ User found in DB: "${user.email}" (${user.name})`);
      // Generate 24-hour reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      user.passwordSetToken = resetToken;
      user.passwordSetExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await user.save();

      // Trigger email send
      await sendPasswordResetEmail(user.email, user.name, resetToken);
    } else {
      console.warn(`[FORGOT_PASSWORD] ⚠️  No user found matching email: "${cleanEmail}"`);
    }

    const message = 'If an account exists for this email address, a password reset link has been sent.';

    return apiSuccess(
      { message },
      message
    );
  } catch (err: unknown) {
    console.error('[FORGOT_PASSWORD_ERROR]', err);
    return apiError('Failed to process password reset request', 500);
  }
}
