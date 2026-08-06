import { NextRequest } from 'next/server';
import { connectDB } from '@/lib/db';
import { requireAuth, apiError, apiSuccess, ROLES } from '@/lib/auth';
import Lead from '@/models/Lead';
import User from '@/models/User';
import Notification from '@/models/Notification';
import AuditLog from '@/models/AuditLog';
import { getAutoAssignedAgent } from '@/lib/lead-routing';
import { sendLeadAssignedEmail } from '@/lib/email';
import mongoose from 'mongoose';

// POST /api/leads/auto-route — Auto-distribute unassigned leads among active agents
export async function POST(req: NextRequest) {
  try {
    const auth = requireAuth(req);
    await connectDB();

    if (auth.role !== ROLES.ORG_ADMIN && auth.role !== ROLES.MANAGER) {
      return apiError('Access denied. Managers and Admins only.', 403);
    }

    const body = await req.json().catch(() => ({}));
    const { leadIds } = body;

    const query: Record<string, unknown> = {
      organizationId: auth.organizationId,
    };

    if (Array.isArray(leadIds) && leadIds.length > 0) {
      query._id = { $in: leadIds.map((id: string) => new mongoose.Types.ObjectId(id)) };
    } else {
      // If no leadIds specified, target all unassigned leads
      query.assignedTo = null;
    }

    const leadsToRoute = await Lead.find(query).select('_id name assignedTo').lean();

    if (leadsToRoute.length === 0) {
      return apiSuccess({ routedCount: 0 }, 'No unassigned leads found to route.');
    }

    let routedCount = 0;
    const notifications: Array<{
      userId: string;
      organizationId: string;
      type: string;
      title: string;
      message: string;
      link: string;
    }> = [];

    for (const lead of leadsToRoute) {
      const assignedAgentId = await getAutoAssignedAgent(auth.organizationId);
      if (!assignedAgentId) break;

      await Lead.updateOne(
        { _id: lead._id },
        { $set: { assignedTo: new mongoose.Types.ObjectId(assignedAgentId) } }
      );

      routedCount++;

      notifications.push({
        userId: assignedAgentId,
        organizationId: auth.organizationId.toString(),
        type: 'lead_assigned',
        title: 'Lead Auto-Assigned',
        message: `You were auto-assigned the lead: "${lead.name}"`,
        link: `/leads/${lead._id}`,
      });
    }

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    return apiSuccess(
      { routedCount },
      `Successfully auto-routed ${routedCount} leads using Smart Lead Routing.`
    );
  } catch (err: unknown) {
    console.error('[AUTO_ROUTE_ERROR]', err);
    if (err instanceof Error && err.message === 'UNAUTHORIZED') return apiError('Unauthorized', 401);
    return apiError('Failed to auto-route leads', 500);
  }
}
