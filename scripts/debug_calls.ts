import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { connectDB } from '../src/lib/db';
import User from '../src/models/User';
import Lead from '../src/models/Lead';
import CallLog from '../src/models/CallLog';
import Activity from '../src/models/Activity';

async function check() {
  try {
    await connectDB();
    
    // Explicitly reference models to prevent compiler tree-shaking
    console.log("Registered models for debug:", [
      User.modelName,
      Lead.modelName,
      CallLog.modelName,
      Activity.modelName
    ]);
    
    // Fetch last 15 call activities
    const activities = await Activity.find({ type: 'call' })
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('leadId', 'name phone')
      .populate('createdBy', 'name email')
      .lean();

    console.log('\x1b[36m%s\x1b[0m', '--- 📞 LAST 15 ACTIVITIES (CALLS) IN DATABASE ---');
    
    if (activities.length === 0) {
      console.log('No call activities found.');
    } else {
      activities.forEach((a: any) => {
        const leadName = a.leadId?.name || 'Unknown Lead';
        const phone = a.leadId?.phone || 'No Phone';
        const creatorName = a.createdBy?.name || 'Unknown Creator';
        const duration = a.duration || 0;
        const syncId = a.syncId || 'NONE (Manual)';
        const date = a.createdAt;
        
        console.log(`- Lead: ${leadName} (${phone}), Duration: ${duration}s, SyncID: ${syncId}, CreatedBy: ${creatorName}, Date: ${date.toLocaleString()}`);
      });
    }

    // Fetch last 15 call logs
    const callLogs = await CallLog.find({})
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('leadId', 'name phone')
      .populate('salesPersonId', 'name email')
      .lean();

    console.log('\n\x1b[35m%s\x1b[0m', '--- 📞 LAST 15 CALL LOGS IN DATABASE ---');
    if (callLogs.length === 0) {
      console.log('No call logs found.');
    } else {
      callLogs.forEach((c: any) => {
        const leadName = c.leadId?.name || 'Unknown Lead';
        const phone = c.leadId?.phone || 'No Phone';
        const salesperson = c.salesPersonId?.name || 'Unknown Agent';
        const duration = c.duration || 0;
        const syncId = c.syncId || 'NONE';
        const status = c.status || 'unknown';
        const date = c.createdAt;

        console.log(`- Lead: ${leadName} (${phone}), Duration: ${duration}s, SyncID: ${syncId}, Agent: ${salesperson}, Status: ${status}, Date: ${date.toLocaleString()}`);
      });
    }

    process.exit(0);
  } catch (error: any) {
    console.error('FAILED TO DEBUG:', error.stack || error.message);
    process.exit(1);
  }
}

check();
