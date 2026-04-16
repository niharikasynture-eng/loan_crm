import { connectDB } from '../src/lib/db';
import User from '../src/models/User';
import CallLog from '../src/models/CallLog';
import Activity from '../src/models/Activity';
import mongoose from 'mongoose';

async function checkDB() {
  await connectDB();
  const user = await User.findOne({ name: 'Mayur Shinde' });
  if (!user) { console.log('user not found'); return; }

  const logs = await CallLog.find({ salesPersonId: user._id })
                             .sort({ createdAt: -1 })
                             .limit(5);
  console.log('--- LATEST 5 CALL LOGS ---');
  for (const log of logs) {
      console.log(`[CallLog] ID: ${log._id}, Duration: ${log.duration}, syncId: ${log.syncId}, notes: ${log.notes}, status: ${log.status}`);
  }

  const activities = await Activity.find({ createdBy: user._id })
                             .sort({ createdAt: -1 })
                             .limit(5);
  console.log('--- LATEST 5 ACTIVITIES ---');
  for (const act of activities) {
      console.log(`[Activity] ID: ${act._id}, Duration: ${act.duration}, syncId: ${act.syncId}, notes: ${act.notes}`);
  }

  process.exit(0);
}

checkDB().catch(console.error);
