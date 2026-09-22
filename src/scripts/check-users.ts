import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI as string;

const userSchema = new mongoose.Schema({
  organizationId: mongoose.Schema.Types.ObjectId,
  name: String, email: String, password: String, role: String, isActive: Boolean, createdAt: Date,
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

async function checkAndFix() {
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to DB');

  const users = await User.find({});
  console.log('Users found:', users.map(u => `${u.email} - ${u.role}`));

  // 1. Upgrade harladunkar
  const harlaUser = users.find(u => u.email && u.email.includes('harla'));
  if (harlaUser) {
    if (harlaUser.role !== 'org_admin' && harlaUser.role !== 'super_admin') {
      harlaUser.role = 'org_admin';
      await harlaUser.save();
      console.log(`Upgraded ${harlaUser.email} to org_admin!`);
    } else {
      console.log(`${harlaUser.email} is already ${harlaUser.role}`);
    }
  }

  // 2. Create operator if not exists
  const operatorExists = users.find(u => u.email === 'operator@acme.com');
  if (!operatorExists) {
    // find any org id
    const anyOrgId = harlaUser ? harlaUser.organizationId : (users[0] ? users[0].organizationId : new mongoose.Types.ObjectId());
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);
    await User.create({
      organizationId: anyOrgId,
      name: 'Oliver Operator',
      email: 'operator@acme.com',
      password: passwordHash,
      role: 'operator',
      isActive: true,
      createdAt: new Date()
    });
    console.log('Created Operator: operator@acme.com / password123');
  } else {
    console.log('Operator already exists: operator@acme.com / password123');
  }

  await mongoose.disconnect();
}

checkAndFix().catch(console.error);
