import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ISiteVisit extends Document {
  organizationId: mongoose.Types.ObjectId;
  lead_id: mongoose.Types.ObjectId;
  project_id: mongoose.Types.ObjectId;
  sales_user_id: mongoose.Types.ObjectId;
  visit_date: Date;
  visit_time: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled' | 'Rescheduled';
  remarks?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SiteVisitSchema = new Schema<ISiteVisit>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    lead_id: {
      type: Schema.Types.ObjectId,
      ref: 'Lead',
      required: true,
      index: true,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    sales_user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    visit_date: { type: Date, required: true },
    visit_time: { type: String, required: true },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled'],
      default: 'Scheduled',
    },
    remarks: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

SiteVisitSchema.index({ organizationId: 1, visit_date: 1 });

const SiteVisit: Model<ISiteVisit> =
  mongoose.models.SiteVisit ||
  mongoose.model<ISiteVisit>('SiteVisit', SiteVisitSchema);

export default SiteVisit;
