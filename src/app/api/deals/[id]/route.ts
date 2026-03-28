import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import Deal from '@/models/Deal';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req);
    const { id } = await params;
    await connectDB();

    const deal = await Deal.findOne({ _id: id, organizationId: auth.organizationId })
      .populate('assignedTo', 'name email avatar')
      .populate('leadId', 'name email phone company')
      .lean();

    if (!deal) return apiError('Deal not found', 404);
    return apiSuccess({ deal });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch deal', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req);
    const { id } = await params;
    await connectDB();

    const body = await req.json();
    const allowed = ['title', 'value', 'stage', 'probability', 'expectedCloseDate', 'actualCloseDate', 'assignedTo', 'lostReason', 'notes', 'position'];
    const updates: Record<string, unknown> = {};
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (body.stage === 'closed_won' || body.stage === 'closed_lost') {
      updates.actualCloseDate = new Date();
    }

    const deal = await Deal.findOneAndUpdate(
      { _id: id, organizationId: auth.organizationId },
      updates,
      { new: true }
    )
      .populate('assignedTo', 'name email avatar')
      .populate('leadId', 'name email phone company')
      .lean();

    if (!deal) return apiError('Deal not found', 404);
    return apiSuccess({ deal });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to update deal', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req);
    const { id } = await params;
    await connectDB();

    await Deal.findOneAndDelete({ _id: id, organizationId: auth.organizationId });
    return apiSuccess(null, 'Deal deleted');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to delete deal', 500);
  }
}
