import Booking, { IBooking, IPaymentMilestone } from '@/models/Booking';
import Task from '@/models/Task';
import { sendDunningInvoiceEmail } from '@/lib/email';
import { sendWhatsApp } from '@/lib/ultramsg';
import { connectDB } from '@/lib/db';

export interface IDunningResult {
  totalContractsScanned: number;
  milestonesEvaluated: number;
  emailsSent: number;
  whatsappSent: number;
  tasksEscalated: number;
  details: string[];
}

export async function runDunningEngine(organizationId: string, currentUserId: string): Promise<IDunningResult> {
  await connectDB();

  const bookings = await Booking.find({ organizationId })
    .populate('leadId', 'name email phone company')
    .populate('salesPersonId', 'name email _id');

  let milestonesEvaluated = 0;
  let emailsSent = 0;
  let whatsappSent = 0;
  let tasksEscalated = 0;
  const details: string[] = [];

  const now = Date.now();

  for (const booking of bookings) {
    const lead = booking.leadId as any;
    const clientName = lead?.name || 'Valued Client';
    const clientEmail = lead?.email || '';
    const clientPhone = lead?.phone || '';
    const unitNumber = booking.unitNumber;
    const repId = (booking.salesPersonId as any)?._id || currentUserId;

    let bookingModified = false;

    for (let idx = 0; idx < (booking.paymentMilestones || []).length; idx++) {
      const milestone = booking.paymentMilestones[idx];
      if (milestone.status === 'paid') continue;

      milestonesEvaluated++;
      const dueDateMs = milestone.dueDate ? new Date(milestone.dueDate).getTime() : now;
      const daysDiff = (dueDateMs - now) / (1000 * 3600 * 24);

      // Rule 1: T-7 Pre-Due Reminder (within 7 days of due date)
      if (daysDiff <= 7 && daysDiff > 0 && clientEmail) {
        try {
          await sendDunningInvoiceEmail(
            clientEmail,
            clientName,
            milestone.name,
            milestone.amount,
            milestone.dueDate,
            unitNumber
          );
          emailsSent++;
          details.push(`📧 T-7 Email sent to ${clientEmail} for ${unitNumber} (${milestone.name})`);
        } catch (err: any) {
          console.error('Dunning Email warning:', err.message);
        }
      }

      // Rule 2: T-0 Due Date Alert (Due today or within 1 day)
      if (daysDiff <= 1 && daysDiff >= -1 && clientPhone) {
        try {
          const text = `Hi ${clientName}, friendly reminder that payment milestone "${milestone.name}" (₹${(milestone.amount / 100000).toFixed(2)} Lakhs) for ${unitNumber} is due on ${new Date(milestone.dueDate).toLocaleDateString()}. Thank you!`;
          await sendWhatsApp(clientPhone, text).catch(() => {});
          whatsappSent++;
          details.push(`💬 T-0 WhatsApp alert dispatched to ${clientPhone} for ${unitNumber}`);
        } catch (err: any) {
          console.error('Dunning WhatsApp warning:', err.message);
        }
      }

      // Rule 3: T+1 Overdue Escalation (Due date passed)
      if (daysDiff < 0) {
        if (milestone.status !== 'overdue') {
          milestone.status = 'overdue';
          bookingModified = true;
        }

        const taskTitle = `🚨 Overdue Payment Escalation: ₹${(milestone.amount / 100000).toFixed(1)}L for ${unitNumber}`;
        const existingTask = await Task.findOne({ organizationId, bookingId: booking._id, title: taskTitle });

        if (!existingTask) {
          await Task.create({
            organizationId,
            leadId: lead?._id || booking.leadId,
            bookingId: booking._id,
            category: 'billing',
            title: taskTitle,
            description: `Payment milestone "${milestone.name}" (₹${(milestone.amount / 100000).toFixed(2)}L) is overdue since ${new Date(milestone.dueDate).toLocaleDateString()}. Please contact ${clientName} immediately to collect clearance.`,
            status: 'overdue',
            priority: 'high',
            dueDate: new Date(),
            assignedTo: repId,
            createdBy: currentUserId,
          });
          tasksEscalated++;
          details.push(`🚨 Overdue Task created & assigned to Account Rep for ${unitNumber}`);
        }
      }
    }

    if (bookingModified) {
      await booking.save();
    }
  }

  return {
    totalContractsScanned: bookings.length,
    milestonesEvaluated,
    emailsSent,
    whatsappSent,
    tasksEscalated,
    details,
  };
}
