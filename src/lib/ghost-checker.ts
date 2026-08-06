import { connectDB } from '@/lib/db';
import Lead from '@/models/Lead';
import User from '@/models/User';
import Task from '@/models/Task';
import Notification from '@/models/Notification';
import { ROLES } from '@/lib/auth';
import { sendEmail } from '@/lib/email';
import mongoose from 'mongoose';

/**
 * SLA Ghost Checker Engine:
 * Scans for leads assigned to sales agents > 2 hours ago that have NOT been contacted.
 * Automatically flags as Ghost Lead 👻, creates a High-Priority Task for the agent,
 * and sends an alert notification & email to the Organization Admin.
 */
export async function runGhostLeadCheck(organizationId?: string) {
  try {
    await connectDB();

    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);

    const query: Record<string, unknown> = {
      assignedTo: { $ne: null },
      assignedAt: { $lte: twoHoursAgo },
      ghostAlertSent: { $ne: true },
      status: { $in: ['new'] },
      $or: [
        { lastContactedAt: { $exists: false } },
        { lastContactedAt: null },
        { $expr: { $lt: ['$lastContactedAt', '$assignedAt'] } },
      ],
    };

    if (organizationId) {
      query.organizationId = new mongoose.Types.ObjectId(organizationId);
    }

    const breachedLeads = await Lead.find(query)
      .populate('assignedTo', 'name email')
      .populate('organizationId', 'name email')
      .lean();

    if (breachedLeads.length === 0) {
      return { breachedCount: 0 };
    }

    let processedCount = 0;

    for (const lead of breachedLeads) {
      const agent = (lead as any).assignedTo;
      const org = (lead as any).organizationId;
      const orgId = lead.organizationId._id || lead.organizationId;
      const agentName = agent?.name || 'Assigned Agent';

      // 1. Flag lead as Ghost Lead
      await Lead.updateOne(
        { _id: lead._id },
        { $set: { isGhost: true, ghostAlertSent: true } }
      );

      // 2. Create High-Priority Urgent Task for the Agent
      if (lead.assignedTo?._id || lead.assignedTo) {
        const agentId = lead.assignedTo._id || lead.assignedTo;
        await Task.create({
          organizationId: orgId,
          leadId: lead._id,
          title: `🚨 URGENT: 2h SLA Breached — Contact ${lead.name}`,
          description: `This lead was assigned over 2 hours ago and has not been contacted yet.`,
          dueDate: new Date(),
          priority: 'high',
          status: 'pending',
          assignedTo: agentId,
          createdBy: agentId,
        });
      }

      // 3. Notify Organization Admins
      const orgAdmins = await User.find({
        organizationId: orgId,
        role: { $in: [ROLES.ORG_ADMIN, ROLES.MANAGER] },
        isActive: true,
      })
        .select('_id email name')
        .lean();

      if (orgAdmins.length > 0) {
        // Create in-app notifications
        await Notification.insertMany(
          orgAdmins.map((admin) => ({
            userId: admin._id,
            organizationId: orgId,
            type: 'sla_breach',
            title: `👻 Ghost Lead Alert (2h+ Overdue)`,
            message: `Lead "${lead.name}" assigned to ${agentName} has not been contacted after 2 hours!`,
            link: `/leads/${lead._id}`,
          }))
        );

        // Send email alert to admins
        for (const admin of orgAdmins) {
          await sendEmail({
            to: admin.email,
            subject: `🚨 Ghost Lead Alert: "${lead.name}" uncontacted after 2 hours`,
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
                <h2 style="color:#f87171;margin-bottom:16px;">👻 Ghost Lead SLA Breached</h2>
                <p>Hi <strong>${admin.name}</strong>,</p>
                <p>The lead <strong>${lead.name}</strong> was assigned to <strong>${agentName}</strong> over 2 hours ago but has received 0 calls or contact logs.</p>
                <div style="background:#1e293b;padding:16px;border-radius:8px;border-left:4px solid #f87171;margin:16px 0;">
                  <p style="margin:4px 0;"><strong>Lead Name:</strong> ${lead.name}</p>
                  <p style="margin:4px 0;"><strong>Phone:</strong> ${lead.phone || 'N/A'}</p>
                  <p style="margin:4px 0;"><strong>Assigned Agent:</strong> ${agentName}</p>
                  <p style="margin:4px 0;"><strong>SLA Breach:</strong> 2+ Hours Uncontacted</p>
                </div>
                <p style="color:#94a3b8;font-size:13px;">Log into R-Life CRM to re-assign or follow up on this lead.</p>
              </div>
            `,
          });
        }
      }

      processedCount++;
    }

    return { breachedCount: processedCount };
  } catch (err) {
    console.error('[GHOST_CHECKER_ERROR]', err);
    return { breachedCount: 0, error: err };
  }
}
