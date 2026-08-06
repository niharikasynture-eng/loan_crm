import mongoose, { Document, Schema, Model } from 'mongoose';

export type DealStage =
  | 'new'
  | 'in_progress'
  | 'negotiation'
  | 'closed_won'
  | 'closed_lost';

export interface IDeal extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  title: string;
  value: number;
  currency: string;
  stage: DealStage;
  probability?: number;
  expectedCloseDate?: Date;
  actualCloseDate?: Date;
  assignedTo: mongoose.Types.ObjectId;
  lostReason?: string;
  notes?: string;
  pipelineId?: mongoose.Types.ObjectId;
  position: number;
  isStale?: boolean;
  staleFlaggedAt?: Date;
  breakupEmailSent?: boolean;
  breakupEmailSentAt?: Date;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const DealSchema = new Schema<IDeal>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    title: { type: String, required: true, trim: true },
    value: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'USD' },
    stage: {
      type: String,
      enum: ['new', 'in_progress', 'negotiation', 'closed_won', 'closed_lost'],
      default: 'new',
    },
    probability: { type: Number, min: 0, max: 100 },
    expectedCloseDate: { type: Date },
    actualCloseDate: { type: Date },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    lostReason: { type: String },
    notes: { type: String },
    pipelineId: { type: Schema.Types.ObjectId, ref: 'Pipeline' },
    position: { type: Number, default: 0 },
    isStale: { type: Boolean, default: false },
    staleFlaggedAt: { type: Date },
    breakupEmailSent: { type: Boolean, default: false },
    breakupEmailSentAt: { type: Date },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

DealSchema.index({ organizationId: 1, stage: 1 });
DealSchema.index({ organizationId: 1, assignedTo: 1 });
DealSchema.index({ organizationId: 1, createdAt: -1 });

const Deal: Model<IDeal> =
  mongoose.models.Deal || mongoose.model<IDeal>('Deal', DealSchema);

export default Deal;
