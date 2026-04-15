import mongoose, { Document, Schema, Model } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  organizationId: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password: string;
  role: 'super_admin' | 'org_admin' | 'manager' | 'sales_agent' | 'onsite_visitor';
  managerId?: mongoose.Types.ObjectId;
  phone?: string;
  avatar?: string;
  isActive: boolean;
  inviteToken?: string;
  inviteExpiry?: Date;
  passwordSetToken?: string;
  passwordSetExpiry?: Date;
  callSyncToken?: string;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: 'Organization',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['super_admin', 'org_admin', 'manager', 'sales_agent', 'onsite_visitor'],
      default: 'sales_agent',
    },
    managerId: { type: Schema.Types.ObjectId, ref: 'User' },
    phone: { type: String },
    avatar: { type: String },
    isActive: { type: Boolean, default: true },
    inviteToken: { type: String },
    inviteExpiry: { type: Date },
    passwordSetToken: { type: String, index: true },
    passwordSetExpiry: { type: Date },
    callSyncToken: { type: String, index: true },
    lastLogin: { type: Date },
  },
  { timestamps: true }
);

UserSchema.index({ email: 1, organizationId: 1 }, { unique: true });
UserSchema.index({ organizationId: 1, role: 1 });

UserSchema.pre('save', async function () {
  // Hash password
  if (this.isModified('password')) {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
  }

  // Auto-generate call sync token if missing
  if (!this.callSyncToken) {
    this.callSyncToken = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  }
});


UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

const User: Model<IUser> =
  mongoose.models.User || mongoose.model<IUser>('User', UserSchema);

export default User;
