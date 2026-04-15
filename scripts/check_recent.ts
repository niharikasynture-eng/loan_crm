import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { connectDB } from '../src/lib/db';
import CallLog from '../src/models/CallLog';
import Activity from '../src/models/Activity';

async function check() {
  await connectDB();
  
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  
  console.log('--- DATABASE INSPECTION (LAST 1 HOUR) ---');
  
  const logs = await CallLog.find({ createdAt: { $gte: oneHourAgo } })
    .populate('leadId', 'name phone')
    .lean();
    
  if (logs.length === 0) {
    console.log('❌ TOTAL ZERO CALL LOGS FOUND IN DATABASE FOR LAST 1 HOUR.');
  } else {
    console.log(`✅ FOUND ${logs.length} RECENT CALL LOGS:`);
    logs.forEach((log: any) => {
      console.log(`- Time: ${log.createdAt}, Lead: ${log.leadId?.name}, Phone: ${log.leadId?.phone}, syncId: ${log.syncId || 'NONE'}`);
    });
  }
  
  process.exit(0);
}

check();
