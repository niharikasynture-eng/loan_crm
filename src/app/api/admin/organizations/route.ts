import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireRole, apiError, apiSuccess, ROLES } from '@/lib/auth';
import Organization from '@/models/Organization';
import User from '@/models/User';
import Notification from '@/models/Notification';
import AuditLog from '@/models/AuditLog';
import { sendOrgApprovalEmail, sendOrgRejectionEmail } from '@/lib/email';
import { v4 as uuidv4 } from 'uuid';

// GET /api/admin/organizations (super_admin only)
export async function GET(req: NextRequest) {
  try {
    const auth = requireRole(req, [ROLES.SUPER_ADMIN]);
    await connectDB();

    const { searchParams } = req.nextUrl;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const status = searchParams.get('status');

    const query: Record<string, unknown> = {};
    if (status) query.status = status;

    const [orgs, total] = await Promise.all([
      Organization.find(query)
        .populate('approvedBy', 'name email')
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Organization.countDocuments(query),
    ]);

    // For each org, get admin email if it exists
    const orgIds = orgs.map((o) => o._id);
    const admins = await User.find({
      organizationId: { $in: orgIds },
      role: 'org_admin',
    }).select('name email organizationId isActive').lean();

    const adminMap: Record<string, { name: string; email: string; isActive: boolean }> = {};
    admins.forEach((a) => {
      adminMap[a.organizationId.toString()] = {
        name: a.name,
        email: a.email,
        isActive: a.isActive,
      };
    });

    const enriched = orgs.map((o) => ({
      ...o,
      adminInfo: adminMap[o._id.toString()] || null,
    }));

    return apiSuccess({ organizations: enriched, total, page, limit });
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
      if (err.message === 'FORBIDDEN') return apiError('Forbidden', 403);
    }
    return apiError('Failed to fetch organizations', 500);
  }
}

// POST /api/admin/organizations — Super Admin directly creates new Organization + Org Admin
export async function POST(req: NextRequest) {
  try {
    const auth = requireRole(req, [ROLES.SUPER_ADMIN]);
    await connectDB();

    const { name, adminName, adminEmail, password, subscription } = await req.json();

    if (!name || !adminName || !adminEmail || !password) {
      return apiError('Organization name, admin name, admin email, and password are required');
    }

    const cleanEmail = adminEmail.trim().toLowerCase();
    const existingUser = await User.findOne({ email: cleanEmail });
    if (existingUser) {
      return apiError('A user with this email address already exists');
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') || 'org-' + Date.now();
    const leadFormToken = uuidv4();

    const org = await Organization.create({
      name,
      slug,
      email: cleanEmail,
      subscription: subscription || 'pro',
      status: 'active',
      isActive: true,
      leadFormToken,
      approvedBy: auth.userId,
      approvedAt: new Date(),
    });

    const adminUser = await User.create({
      organizationId: org._id,
      name: adminName,
      email: cleanEmail,
      password,
      role: 'org_admin',
      isActive: true,
    });

    await AuditLog.create({
      action: 'org_created_by_superadmin',
      performedBy: auth.userId,
      targetId: org._id,
      targetType: 'Organization',
      metadata: { orgName: org.name, adminEmail: cleanEmail },
    });

    return apiSuccess({
      organization: org,
      admin: { id: adminUser._id, name: adminUser.name, email: adminUser.email, role: adminUser.role }
    }, 'Organization created successfully', 201);
  } catch (err: unknown) {
    console.error('[CREATE_ORG_ERROR]', err);
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
      if (err.message === 'FORBIDDEN') return apiError('Forbidden', 403);
    }
    return apiError('Failed to create organization', 500);
  }
}

// PATCH /api/admin/organizations — approve, reject, activate, deactivate, delete
export async function PATCH(req: NextRequest) {
  try {
    const auth = requireRole(req, [ROLES.SUPER_ADMIN]);
    await connectDB();

    const { orgId, action, rejectionReason, subscription } = await req.json();
    if (!orgId || !action) return apiError('orgId and action are required');

    const org = await Organization.findById(orgId);
    if (!org) return apiError('Organization not found', 404);

    const superAdmin = await User.findById(auth.userId);

    if (action === 'approve') {
      const adminUser = await User.findOne({ organizationId: org._id, role: 'org_admin' });
      if (!adminUser) return apiError('No pending admin found for this organization', 404);

      const token = uuidv4();
      const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

      adminUser.passwordSetToken = token;
      adminUser.passwordSetExpiry = expiry;
      await adminUser.save();

      org.status = 'active';
      org.isActive = true;
      org.approvedBy = superAdmin?._id;
      org.approvedAt = new Date();
      await org.save();

      await sendOrgApprovalEmail(adminUser.email, org.name, adminUser.name, token);

      await Notification.create({
        userId: adminUser._id,
        organizationId: org._id,
        type: 'org_approved',
        title: 'Organization Approved!',
        message: `Your organization "${org.name}" has been approved. Check your email to set your password.`,
        link: '/dashboard',
      });

      await AuditLog.create({
        action: 'org_approved',
        performedBy: auth.userId,
        targetId: org._id,
        targetType: 'Organization',
        metadata: { orgName: org.name, adminEmail: adminUser.email },
      });

      return apiSuccess({ organization: org }, 'Organization approved. Password setup email sent.');
    }

    if (action === 'reject') {
      const adminUser = await User.findOne({ organizationId: org._id, role: 'org_admin' });

      org.status = 'rejected';
      org.isActive = false;
      org.rejectionReason = rejectionReason || 'No reason provided';
      await org.save();

      if (adminUser) {
        await sendOrgRejectionEmail(adminUser.email, org.name, adminUser.name, rejectionReason || '');
      }

      await AuditLog.create({
        action: 'org_rejected',
        performedBy: auth.userId,
        targetId: org._id,
        targetType: 'Organization',
        metadata: { orgName: org.name, reason: rejectionReason },
      });

      return apiSuccess({ organization: org }, 'Organization rejected.');
    }

    if (action === 'activate') {
      org.status = 'active';
      org.isActive = true;
      await org.save();
      await AuditLog.create({
        action: 'org_activated',
        performedBy: auth.userId,
        targetId: org._id,
        targetType: 'Organization',
      });
      return apiSuccess({ organization: org }, 'Organization activated.');
    }

    if (action === 'deactivate') {
      org.status = 'inactive';
      org.isActive = false;
      await org.save();
      await AuditLog.create({
        action: 'org_deactivated',
        performedBy: auth.userId,
        targetId: org._id,
        targetType: 'Organization',
      });
      return apiSuccess({ organization: org }, 'Organization deactivated.');
    }

    if (action === 'delete') {
      org.status = 'deleted';
      org.isActive = false;
      await org.save();
      await AuditLog.create({
        action: 'org_deleted',
        performedBy: auth.userId,
        targetId: org._id,
        targetType: 'Organization',
      });
      return apiSuccess({}, 'Organization deleted.');
    }

    if (action === 'update_subscription') {
      if (subscription) org.subscription = subscription;
      await org.save();
      return apiSuccess({ organization: org }, 'Subscription updated.');
    }

    return apiError('Invalid action', 400);
  } catch (err: unknown) {
    if (err instanceof Error) {
      if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
      if (err.message === 'FORBIDDEN') return apiError('Forbidden', 403);
    }
    return apiError('Failed to update organization', 500);
  }
}
