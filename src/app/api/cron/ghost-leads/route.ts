import { NextRequest } from 'next/server';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import { runGhostLeadCheck } from '@/lib/ghost-checker';

// GET / POST /api/cron/ghost-leads — Trigger 24-Hour SLA Ghost Lead check
export async function GET(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.role === ROLES.SUPER_ADMIN) {
      return apiError('Super admin cannot run organization SLA check', 403);
    }
    const result = await runGhostLeadCheck(auth.organizationId.toString());
    return apiSuccess(result, 'Ghost Lead SLA check completed');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('SLA check failed', 500);
  }
}

export async function POST(req: NextRequest) {
  return GET(req);
}
