import mongoose, { Document, Schema, Model } from 'mongoose';

export type ActivityType = 'call' | 'note' | 'meeting' | 'email' | 'whatsapp';
export type CallOutcome = 'connected' | 'no_answer' | 'busy' | 'voicemail' | 'callback' | 'interested' | 'not_interested';

export interface IActivity extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  type: ActivityType;
  outcome?: CallOutcome;
  duration?: number;
  notes: string;
  link?: string;
  subject?: string;
  status?: 'pending' | 'completed' | 'failed';
  scheduledAt?: Date;
  completedAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ActivitySchema = new Schema<IActivity>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    type: {
      type: String,
      enum: ['call', 'note', 'meeting', 'email', 'whatsapp'],
      required: true,
    },
    outcome: {
      type: String,
      enum: ['connected', 'no_answer', 'busy', 'voicemail', 'callback', 'interested', 'not_interested'],
    },
    duration: { type: Number },
    notes: { type: String, default: '' },
    link: { type: String },
    subject: { type: String },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'completed',
    },
    scheduledAt: { type: Date },
    completedAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

ActivitySchema.index({ organizationId: 1, leadId: 1, createdAt: -1 });
ActivitySchema.index({ organizationId: 1, createdBy: 1, createdAt: -1 });
ActivitySchema.index({ organizationId: 1, type: 1, createdAt: -1 });

const Activity: Model<IActivity> =
  mongoose.models.Activity || mongoose.model<IActivity>('Activity', ActivitySchema);

export default Activity;
