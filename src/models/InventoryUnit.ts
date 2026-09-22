import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IInventoryUnit extends Document {
  organizationId: mongoose.Types.ObjectId;
  project_id?: mongoose.Types.ObjectId;
  name?: string;
  sku?: string;
  category?: string;
  stockQuantity: number;
  availableQuantity?: number;
  minStockAlert?: number;
  unit?: string;
  description?: string;
  tower?: string;
  floor?: string;
  flat_number?: string;
  area?: number;
  price?: number;
  status: 'Available' | 'Low Stock' | 'Out of Stock' | 'Discontinued' | 'Blocked' | 'Booked' | 'Sold';
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
      index: true,
    },
    name: { type: String, trim: true },
    sku: { type: String, trim: true },
    category: { type: String, trim: true, default: 'General' },
    stockQuantity: { type: Number, default: 0 },
    availableQuantity: { type: Number, default: 0 },
    minStockAlert: { type: Number, default: 5 },
    unit: { type: String, default: 'units' },
    description: { type: String, trim: true },
    tower: { type: String, trim: true },
    floor: { type: String, trim: true },
    flat_number: { type: String, trim: true },
    area: { type: Number },
    price: { type: Number },
    status: {
      type: String,
      enum: ['Available', 'Low Stock', 'Out of Stock', 'Discontinued', 'Blocked', 'Booked', 'Sold'],
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

InventoryUnitSchema.index({ organizationId: 1, sku: 1 });
InventoryUnitSchema.index({ project_id: 1, status: 1 });

if (process.env.NODE_ENV === 'development' && mongoose.models.InventoryUnit) {
  delete (mongoose.models as any).InventoryUnit;
}

const InventoryUnit: Model<IInventoryUnit> =
  mongoose.models.InventoryUnit ||
  mongoose.model<IInventoryUnit>('InventoryUnit', InventoryUnitSchema);

export default InventoryUnit;
