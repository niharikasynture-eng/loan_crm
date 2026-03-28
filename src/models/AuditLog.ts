import mongoose, { Document, Schema, Model } from 'mongoose';

export type AuditAction =
  | 'org_approved'
  | 'org_rejected'
  | 'org_activated'
  | 'org_deactivated'
  | 'org_deleted'
  | 'user_created'
  | 'user_updated'
  | 'user_deactivated'
  | 'lead_created'
  | 'lead_assigned'
  | 'lead_status_changed'
  | 'password_set';

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  action: AuditAction;
  performedBy: mongoose.Types.ObjectId;
  targetId?: mongoose.Types.ObjectId;
  targetType?: string;
  organizationId?: mongoose.Types.ObjectId;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true, index: true },
    performedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    targetId: { type: Schema.Types.ObjectId },
    targetType: { type: String },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', index: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);

AuditLogSchema.index({ organizationId: 1, action: 1, createdAt: -1 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>('AuditLog', AuditLogSchema);

export default AuditLog;
