import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: '.env.local' });

const MONGODB_URI = process.env.MONGODB_URI as string;
if (!MONGODB_URI) throw new Error('MONGODB_URI missing');

const orgSchema = new mongoose.Schema({
  name: String, slug: String, email: String, subscription: String,
  timezone: String, currency: String, isActive: Boolean,
  status: { type: String, default: 'approved' },
  leadFormToken: { type: String, default: () => uuidv4() },
  createdAt: Date,
});

const userSchema = new mongoose.Schema({
  organizationId: mongoose.Schema.Types.ObjectId,
  name: String, email: String, password: String, role: String, isActive: Boolean, createdAt: Date,
});

const leadSchema = new mongoose.Schema({
  organizationId: mongoose.Schema.Types.ObjectId,
  name: String, email: String, phone: String, company: String,
  source: String, status: String, assignedTo: mongoose.Schema.Types.ObjectId,
  createdBy: mongoose.Schema.Types.ObjectId, createdAt: Date,
});

const dealSchema = new mongoose.Schema({
  organizationId: mongoose.Schema.Types.ObjectId,
  leadId: mongoose.Schema.Types.ObjectId,
  title: String, value: Number, stage: String,
  assignedTo: mongoose.Schema.Types.ObjectId,
  createdBy: mongoose.Schema.Types.ObjectId, position: Number, createdAt: Date,
});

const taskSchema = new mongoose.Schema({
  organizationId: mongoose.Schema.Types.ObjectId,
  leadId: mongoose.Schema.Types.ObjectId,
  title: String, dueDate: Date, priority: String, status: String,
  assignedTo: mongoose.Schema.Types.ObjectId,
  createdBy: mongoose.Schema.Types.ObjectId, createdAt: Date,
});

const activitySchema = new mongoose.Schema({
  organizationId: mongoose.Schema.Types.ObjectId,
  leadId: mongoose.Schema.Types.ObjectId,
  type: String, notes: String,
  createdBy: mongoose.Schema.Types.ObjectId, createdAt: Date,
});

const Org = mongoose.models.Organization || mongoose.model('Organization', orgSchema);
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Lead = mongoose.models.Lead || mongoose.model('Lead', leadSchema);
const Deal = mongoose.models.Deal || mongoose.model('Deal', dealSchema);
const TaskItem = mongoose.models.Task || mongoose.model('Task', taskSchema);
const Activity = mongoose.models.Activity || mongoose.model('Activity', activitySchema);

async function seed() {
  console.log('Connecting to database...');
  await mongoose.connect(MONGODB_URI);
  console.log('Connected.');

  console.log('Clearing database...');
  await Promise.all([
    Org.deleteMany({}), User.deleteMany({}), Lead.deleteMany({}),
    Deal.deleteMany({}), TaskItem.deleteMany({}), Activity.deleteMany({})
  ]);

  const salt = await bcrypt.genSalt(10);

  // ──────────────────────────────────────────────
  // Platform Organization (for super_admin)
  // ──────────────────────────────────────────────
  console.log('Seeding Platform Org + Super Admin...');
  const platformOrg = await Org.create({
    name: 'SalesCRM Platform', slug: 'salescrm-platform',
    email: 'admin@salescrm.com', subscription: 'enterprise',
    timezone: 'UTC', currency: 'USD', isActive: true, status: 'approved',
    createdAt: new Date(),
  });

  const superAdminPass = await bcrypt.hash('Admin@123', salt);
  await User.create({
    organizationId: platformOrg._id, name: 'Super Admin',
    email: 'admin@salescrm.com', password: superAdminPass,
    role: 'super_admin', isActive: true, createdAt: new Date()
  });

  // ──────────────────────────────────────────────
  // Demo Organizations
  // ──────────────────────────────────────────────
  console.log('Seeding Demo Organizations...');
  const acmeToken = uuidv4();
  const org1 = await Org.create({
    name: 'Acme Corp', slug: 'acme-corp', email: 'admin@acme.com',
    subscription: 'pro', timezone: 'UTC', currency: 'USD',
    isActive: true, status: 'approved', leadFormToken: acmeToken,
    createdAt: new Date()
  });

  const techToken = uuidv4();
  const org2 = await Org.create({
    name: 'TechFlow', slug: 'techflow', email: 'hello@techflow.io',
    subscription: 'starter', timezone: 'America/New_York', currency: 'USD',
    isActive: true, status: 'approved', leadFormToken: techToken,
    createdAt: new Date()
  });

  // ──────────────────────────────────────────────
  // Demo Users
  // ──────────────────────────────────────────────
  console.log('Seeding Demo Users...');
  const demoPass = await bcrypt.hash('password123', salt);

  const acmeAdmin = await User.create({
    organizationId: org1._id, name: 'John Acme', email: 'john@acme.com',
    password: demoPass, role: 'org_admin', isActive: true, createdAt: new Date()
  });

  const acmeManager = await User.create({
    organizationId: org1._id, name: 'Mike Manager', email: 'mike@acme.com',
    password: demoPass, role: 'manager', isActive: true, createdAt: new Date()
  });

  const acmeAgent = await User.create({
    organizationId: org1._id, name: 'Sarah Sales', email: 'sarah@acme.com',
    password: demoPass, role: 'sales_agent', isActive: true, createdAt: new Date()
  });

  await User.create({
    organizationId: org2._id, name: 'Tech Admin', email: 'admin@techflow.io',
    password: demoPass, role: 'org_admin', isActive: true, createdAt: new Date()
  });

  // ──────────────────────────────────────────────
  // Demo Leads
  // ──────────────────────────────────────────────
  console.log('Seeding Leads...');
  const leads = await Lead.insertMany([
    {
      organizationId: org1._id, name: 'Elon Musk', email: 'elon@tesla.com', phone: '555-0100',
      company: 'Tesla', source: 'Website', status: 'new',
      assignedTo: acmeAgent._id, createdBy: acmeAdmin._id, createdAt: new Date()
    },
    {
      organizationId: org1._id, name: 'Tim Cook', email: 'tim@apple.com', phone: '555-0200',
      company: 'Apple', source: 'Referral', status: 'contacted',
      assignedTo: acmeAgent._id, createdBy: acmeAdmin._id, createdAt: new Date(Date.now() - 86400000)
    },
    {
      organizationId: org1._id, name: 'Satya Nadella', email: 'satya@microsoft.com', phone: '555-0300',
      company: 'Microsoft', source: 'Cold Call', status: 'qualified',
      assignedTo: acmeManager._id, createdBy: acmeAdmin._id, createdAt: new Date(Date.now() - 172800000)
    },
    {
      organizationId: org1._id, name: 'Sundar Pichai', email: 'sundar@google.com', phone: '555-0400',
      company: 'Google', source: 'Website', status: 'won',
      assignedTo: acmeAgent._id, createdBy: acmeAdmin._id, createdAt: new Date(Date.now() - 259200000)
    }
  ]);

  // Deals
  console.log('Seeding Deals...');
  await Deal.insertMany([
    {
      organizationId: org1._id, leadId: leads[2]._id, title: 'Enterprise License - MSFT',
      value: 50000, stage: 'negotiation', assignedTo: acmeManager._id, createdBy: acmeAdmin._id,
      position: 0, createdAt: new Date()
    },
    {
      organizationId: org1._id, leadId: leads[3]._id, title: 'Cloud Infrastructure Upgrade',
      value: 120000, stage: 'closed_won', assignedTo: acmeAgent._id, createdBy: acmeAdmin._id,
      position: 0, createdAt: new Date(Date.now() - 50000000)
    }
  ]);

  // Tasks
  console.log('Seeding Tasks...');
  await TaskItem.insertMany([
    {
      organizationId: org1._id, leadId: leads[0]._id, title: 'Follow up on pricing email',
      dueDate: new Date(Date.now() + 86400000), priority: 'high', status: 'pending',
      assignedTo: acmeAgent._id, createdBy: acmeAdmin._id, createdAt: new Date()
    },
    {
      organizationId: org1._id, leadId: leads[2]._id, title: 'Prepare contract draft',
      dueDate: new Date(Date.now() + 172800000), priority: 'medium', status: 'pending',
      assignedTo: acmeManager._id, createdBy: acmeAdmin._id, createdAt: new Date()
    }
  ]);

  // Activities
  console.log('Seeding Activities...');
  await Activity.insertMany([
    {
      organizationId: org1._id, leadId: leads[1]._id, type: 'call',
      notes: 'Discussed Q3 hardware requirements. Interested but needs a better discount.',
      createdBy: acmeAgent._id, createdAt: new Date(Date.now() - 3600000)
    },
    {
      organizationId: org1._id, leadId: leads[2]._id, type: 'meeting',
      notes: 'Initial negotiation went well. Need to follow up with technical specs.',
      createdBy: acmeManager._id, createdAt: new Date(Date.now() - 7200000)
    }
  ]);

  console.log('\n✅ Seed completed successfully!');
  console.log('══════════════════════════════════════════════════════');
  console.log('🔐 SUPER ADMIN:  admin@salescrm.com  /  Admin@123');
  console.log('──────────────────────────────────────────────────────');
  console.log('🏢 ACME CORP:');
  console.log('   Org Admin:    john@acme.com  /  password123');
  console.log('   Manager:      mike@acme.com  /  password123');
  console.log('   Sales Agent:  sarah@acme.com /  password123');
  console.log('──────────────────────────────────────────────────────');
  console.log('🏢 TECHFLOW:');
  console.log('   Org Admin:    admin@techflow.io / password123');
  console.log('──────────────────────────────────────────────────────');
  console.log(`📋 Acme Lead Form: /public/${acmeToken}`);
  console.log(`📋 TechFlow Lead Form: /public/${techToken}`);
  console.log('══════════════════════════════════════════════════════');

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch(err => {
  console.error('Seed error:', err);
  process.exit(1);
});
