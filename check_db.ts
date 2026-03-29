import mongoose from 'mongoose';
import User from './src/models/User';

async function checkUser() {
  const uri = 'mongodb+srv://chinmaybelpatre_db_user:mPbSdJZln4dvmiGP@cluster0.rivhc9u.mongodb.net/?appName=Cluster0';
  await mongoose.connect(uri);
  const users = await User.find({ phone: { $exists: true, $ne: null } });
  console.log('Users with phone numbers:', users.map(u => ({ email: u.email, phone: u.phone })));
  process.exit();
}

checkUser();
