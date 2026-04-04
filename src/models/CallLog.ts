import mongoose, { Document, Schema, Model } from 'mongoose';

export interface ICallLog extends Document {
  _id: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  salesPersonId: mongoose.Types.ObjectId;
  status: 'initiated' | 'completed' | 'missed';
  outcome?: 'interested' | 'not-interested' | 'callback' | 'no-answer' | 'busy' | 'wrong-number' | null;
  duration?: number;
  connectedDuration?: number;
  notes?: string;
  nextFollowUpDate?: Date | null;
  startedAt: Date;
  endedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  orgId?: string;
  recordingUrl?: string;
  twilioCallSid?: string;
}

const CallLogSchema = new Schema<ICallLog>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    salesPersonId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    status: {
      type: String,
      enum: ['initiated', 'completed', 'missed'],
      default: 'initiated',
    },
    outcome: {
      type: String,
      enum: ['interested', 'not-interested', 'callback', 'no-answer', 'busy', 'wrong-number'],
      default: null,
    },
    duration: { type: Number, default: 0 },
    connectedDuration: { type: Number, default: 0 },
    notes: { type: String, default: '' },
    nextFollowUpDate: { type: Date, default: null },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
    orgId: { type: String },
    recordingUrl: { type: String },
    twilioCallSid: { type: String },
  },
  { timestamps: true }
);

CallLogSchema.index({ leadId: 1, startedAt: -1 });
CallLogSchema.index({ organizationId: 1, salesPersonId: 1 });

const CallLog: Model<ICallLog> =
  mongoose.models.CallLog || mongoose.model<ICallLog>('CallLog', CallLogSchema);

export default CallLog;
