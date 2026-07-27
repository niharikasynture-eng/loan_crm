import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IBooking extends Document {
  organizationId: mongoose.Types.ObjectId;
  lead_id: mongoose.Types.ObjectId;
  inventory_id: mongoose.Types.ObjectId;
  booking_amount: number;
  booking_date: Date;
  booking_status: 'Pending' | 'Approved' | 'Cancelled';
  approved_by?: mongoose.Types.ObjectId;
  notes?: string;
  createdBy: mongoose.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
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
    },
    inventory_id: {
      type: Schema.Types.ObjectId,
      ref: 'InventoryUnit',
      required: true,
    },
    booking_amount: { type: Number, required: true },
    booking_date: { type: Date, required: true },
    booking_status: {
      type: String,
      enum: ['Pending', 'Approved', 'Cancelled'],
      default: 'Pending',
    },
    approved_by: { type: Schema.Types.ObjectId, ref: 'User' },
    notes: { type: String, trim: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true }
);

BookingSchema.index({ organizationId: 1, booking_status: 1 });

const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;
