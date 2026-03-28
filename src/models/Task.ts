import mongoose, { Document, Schema, Model } from 'mongoose';

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface ITask extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  leadId?: mongoose.Types.ObjectId;
  dealId?: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date;
  assignedTo: mongoose.Types.ObjectId;
  createdBy: mongoose.Types.ObjectId;
  completedAt?: Date;
  reminderSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const TaskSchema = new Schema<ITask>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', index: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal', index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    status: {
      type: String,
      enum: ['pending', 'in_progress', 'completed', 'overdue'],
      default: 'pending',
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      default: 'medium',
    },
    dueDate: { type: Date, required: true },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
    completedAt: { type: Date },
    reminderSentAt: { type: Date },
  },
  { timestamps: true }
);

TaskSchema.index({ organizationId: 1, assignedTo: 1, status: 1 });
TaskSchema.index({ organizationId: 1, dueDate: 1 });

const Task: Model<ITask> =
  mongoose.models.Task || mongoose.model<ITask>('Task', TaskSchema);

export default Task;
