import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import Deal from '@/models/Deal';
import Lead from '@/models/Lead';
import Activity from '@/models/Activity';
import Notification from '@/models/Notification';
import Organization from '@/models/Organization';
import { sendEmail } from '@/lib/email';

/**
 * Stale Deal Auto-Cleanup Engine:
 * 1. Detects deals in 'in_progress' or 'negotiation' stages inactive for 14+ days.
 * 2. Flags deal as `isStale = true` and sends an automated "break-up" email to prospect.
 * 3. If no activity/reply within 48 hours after break-up email, auto-archives deal as 'Closed Lost - Unresponsive'.
 */
export async function processStaleDeals(targetOrgId?: string) {
  try {
    await connectDB();

    const FOURTEEN_DAYS_AGO = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const FORTY_EIGHT_HOURS_AGO = new Date(Date.now() - 48 * 60 * 60 * 1000);

    const query: Record<string, unknown> = {
      stage: { $in: ['in_progress', 'negotiation'] },
    };

    if (targetOrgId) {
      query.organizationId = new mongoose.Types.ObjectId(targetOrgId);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PHASE 1: Find 14-day inactive deals & send Automated Break-up Email
    // ──────────────────────────────────────────────────────────────────────────
    const staleCandidateDeals = await Deal.find({
      ...query,
      breakupEmailSent: { $ne: true },
      updatedAt: { $lte: FOURTEEN_DAYS_AGO },
    })
      .populate('leadId', 'name email phone')
      .populate('organizationId', 'name slug email')
      .populate('assignedTo', 'name email');

    let breakUpEmailsSentCount = 0;

    for (const deal of staleCandidateDeals) {
      const lead = deal.leadId as any;
      const org = deal.organizationId as any;
      const assignedUser = deal.assignedTo as any;

      if (!lead) continue;

      // Check if any recent activities occurred in the last 14 days
      const recentActivity = await Activity.findOne({
        leadId: lead._id,
        createdAt: { $gte: FOURTEEN_DAYS_AGO },
      });

      if (recentActivity) {
        // Lead had recent activity, update deal timestamp to stay active
        deal.updatedAt = new Date();
        await deal.save();
        continue;
      }

      // Mark deal as Stale & record breakup email timestamp
      deal.isStale = true;
      deal.staleFlaggedAt = new Date();
      deal.breakupEmailSent = true;
      deal.breakupEmailSentAt = new Date();
      await deal.save();

      breakUpEmailsSentCount++;

      // Send Break-Up Email to prospect if email exists
      if (lead.email) {
        const leadFirstName = lead.name.split(' ')[0];
        const orgName = org?.name || 'our team';

        await sendEmail({
          to: lead.email,
          subject: `Checking in regarding ${deal.title} — ${orgName}`,
          html: `
            <div style="font-family:sans-serif;max-width:540px;margin:0 auto;padding:32px;background:#0f172a;color:#e2e8f0;border-radius:12px;">
              <h3 style="color:#818cf8;margin-bottom:16px;">Quick Question, ${leadFirstName}?</h3>
              <p>Hi ${leadFirstName},</p>
              <p>I haven't heard back from you in a while regarding <strong>${deal.title}</strong>.</p>
              <p style="background:#1e293b;padding:16px;border-radius:8px;border-left:4px solid #f59e0b;margin:16px 0;font-style:italic;">
                "Assuming you've gone in another direction or your priorities have changed for now!"
              </p>
              <p>If you're still interested in moving forward, please reply to this email to let me know.</p>
              <p>Otherwise, no worries at all! I will close out your file so we don't bother you further.</p>
              <br/>
              <p style="color:#94a3b8;font-size:13px;">Best regards,<br/><strong>${assignedUser?.name || orgName}</strong></p>
            </div>
          `,
        });
      }

      // Create Activity log
      await Activity.create({
        organizationId: deal.organizationId,
        leadId: lead._id,
        type: 'email',
        notes: `⚠️ Stale Deal Warning: Automated break-up email sent to ${lead.name} after 14 days of inactivity.`,
        status: 'completed',
        completedAt: new Date(),
        createdBy: deal.assignedTo,
      });

      // Notify Sales Agent & Managers
      if (assignedUser) {
        await Notification.create({
          userId: assignedUser._id,
          organizationId: deal.organizationId,
          type: 'new_lead',
          title: `⚠️ Stale Deal: ${deal.title}`,
          message: `Deal "${deal.title}" has been inactive for 14+ days. Automated break-up email dispatched.`,
          link: `/leads/${lead._id}`,
        });
      }
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PHASE 2: Find deals with Break-Up Email sent > 48h ago & Auto-Archive
    // ──────────────────────────────────────────────────────────────────────────
    const dealsToArchive = await Deal.find({
      ...query,
      breakupEmailSent: true,
      breakupEmailSentAt: { $lte: FORTY_EIGHT_HOURS_AGO },
    })
      .populate('leadId', 'name email')
      .populate('assignedTo', 'name email');

    let autoArchivedCount = 0;

    for (const deal of dealsToArchive) {
      const lead = deal.leadId as any;
      const assignedUser = deal.assignedTo as any;

      if (!lead) continue;

      // Check if lead replied or had activity since breakup email sent
      const activityAfterBreakup = await Activity.findOne({
        leadId: lead._id,
        createdAt: { $gte: deal.breakupEmailSentAt },
      });

      if (activityAfterBreakup) {
        // Client engaged! Unflag stale status
        deal.isStale = false;
        deal.breakupEmailSent = false;
        deal.updatedAt = new Date();
        await deal.save();
        continue;
      }

      // Auto-Archive as Closed Lost - Unresponsive
      deal.stage = 'closed_lost';
      deal.lostReason = 'Closed Lost - Unresponsive (Stale Auto-Cleanup)';
      deal.actualCloseDate = new Date();
      deal.isStale = false;
      await deal.save();

      // Update Lead status to lost
      await Lead.findByIdAndUpdate(lead._id, {
        status: 'lost',
        pipelineStage: 'lost',
        lostReason: 'Unresponsive after 14-day inactivity & break-up email',
      });

      autoArchivedCount++;

      // Log Activity
      await Activity.create({
        organizationId: deal.organizationId,
        leadId: lead._id,
        type: 'note',
        notes: `🕸️ Stale Deal Auto-Archived: Moved to Closed Lost after 48h with zero response.`,
        status: 'completed',
        completedAt: new Date(),
        createdBy: deal.assignedTo,
      });

      // Notify Sales Agent
      if (assignedUser) {
        await Notification.create({
          userId: assignedUser._id,
          organizationId: deal.organizationId,
          type: 'new_lead',
          title: `🕸️ Deal Auto-Archived: ${deal.title}`,
          message: `Deal "${deal.title}" automatically moved to Closed Lost (Unresponsive).`,
          link: `/leads/${lead._id}`,
        });
      }
    }

    return {
      breakUpEmailsSentCount,
      autoArchivedCount,
    };
  } catch (err) {
    console.error('[STALE_DEAL_CHECKER_ERROR]', err);
    return { breakUpEmailsSentCount: 0, autoArchivedCount: 0 };
  }
}
