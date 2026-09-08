import mongoose, { Document, Schema, Model } from 'mongoose';
import './User';

export type LeadStatus = 'new' | 'contacted' | 'qualified' | 'proposal' | 'won' | 'lost' | 'closed_won' | 'closed_lost' | 'in_progress' | 'negotiation';
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
  assignedAt?: Date;
  lastStageChangedBy?: mongoose.Types.ObjectId;
  lastStageChangedAt?: Date;
  previousStage?: string;
  ghostAlertSent?: boolean;
  lastGhostAlertSentAt?: Date;
  isGhost?: boolean;
  lastContactedAt?: Date;
  lastCalledAt?: Date;
  lastCallOutcome?: string;
  totalCalls: number;
  lostReason?: string;
  secondaryPhone?: string;
  address?: string;
  flatNo?: string;
  landmark?: string;
  area?: string;
  pincode?: string;
  secondAreaReference?: string;
  income?: string;
  occupation?: string;
  education?: string;
  dateOfVisit?: string;
  timeOfVisit?: string;
  mapLink?: string;
  hasMedeclaim?: boolean;
  sumAssured?: string;
  insuranceCompany?: string;
  healthSummary?: string;
  healthStatus?: {
    fit: boolean;
    bp: boolean;
    sugar: boolean;
    heart: boolean;
    kidney: boolean;
    liver: boolean;
  };
  familyAges?: {
    husband?: number;
    wife?: number;
    child1?: number;
    child2?: number;
    mother?: number;
    father?: number;
  };
  project_id?: mongoose.Types.ObjectId;
  budget?: string;
  preferred_location?: string;
  property_type?: string;
  preferred_configuration?: string;
  tseName?: string;
  tlName?: string;
  visitDate?: string;
  isReadByVisitor: boolean;
  readAt?: Date;
  jobTitle?: string;
  linkedinUrl?: string;
  companyDomain?: string;
  companySize?: string;
  companyRevenue?: string;
  region?: string;
  industry?: string;
  avatarUrl?: string;
  companyLogoUrl?: string;
  isEnriched?: boolean;
  enrichedAt?: Date;
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
      enum: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'closed_won', 'closed_lost', 'in_progress', 'negotiation'],
      default: 'new',
    },
    pipelineStage: {
      type: String,
      enum: ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost', 'closed_won', 'closed_lost', 'in_progress', 'negotiation'],
      default: 'new',
    },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User' },
    assignedAt: { type: Date },
    lastStageChangedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    lastStageChangedAt: { type: Date },
    previousStage: { type: String },
    ghostAlertSent: { type: Boolean, default: false },
    lastGhostAlertSentAt: { type: Date },
    isGhost: { type: Boolean, default: false },
    value: { type: Number },
    notes: { type: String },
    customFields: { type: Schema.Types.Mixed, default: {} },
    tags: { type: [String], default: [] },
    lastContactedAt: { type: Date },
    lastCalledAt: { type: Date, default: null },
    lastCallOutcome: { type: String, default: null },
    totalCalls: { type: Number, default: 0 },
    jobTitle: { type: String },
    linkedinUrl: { type: String },
    companyDomain: { type: String },
    companySize: { type: String },
    companyRevenue: { type: String },
    industry: { type: String, default: 'Home Loan / Housing Loan' },
    region: { type: String, trim: true },
    avatarUrl: { type: String },
    companyLogoUrl: { type: String },
    isEnriched: { type: Boolean, default: false },
    enrichedAt: { type: Date },
    lostReason: { type: String, default: null },
    secondaryPhone: { type: String, trim: true },
    address: { type: String, trim: true },
    flatNo: { type: String, trim: true },
    landmark: { type: String, trim: true },
    area: { type: String, trim: true },
    pincode: { type: String, trim: true },
    secondAreaReference: { type: String, trim: true },
    income: { type: String, trim: true },
    occupation: { type: String, trim: true },
    education: { type: String, trim: true },
    dateOfVisit: { type: String },
    timeOfVisit: { type: String },
    mapLink: { type: String, trim: true },
    hasMedeclaim: { type: Boolean, default: false },
    sumAssured: { type: String, trim: true },
    insuranceCompany: { type: String, trim: true },
    healthSummary: { type: String, trim: true },
    healthStatus: {
      fit: { type: Boolean, default: false },
      bp: { type: Boolean, default: false },
      sugar: { type: Boolean, default: false },
      heart: { type: Boolean, default: false },
      kidney: { type: Boolean, default: false },
      liver: { type: Boolean, default: false },
    },
    familyAges: {
      husband: { type: Number },
      wife: { type: Number },
      child1: { type: Number },
      child2: { type: Number },
      mother: { type: Number },
      father: { type: Number },
    },
    project_id: { type: Schema.Types.ObjectId, ref: 'Project' },
    budget: { type: String, trim: true },
    preferred_location: { type: String, trim: true },
    property_type: { type: String, trim: true },
    preferred_configuration: { type: String, trim: true },
    tseName: { type: String, trim: true },
    tlName: { type: String, trim: true },
    visitDate: { type: String },
    isReadByVisitor: { type: Boolean, default: false },
    readAt: { type: Date },
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
