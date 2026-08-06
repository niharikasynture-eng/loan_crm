import mongoose from 'mongoose';
import Organization from './src/models/Organization';
import User from './src/models/User';

async function checkUsers() {
  const uri = process.env.MONGODB_URI || 'mongodb://chinmaybelpatre_db_user:mPbSdJZln4dvmiGP@ac-n4eyjzn-shard-00-00.rivhc9u.mongodb.net:27017,ac-n4eyjzn-shard-00-01.rivhc9u.mongodb.net:27017,ac-n4eyjzn-shard-00-02.rivhc9u.mongodb.net:27017/?ssl=true&replicaSet=atlas-j7am4w-shard-0&authSource=admin&appName=Cluster0';
  await mongoose.connect(uri);
  const _u = User;
  const _o = Organization;
  const users = await User.find({}).populate('organizationId', 'name slug status');
  console.log('--- USERS IN DATABASE ---');
  console.log(users.map(u => ({
    name: u.name,
    email: u.email,
    role: u.role,
    isActive: u.isActive,
    orgName: (u.organizationId as any)?.name || 'None',
    orgSlug: (u.organizationId as any)?.slug || 'None',
  })));
  process.exit();
}

checkUsers();
