import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { apiError, apiSuccess } from '@/lib/auth';
import Organization from '@/models/Organization';
import User from '@/models/User';
import Notification from '@/models/Notification';

// POST /api/auth/register - Register new org request (pending approval)
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { orgName, orgEmail, adminName, adminEmail, adminPassword, timezone, currency } = body;

    if (!orgName || !adminEmail || !adminPassword || !adminName) {
      return apiError('Missing required fields');
    }

    // Check if email already used
    const existingUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (existingUser) {
      return apiError('Email already registered', 409);
    }

    // Check if org name already taken (by slug)
    const slug =
      orgName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '') +
      '-' +
      Date.now().toString(36);

    // Create org with pending status (no admin user yet)
    const org = await Organization.create({
      name: orgName,
      slug,
      email: orgEmail || adminEmail,
      timezone: timezone || 'UTC',
      currency: currency || 'USD',
      status: 'pending',
      isActive: false,
      // store pending admin info in metadata so we can create user on approval
    });

    // Store pending admin info as a temp user (inactive, no password yet)
    await User.create({
      organizationId: org._id,
      name: adminName,
      email: adminEmail,
      password: adminPassword, // will be overwritten on password-set
      role: 'org_admin',
      isActive: false, // inactive until approved
    });

    // Notify all super admins
    const superAdmins = await User.find({ role: 'super_admin', isActive: true }).select('_id');
    if (superAdmins.length > 0) {
      await Notification.insertMany(
        superAdmins.map((sa) => ({
          userId: sa._id,
          type: 'new_org_request',
          title: 'New Organization Request',
          message: `${orgName} (${adminEmail}) has requested access to SalesCRM.`,
          link: '/super-admin',
        }))
      );
    }

    return apiSuccess(
      { pending: true, orgId: org._id },
      'Organization request submitted. You will receive an email once approved.',
      201
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Registration failed';
    return apiError(message, 500);
  }
}
