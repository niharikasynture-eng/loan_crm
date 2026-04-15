import { connectDB } from '../src/lib/db';
import CallLog from '../src/models/CallLog';
import Activity from '../src/models/Activity';
import mongoose from 'mongoose';

async function check() {
  await connectDB();
  
  console.log('--- CHECKING DATABASE FOR SYNCED CALLS ---');
  
  const logs = await CallLog.find({ syncId: { $ne: null } })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate('leadId', 'name')
    .lean();
    
  if (logs.length === 0) {
    console.log('❌ NO SYNCED LOGS FOUND IN DATABASE.');
  } else {
    console.log(`✅ FOUND ${logs.length} SYNCED LOGS:`);
    logs.forEach((log: any) => {
      console.log(`- Lead: ${log.leadId?.name}, Duration: ${log.duration}s, ID: ${log.syncId}`);
    });
  }
  
  process.exit(0);
}

check();
