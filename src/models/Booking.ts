import mongoose, { Document, Schema, Model } from 'mongoose';

export interface IPaymentMilestone {
  _id?: string;
  name: string;
  amount: number;
  dueDate: Date;
  status: 'pending' | 'partially_paid' | 'paid' | 'overdue';
  paidAmount: number;
  paidDate?: Date | null;
}

export interface IBuyerDocument {
  _id?: string;
  name: string;
  status: 'pending' | 'uploaded' | 'verified';
  fileUrl?: string;
}

export interface IHandoverCheckitem {
  _id?: string;
  item: string;
  completed: boolean;
}

export interface IUpsellOpportunity {
  _id?: string;
  title: string;
  amount: number;
  status: 'identified' | 'pitched' | 'won' | 'lost';
  notes?: string;
  createdAt?: Date;
}

export interface IBooking extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  leadId: mongoose.Types.ObjectId;
  salesPersonId: mongoose.Types.ObjectId;
  dealId?: mongoose.Types.ObjectId;
  unitNumber: string; // Used as SAP Solution Package / Contract ID (e.g. "SAP S/4HANA Cloud - Enterprise Edition")
  projectName: string; // Used as Project Name (e.g. "Global ERP Modernization")
  totalAmount: number;
  bookingDate: Date;
  contractEndDate?: Date;
  renewalStatus?: 'active' | 'expiring_soon' | 'renewed' | 'churned';
  status: 'contract_signed' | 'advance_paid' | 'implementation_in_progress' | 'user_training' | 'ready_for_golive' | 'active_ams';
  paymentMilestones: IPaymentMilestone[];
  documents: IBuyerDocument[];
  homeLoanDetails?: {
    bankName?: string;
    sanctionAmount?: number;
    disbursedAmount?: number;
    status?: 'not_applied' | 'in_process' | 'sanctioned' | 'disbursed';
  };
  handoverChecklist: IHandoverCheckitem[];
  upsellOpportunities?: IUpsellOpportunity[];
  createdAt: Date;
  updatedAt: Date;
}

const BookingSchema = new Schema<IBooking>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    leadId: { type: Schema.Types.ObjectId, ref: 'Lead', required: true },
    salesPersonId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    dealId: { type: Schema.Types.ObjectId, ref: 'Deal' },
    unitNumber: { type: String, required: true },
    projectName: { type: String, default: 'SAP Enterprise ERP Implementation' },
    totalAmount: { type: Number, required: true, default: 0 },
    bookingDate: { type: Date, default: Date.now },
    contractEndDate: { type: Date },
    renewalStatus: {
      type: String,
      enum: ['active', 'expiring_soon', 'renewed', 'churned'],
      default: 'active',
    },
    status: {
      type: String,
      enum: ['contract_signed', 'advance_paid', 'implementation_in_progress', 'user_training', 'ready_for_golive', 'active_ams'],
      default: 'contract_signed',
    },
    paymentMilestones: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true },
        dueDate: { type: Date, required: true },
        status: {
          type: String,
          enum: ['pending', 'partially_paid', 'paid', 'overdue'],
          default: 'pending',
        },
        paidAmount: { type: Number, default: 0 },
        paidDate: { type: Date, default: null },
      },
    ],
    documents: [
      {
        name: { type: String, required: true },
        status: {
          type: String,
          enum: ['pending', 'uploaded', 'verified'],
          default: 'pending',
        },
        fileUrl: { type: String, default: '' },
      },
    ],
    handoverChecklist: [
      {
        item: { type: String, required: true },
        completed: { type: Boolean, default: false },
      },
    ],
    upsellOpportunities: [
      {
        title: { type: String, required: true },
        amount: { type: Number, required: true },
        status: {
          type: String,
          enum: ['identified', 'pitched', 'won', 'lost'],
          default: 'identified',
        },
        notes: { type: String, default: '' },
        createdAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }
);

BookingSchema.index({ organizationId: 1, leadId: 1 });

const Booking: Model<IBooking> =
  mongoose.models.Booking || mongoose.model<IBooking>('Booking', BookingSchema);

export default Booking;
