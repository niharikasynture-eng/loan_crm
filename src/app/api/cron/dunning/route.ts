import { NextRequest } from 'next/server';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import { runDunningEngine } from '@/lib/dunning-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    if (auth.role !== 'super_admin' && auth.role !== 'org_admin' && auth.role !== 'manager') {
      return apiError('Access denied. Running Dunning Engine is restricted to Admins & Managers.', 403);
    }

    const summary = await runDunningEngine(auth.organizationId, auth.userId);

    return apiSuccess(
      { summary },
      `Dunning scan completed: ${summary.emailsSent} Emails sent, ${summary.whatsappSent} WhatsApp alerts sent, ${summary.tasksEscalated} Tasks escalated`
    );
  } catch (err: any) {
    if (err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError(err.message || 'Failed to run Dunning Engine', 500);
  }
}

export async function GET(req: NextRequest) {
  return POST(req);
}
