import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User';
import Organization from './src/models/Organization';

async function listAndResetOrgAdmins() {
  const uri = process.env.MONGODB_URI || 'mongodb://chinmaybelpatre_db_user:mPbSdJZln4dvmiGP@ac-n4eyjzn-shard-00-00.rivhc9u.mongodb.net:27017,ac-n4eyjzn-shard-00-01.rivhc9u.mongodb.net:27017,ac-n4eyjzn-shard-00-02.rivhc9u.mongodb.net:27017/?ssl=true&replicaSet=atlas-j7am4w-shard-0&authSource=admin&appName=Cluster0';
  await mongoose.connect(uri);

  const _o = Organization; // touch model
  const orgAdmins = await User.find({ role: { $in: ['org_admin', 'super_admin'] } }).populate('organizationId', 'name slug status');

  const salt = await bcrypt.genSalt(10);
  const newPassHash = await bcrypt.hash('password123', salt);

  console.log('--- ALL ORG ADMIN ACCOUNTS IN DATABASE ---');
  for (const admin of orgAdmins) {
    // Reset password to password123 (pre-save hook will hash it once)
    admin.password = 'password123';
    admin.isActive = true; // Ensure account is active
    await admin.save();

    console.log({
      name: admin.name,
      email: admin.email,
      role: admin.role,
      organization: (admin.organizationId as any)?.name || 'Platform Admin',
      orgSlug: (admin.organizationId as any)?.slug || 'salescrm-platform',
      orgStatus: (admin.organizationId as any)?.status || 'approved',
      resetPassword: 'password123',
    });
  }

  process.exit();
}

listAndResetOrgAdmins();
