import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';
import Lead from '@/models/Lead';
import Deal, { DealStage } from '@/models/Deal';
import Task from '@/models/Task';
import Activity from '@/models/Activity';
import Notification from '@/models/Notification';
import User from '@/models/User';
import { ROLES } from '@/lib/auth';

export type IntentEventType =
  | 'site_visit_scheduled'
  | 'site_visit_completed'
  | 'proposal_requested'
  | 'booking_confirmed';

interface IntentStagePayload {
  organizationId: string | mongoose.Types.ObjectId;
  leadId: string | mongoose.Types.ObjectId;
  eventType: IntentEventType;
  eventData?: {
    visitDate?: Date | string;
    visitTime?: string;
    projectName?: string;
    amount?: number;
    notes?: string;
  };
}

/**
 * Intent-Based Stage Movement Engine:
 * Automatically advances Lead status and Kanban Deal cards to appropriate stages
 * based on customer actions (Site Visit Scheduled, Proposal Requested, Booking Confirmed)
 * without requiring manual drag-and-drop.
 */
export async function triggerIntentStageMovement({
  organizationId,
  leadId,
  eventType,
  eventData,
}: IntentStagePayload) {
  try {
    await connectDB();

    const orgIdObj = new mongoose.Types.ObjectId(organizationId.toString());
    const leadIdObj = new mongoose.Types.ObjectId(leadId.toString());

    const lead = await Lead.findOne({ _id: leadIdObj, organizationId: orgIdObj });
    if (!lead) return null;

    const assignedAgentId = lead.assignedTo;

    // Determine target stage based on event type
    let targetLeadStatus = lead.status;
    let targetDealStage: DealStage = 'in_progress';
    let activityNote = '';
    let taskTitle = '';

    const visitDateFormatted = eventData?.visitDate
      ? new Date(eventData.visitDate).toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
        })
      : 'Upcoming Date';

    if (eventType === 'site_visit_scheduled') {
      targetLeadStatus = 'qualified';
      targetDealStage = 'in_progress';
      activityNote = `🗓️ Site Visit Scheduled for ${visitDateFormatted} at ${eventData?.visitTime || '10:00 AM'}${
        eventData?.projectName ? ` (${eventData.projectName})` : ''
      }.`;
      taskTitle = `Conduct Site Visit with ${lead.name} (${visitDateFormatted})`;
    } else if (eventType === 'site_visit_completed') {
      targetLeadStatus = 'qualified';
      targetDealStage = 'in_progress';
      activityNote = `✅ Site Visit Completed for ${lead.name}.`;
      taskTitle = `Send Follow-up Proposal to ${lead.name}`;
    } else if (eventType === 'proposal_requested') {
      targetLeadStatus = 'proposal';
      targetDealStage = 'negotiation';
      activityNote = `📄 Proposal/Pricing Quote requested by ${lead.name}.`;
      taskTitle = `Prepare & Send Proposal to ${lead.name}`;
    } else if (eventType === 'booking_confirmed') {
      targetLeadStatus = 'won';
      targetDealStage = 'closed_won';
      activityNote = `🎉 Unit Booking Confirmed for ${lead.name}!`;
    }

    // 1. Update Lead record (status, lastContactedAt, reset SLA ghost flag)
    lead.status = targetLeadStatus;
    lead.pipelineStage = targetLeadStatus;
    lead.lastContactedAt = new Date();
    lead.isGhost = false;
    await lead.save();

    // 2. Find or Create linked Deal & move Kanban stage automatically
    let deal = await Deal.findOne({ leadId: leadIdObj, organizationId: orgIdObj });

    if (!deal) {
      // Find highest position in target stage for smooth Kanban placement
      const lastDealInStage = await Deal.findOne({
        organizationId: orgIdObj,
        stage: targetDealStage,
      })
        .sort({ position: -1 })
        .select('position')
        .lean();

      const nextPosition = (lastDealInStage?.position || 0) + 1;

      deal = await Deal.create({
        organizationId: orgIdObj,
        leadId: leadIdObj,
        title: `Deal — ${lead.name}`,
        value: eventData?.amount || lead.value || 100000,
        currency: 'USD',
        stage: targetDealStage,
        assignedTo: assignedAgentId || lead.createdBy,
        createdBy: lead.createdBy,
        position: nextPosition,
        notes: activityNote,
      });
    } else {
      deal.stage = targetDealStage;
      if (eventData?.amount) deal.value = eventData.amount;
      if (activityNote) deal.notes = activityNote;
      await deal.save();
    }

    // 3. Log Activity Feed entry
    await Activity.create({
      organizationId: orgIdObj,
      leadId: leadIdObj,
      type: eventType.includes('visit') ? 'meeting' : eventType.includes('proposal') ? 'note' : 'call',
      notes: activityNote,
      status: 'completed',
      completedAt: new Date(),
      createdBy: assignedAgentId || lead.createdBy,
    });

    // 4. Create Task for assigned agent
    if (taskTitle && assignedAgentId) {
      await Task.create({
        organizationId: orgIdObj,
        leadId: leadIdObj,
        title: taskTitle,
        dueDate: eventData?.visitDate ? new Date(eventData.visitDate) : new Date(Date.now() + 24 * 60 * 60 * 1000),
        priority: 'high',
        status: 'pending',
        assignedTo: assignedAgentId,
        createdBy: assignedAgentId,
      });
    }

    // 5. Send in-app notification to assigned agent & managers
    if (assignedAgentId) {
      await Notification.create({
        userId: assignedAgentId,
        organizationId: orgIdObj,
        type: 'lead_assigned',
        title: `⚡ Intent Stage Mover: ${lead.name}`,
        message: `Automated: ${activityNote} Deal card moved to "${targetDealStage.replace('_', ' ')}".`,
        link: `/leads/${lead._id}`,
      });
    }

    return { lead, deal };
  } catch (err) {
    console.error('[INTENT_STAGE_MOVER_ERROR]', err);
    return null;
  }
}
