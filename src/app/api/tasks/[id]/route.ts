import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess } from '@/lib/auth';
import Task from '@/models/Task';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = requireAuth(req);
    const { id } = await params;
    await connectDB();

    const task = await Task.findOne({ _id: id, organizationId: auth.organizationId })
      .populate('assignedTo', 'name email avatar')
      .populate('leadId', 'name email phone')
      .populate('createdBy', 'name email')
      .lean();

    if (!task) return apiError('Task not found', 404);
    return apiSuccess({ task });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to fetch task', 500);
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
    const updates: Record<string, unknown> = {};
    const allowed = ['title', 'description', 'status', 'priority', 'dueDate', 'assignedTo', 'completedAt'];
    for (const key of allowed) {
      if (body[key] !== undefined) updates[key] = body[key];
    }
    if (body.status === 'completed' && !body.completedAt) {
      updates.completedAt = new Date();
    }

    const task = await Task.findOneAndUpdate(
      { _id: id, organizationId: auth.organizationId },
      updates,
      { new: true }
    )
      .populate('assignedTo', 'name email avatar')
      .populate('leadId', 'name email phone')
      .lean();

    if (!task) return apiError('Task not found', 404);
    return apiSuccess({ task });
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to update task', 500);
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

    await Task.findOneAndDelete({ _id: id, organizationId: auth.organizationId });
    return apiSuccess(null, 'Task deleted');
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to delete task', 500);
  }
}
