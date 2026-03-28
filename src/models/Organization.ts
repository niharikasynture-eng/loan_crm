import mongoose, { Document, Schema, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

export type OrgStatus = 'pending' | 'approved' | 'rejected' | 'active' | 'inactive' | 'deleted';

export interface IOrganization extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  slug: string;
  email: string;
  phone?: string;
  website?: string;
  timezone: string;
  currency: string;
  isActive: boolean;
  status: OrgStatus;
  approvedBy?: mongoose.Types.ObjectId;
  approvedAt?: Date;
  rejectionReason?: string;
  leadFormToken: string;
  subscription: 'free' | 'starter' | 'pro' | 'enterprise';
  subscriptionExpiry?: Date;
  settings: {
    leadSources: string[];
    customFields: Array<{ name: string; type: string; required: boolean }>;
  };
  createdAt: Date;
  updatedAt: Date;
}

const OrganizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String },
    website: { type: String },
    timezone: { type: String, default: 'UTC' },
    currency: { type: String, default: 'USD' },
    isActive: { type: Boolean, default: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'active', 'inactive', 'deleted'],
      default: 'pending',
      index: true,
    },
    approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date },
    rejectionReason: { type: String },
    leadFormToken: { type: String, default: () => uuidv4(), unique: true },
    subscription: {
      type: String,
      enum: ['free', 'starter', 'pro', 'enterprise'],
      default: 'free',
    },
    subscriptionExpiry: { type: Date },
    settings: {
      leadSources: { type: [String], default: ['Website', 'Referral', 'Cold Call', 'Social Media', 'Email Campaign', 'Other'] },
      customFields: {
        type: [{ name: String, type: String, required: Boolean }],
        default: [],
      },
    },
  },
  { timestamps: true }
);

OrganizationSchema.index({ email: 1 });

const Organization: Model<IOrganization> =
  mongoose.models.Organization ||
  mongoose.model<IOrganization>('Organization', OrganizationSchema);

export default Organization;
