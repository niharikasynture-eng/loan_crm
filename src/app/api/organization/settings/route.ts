import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import Organization from '@/models/Organization';

// GET /api/organization/settings — Fetch organization settings
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role === ROLES.SUPER_ADMIN) {
      return apiError('Super admin cannot access organization data', 403);
    }

    const org = await Organization.findById(auth.organizationId)
      .select('name slug email settings')
      .lean();

    if (!org) return apiError('Organization not found', 404);

    return apiSuccess({
      settings: {
        leadRoutingMode: org.settings?.leadRoutingMode || 'round_robin',
        autoAssignNewLeads: org.settings?.autoAssignNewLeads !== false,
        leadSources: org.settings?.leadSources || [],
        customFields: org.settings?.customFields || [],
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch settings', 500);
  }
}

// PATCH /api/organization/settings — Update organization settings (Org Admin only)
export async function PATCH(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role !== ROLES.ORG_ADMIN) {
      return apiError('Only organization admins can modify routing settings', 403);
    }

    const body = await req.json();
    const { leadRoutingMode, autoAssignNewLeads, leadSources } = body;

    const updates: Record<string, unknown> = {};

    if (leadRoutingMode && ['manual', 'round_robin', 'performance'].includes(leadRoutingMode)) {
      updates['settings.leadRoutingMode'] = leadRoutingMode;
    }

    if (typeof autoAssignNewLeads === 'boolean') {
      updates['settings.autoAssignNewLeads'] = autoAssignNewLeads;
    }

    if (Array.isArray(leadSources)) {
      updates['settings.leadSources'] = leadSources;
    }

    const updatedOrg = await Organization.findByIdAndUpdate(
      auth.organizationId,
      { $set: updates },
      { new: true }
    ).select('settings');

    return apiSuccess({ settings: updatedOrg?.settings }, 'Organization settings updated');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to update settings', 500);
  }
}
