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
 * Scans for leads assigned to sales agents > 24 hours ago that have NOT been contacted.
 * Automatically flags as Ghost Lead 👻, creates/updates High-Priority Task for the agent,
 * and sends an alert notification & email to the Agent and Organization Admins EVERY 24 hours
 * until the client/lead is contacted.
 */
export async function runGhostLeadCheck(organizationId?: string) {
  try {
    await connectDB();

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const query: Record<string, unknown> = {
      assignedTo: { $ne: null },
      assignedAt: { $lte: twentyFourHoursAgo },
      status: { $in: ['new'] },
      $or: [
        { lastContactedAt: { $exists: false } },
        { lastContactedAt: null },
        { $expr: { $lt: ['$lastContactedAt', '$assignedAt'] } },
      ],
      $and: [
        {
          $or: [
            { lastGhostAlertSentAt: { $exists: false } },
            { lastGhostAlertSentAt: null },
            { lastGhostAlertSentAt: { $lte: twentyFourHoursAgo } },
          ],
        },
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
      const agentEmail = agent?.email;

      // Calculate how long lead has been uncontacted
      const assignedDate = lead.assignedAt ? new Date(lead.assignedAt) : new Date();
      const msUncontacted = Date.now() - assignedDate.getTime();
      const hoursUncontacted = Math.floor(msUncontacted / (60 * 60 * 1000));
      const daysUncontacted = Math.floor(hoursUncontacted / 24);
      const durationText = daysUncontacted > 1 ? `${daysUncontacted} days` : `${hoursUncontacted} hours`;

      // 1. Flag lead as Ghost Lead and set lastGhostAlertSentAt to current timestamp
      await Lead.updateOne(
        { _id: lead._id },
        { $set: { isGhost: true, ghostAlertSent: true, lastGhostAlertSentAt: new Date() } }
      );

      // 2. Create/Update Urgent Task & Notifications for the Assigned Agent
      if (agent?._id || agent) {
        const agentId = agent._id || agent;

        await Task.create({
          organizationId: orgId,
          leadId: lead._id,
          title: `🚨 RECURRING REMINDER: Uncontacted Lead ${lead.name} (${durationText} overdue)`,
          description: `This lead was assigned ${durationText} ago and has still not been contacted. Please reach out immediately!`,
          dueDate: new Date(),
          priority: 'high',
          status: 'pending',
          assignedTo: agentId,
          createdBy: agentId,
        });

        // 2b. In-App Notification for Agent
        await Notification.create({
          userId: agentId,
          organizationId: orgId,
          type: 'sla_breach',
          title: `👻 24h Reminder: Lead Uncontacted (${durationText})`,
          message: `Daily Reminder: Lead "${lead.name}" assigned to you has not been contacted for ${durationText}!`,
          link: `/leads/${lead._id}`,
        });

        // 2c. Send Email Alert directly to Agent (Every 24 Hours)
        if (agentEmail) {
          await sendEmail({
            to: agentEmail,
            subject: `🚨 Daily Reminder: Lead "${lead.name}" uncontacted after ${durationText}`,
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
                <h2 style="color:#f87171;margin-bottom:16px;">👻 24h SLA Breach Reminder — Action Required</h2>
                <p>Hi <strong>${agentName}</strong>,</p>
                <p>This is your daily reminder that lead <strong>${lead.name}</strong> was assigned to you <strong>${durationText} ago</strong> and has still received 0 calls or contact logs.</p>
                <div style="background:#1e293b;padding:16px;border-radius:8px;border-left:4px solid #f87171;margin:16px 0;">
                  <p style="margin:4px 0;"><strong>Lead Name:</strong> ${lead.name}</p>
                  <p style="margin:4px 0;"><strong>Phone:</strong> ${lead.phone || 'N/A'}</p>
                  <p style="margin:4px 0;"><strong>Uncontacted Duration:</strong> ${durationText}</p>
                  <p style="margin:4px 0;"><strong>Reminder Frequency:</strong> Every 24 Hours</p>
                </div>
                <p style="color:#94a3b8;font-size:13px;">Please log into DealByte CRM to call or log activity for this lead immediately to stop daily reminders.</p>
              </div>
            `,
          });
        }
      }

      // 3. Notify Organization Admins & Managers
      const orgAdmins = await User.find({
        organizationId: orgId,
        role: { $in: [ROLES.ORG_ADMIN, ROLES.MANAGER] },
        isActive: true,
      })
        .select('_id email name')
        .lean();

      if (orgAdmins.length > 0) {
        // Filter out agent if agent is an admin/manager to avoid duplicate notification/email
        const adminRecipients = orgAdmins.filter(
          (admin) => admin._id.toString() !== agent?._id?.toString()
        );

        if (adminRecipients.length > 0) {
          // Create in-app notifications for admins
          await Notification.insertMany(
            adminRecipients.map((admin) => ({
              userId: admin._id,
              organizationId: orgId,
              type: 'sla_breach',
              title: `👻 24h Reminder: Lead "${lead.name}" Uncontacted (${durationText})`,
              message: `Lead "${lead.name}" assigned to ${agentName} has not been contacted for ${durationText}.`,
              link: `/leads/${lead._id}`,
            }))
          );

          // Send email alert to admins
          for (const admin of adminRecipients) {
            await sendEmail({
              to: admin.email,
              subject: `🚨 Daily SLA Alert: "${lead.name}" uncontacted after ${durationText}`,
              html: `
                <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
                  <h2 style="color:#f87171;margin-bottom:16px;">👻 Ghost Lead 24h SLA Reminder</h2>
                  <p>Hi <strong>${admin.name}</strong>,</p>
                  <p>The lead <strong>${lead.name}</strong> was assigned to <strong>${agentName}</strong> <strong>${durationText} ago</strong> but has received 0 calls or contact logs.</p>
                  <div style="background:#1e293b;padding:16px;border-radius:8px;border-left:4px solid #f87171;margin:16px 0;">
                    <p style="margin:4px 0;"><strong>Lead Name:</strong> ${lead.name}</p>
                    <p style="margin:4px 0;"><strong>Phone:</strong> ${lead.phone || 'N/A'}</p>
                    <p style="margin:4px 0;"><strong>Assigned Agent:</strong> ${agentName}</p>
                    <p style="margin:4px 0;"><strong>Uncontacted Duration:</strong> ${durationText}</p>
                  </div>
                  <p style="color:#94a3b8;font-size:13px;">Log into DealByte CRM to re-assign or follow up on this lead.</p>
                </div>
              `,
            });
          }
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
