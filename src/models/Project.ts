import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IProject extends Document {
  organizationId: mongoose.Types.ObjectId;
  name: string;
  location: string;
  type: string;
  description?: string;
  rera_number?: string;
  possession_date?: Date;
  status: 'upcoming' | 'ongoing' | 'completed';
  images: string[];
  brochure?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const ProjectSchema = new Schema<IProject>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    location: { type: String, required: true, trim: true },
    type: { type: String, required: true, trim: true },
    description: { type: String, trim: true },
    rera_number: { type: String, trim: true },
    possession_date: { type: Date },
    status: {
      type: String,
      enum: ['upcoming', 'ongoing', 'completed'],
      default: 'ongoing',
    },
    images: { type: [String], default: [] },
    brochure: { type: String },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

ProjectSchema.index({ organizationId: 1, name: 1 });

const Project: Model<IProject> =
  mongoose.models.Project || mongoose.model<IProject>('Project', ProjectSchema);

export default Project;
