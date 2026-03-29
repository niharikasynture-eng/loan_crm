import mongoose, { Document, Schema, Model } from 'mongoose';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost';
export type LeadSource = string;

export interface ILead extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  phone?: string;
  email?: string;
  company?: string;
  source: string;
  status: LeadStatus;
  pipelineStage: LeadStatus;
  assignedTo?: mongoose.Types.ObjectId;
  value?: number;
  notes?: string;
  customFields?: Record<string, string | number | boolean>;
  tags: string[];
  lastContactedAt?: Date;
  lastCalledAt?: Date;
  lastCallOutcome?: string;
  totalCalls: number;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const LeadSchema = new Schema<ILead>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    email: { type: String, lowercase: true, trim: true },
    company: { type: String, trim: true },
    source: { type: String, default: 'Other' },
    status: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'],
      default: 'new',
    },
    pipelineStage: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'],
      default: 'new',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    value: { type: Number },
    notes: { type: String },
    customFields: { type: Schema.Types.Mixed, default: {} },
    tags: { type: [String], default: [] },
    lastContactedAt: { type: Date },
    lastCalledAt: { type: Date, default: null },
    lastCallOutcome: { type: String, default: null },
    totalCalls: { type: Number, default: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

LeadSchema.index({ organizationId: 1, status: 1 });
LeadSchema.index({ organizationId: 1, assignedTo: 1 });
LeadSchema.index({ organizationId: 1, createdAt: -1 });
LeadSchema.index(
  { name: 'text', email: 'text', phone: 'text', company: 'text' }
);

const Lead: Model<ILead> =
  mongoose.models.Lead || mongoose.model<ILead>('Lead', LeadSchema);

export default Lead;
