import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import User from './src/models/User';

async function resetPassword() {
  const uri = process.env.MONGODB_URI || 'mongodb://chinmaybelpatre_db_user:mPbSdJZln4dvmiGP@ac-n4eyjzn-shard-00-00.rivhc9u.mongodb.net:27017,ac-n4eyjzn-shard-00-01.rivhc9u.mongodb.net:27017,ac-n4eyjzn-shard-00-02.rivhc9u.mongodb.net:27017/?ssl=true&replicaSet=atlas-j7am4w-shard-0&authSource=admin&appName=Cluster0';
  await mongoose.connect(uri);

  const salt = await bcrypt.genSalt(10);
  const newHash = await bcrypt.hash('123456789', salt);

  const emailsToReset = [
    'harshladukar@gmail.com',
    'sarthak@gmail.com',
    'salesadmin@gmail.com',
    'admin@salescrm.com',
  ];

  for (const email of emailsToReset) {
    const user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      await User.updateOne(
        { _id: user._id },
        { $set: { password: newHash, isActive: true } }
      );
      console.log(`✅ Password DIRECTLY updated for ${email} to "123456789"`);
    } else {
      console.log(`⚠️ User ${email} not found`);
    }
  }

  process.exit();
}

resetPassword();
