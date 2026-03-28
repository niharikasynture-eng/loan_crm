import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPipeline extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  stages: Array<{
    name: string;
    order: number;
    probability: number;
  }>;
  isDefault: boolean;
  createdBy: mongoose.Types.ObjectId;
}

const PipelineSchema = new Schema<IPipeline>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true, index: true },
    name: { type: String, required: true, trim: true },
    stages: {
      type: [
        {
          name: String,
          order: Number,
          probability: { type: Number, default: 50 },
        },
      ],
      default: [
        { name: 'New', order: 0, probability: 10 },
        { name: 'In Progress', order: 1, probability: 30 },
        { name: 'Negotiation', order: 2, probability: 70 },
        { name: 'Closed Won', order: 3, probability: 100 },
        { name: 'Closed Lost', order: 4, probability: 0 },
      ],
    },
    isDefault: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

const Pipeline: Model<IPipeline> =
  mongoose.models.Pipeline || mongoose.model<IPipeline>('Pipeline', PipelineSchema);

export default Pipeline;
