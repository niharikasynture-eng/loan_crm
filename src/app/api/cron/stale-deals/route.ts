import { NextRequest } from 'next/server';
import { processStaleDeals } from '@/lib/stale-deal-checker';
import { apiSuccess, apiError } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const orgId = searchParams.get('orgId') || undefined;

    const result = await processStaleDeals(orgId);
    return apiSuccess(result, 'Stale deal cleanup SLA check completed');
  } catch (err: unknown) {
    console.error('Stale deal cron error:', err);
    return apiError('Failed to execute stale deal SLA check', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const result = await processStaleDeals(body.organizationId);
    return apiSuccess(result, 'Stale deal cleanup SLA check completed');
  } catch (err: unknown) {
    console.error('Stale deal cron error:', err);
    return apiError('Failed to execute stale deal SLA check', 500);
  }
}
