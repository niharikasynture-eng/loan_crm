import mongoose, { Document, Schema, Model } from 'mongoose';

export type NotificationType =
  | 'new_org_request'
  | 'org_approved'
  | 'org_rejected'
  | 'new_lead'
  | 'lead_assigned'
  | 'sla_breach'
  | 'task_due'
  | 'deal_stale'
  | 'system';

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  organizationId?: mongoose.Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  link?: string;
  createdAt: Date;
  updatedAt: Date;
}

const NotificationSchema = new Schema<INotification>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    type: {
      type: String,
      enum: ['new_org_request', 'org_approved', 'org_rejected', 'new_lead', 'lead_assigned', 'sla_breach', 'task_due', 'deal_stale', 'system'],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    read: { type: Boolean, default: false, index: true },
    link: { type: String },
  },
  { timestamps: true }
);

NotificationSchema.index({ userId: 1, read: 1, createdAt: -1 });

const Notification: Model<INotification> =
  mongoose.models.Notification || mongoose.model<INotification>('Notification', NotificationSchema);

export default Notification;
