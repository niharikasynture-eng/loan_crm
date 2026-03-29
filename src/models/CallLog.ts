import mongoose, { Document, Schema, Model } from 'mongoose';

export type CallStatus = 'initiated' | 'ringing' | 'in-progress' | 'completed' | 'no-answer' | 'busy' | 'failed';
export type CallOutcome = 'interested' | 'not-interested' | 'callback' | 'no-answer' | 'busy' | 'wrong-number' | null;

export interface ICallLog extends Document {
  _id: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  orgId: mongoose.Types.ObjectId;
  salesPersonId: mongoose.Types.ObjectId;
  twilioCallSid: string;
  status: CallStatus;
  outcome: CallOutcome;
  duration: number;
  recordingUrl?: string | null;
  notes: string;
  nextFollowUpDate?: Date | null;
  startedAt: Date;
  endedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const CallLogSchema = new Schema<ICallLog>(
  {
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true, index: true },
    orgId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    salesPersonId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    twilioCallSid: { type: String, required: true, unique: true, index: true },
    status: {
      type: String,
      enum: ['initiated', 'ringing', 'in-progress', 'completed', 'no-answer', 'busy', 'failed'],
      default: 'initiated',
    },
    outcome: {
      type: String,
      enum: ['interested', 'not-interested', 'callback', 'no-answer', 'busy', 'wrong-number'],
      default: null,
    },
    duration: { type: Number, default: 0 },
    recordingUrl: { type: String, default: null },
    notes: { type: String, default: '' },
    nextFollowUpDate: { type: Date, default: null },
    startedAt: { type: Date, default: Date.now },
    endedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const CallLog: Model<ICallLog> =
  mongoose.models.CallLog || mongoose.model<ICallLog>('CallLog', CallLogSchema);

export default CallLog;
