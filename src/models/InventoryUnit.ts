import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IInventoryUnit extends Document {
  organizationId: mongoose.Types.ObjectId;
  project_id: mongoose.Types.ObjectId;
  tower?: string;
  floor?: string;
  flat_number: string;
  area?: number;
  price?: number;
  status: 'Available' | 'Blocked' | 'Booked' | 'Sold';
  facing?: string;
  bedrooms?: number;
  bathrooms?: number;
  parking?: boolean;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const InventoryUnitSchema = new Schema<IInventoryUnit>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
      index: true,
    },
    project_id: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
      index: true,
    },
    tower: { type: String, trim: true },
    floor: { type: String, trim: true },
    flat_number: { type: String, required: true, trim: true },
    area: { type: Number },
    price: { type: Number },
    status: {
      type: String,
      enum: ['Available', 'Blocked', 'Booked', 'Sold'],
      default: 'Available',
    },
    facing: { type: String, trim: true },
    bedrooms: { type: Number },
    bathrooms: { type: Number },
    parking: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

InventoryUnitSchema.index({ project_id: 1, status: 1 });

const InventoryUnit: Model<IInventoryUnit> =
  mongoose.models.InventoryUnit ||
  mongoose.model<IInventoryUnit>('InventoryUnit', InventoryUnitSchema);

export default InventoryUnit;
