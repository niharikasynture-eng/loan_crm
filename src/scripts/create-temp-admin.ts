import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User';
import Organization from '../models/Organization';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

async function createTempAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
    console.log('Connected to DB');

    let org = await Organization.findOne();
    if (!org) {
      org = await Organization.create({
        name: 'Default Org',
        slug: 'default-org',
        email: 'info@defaultorg.com',
        status: 'active'
      });
    }

    const email = 'adminlogin@test.com';
    const password = '123456789';

    // Check if exists and delete
    await User.deleteOne({ email: 'adminlogin@.com' });
    await User.deleteOne({ email });

    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 3);

    const user = await User.create({
      organizationId: org._id,
      name: 'Temporary Admin',
      email,
      password,
      role: 'org_admin',
      isActive: true,
      accountExpiry: expiryDate,
    });

    console.log('\n--- TEMPORARY ORG ADMIN CREATED ---');
    console.log('Email:', email);
    console.log('Password:', password);
    console.log('Role:', user.role);
    console.log('Organization:', org.name);
    console.log('Expires at:', user.accountExpiry);
    console.log('-----------------------------------\n');

  } catch (error) {
    console.error('Error creating user:', error);
  } finally {
    await mongoose.disconnect();
  }
}

createTempAdmin();
