import { NextRequest } from 'next/server';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import { enrichLeadData } from '@/lib/lead-enrichment';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    requireAuth(req);
    const { id } = await params;

    const enrichedLead = await enrichLeadData(id);
    if (!enrichedLead) {
      return apiError('Lead missing valid email or failed to enrich data', 400);
    }

    return apiSuccess({ lead: enrichedLead }, 'Lead data enriched successfully');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to enrich lead data', 500);
  }
}
