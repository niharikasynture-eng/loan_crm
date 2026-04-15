import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { connectDB } from '../src/lib/db';
import Activity from '../src/models/Activity';
import mongoose from 'mongoose';

async function check() {
  try {
    await connectDB();
    
    // Fetch last 5 calls and populate lead details
    const activities = await Activity.find({ type: 'call' })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('leadId', 'name phone')
      .lean();

    console.log('\x1b[36m%s\x1b[0m', '--- 📞 LAST 5 CALLS IN DATABASE ---');
    
    if (activities.length === 0) {
      console.log('No call activities found.');
    } else {
      activities.forEach((a: any) => {
        const leadName = a.leadId?.name || 'Unknown Lead';
        const phone = a.leadId?.phone || 'No Phone';
        const duration = a.duration || 0;
        const syncId = a.syncId || 'NONE (Manual)';
        
        console.log(`- Lead: ${leadName} (${phone}), Duration: ${duration}s, SyncID: ${syncId}`);
      });
    }

    process.exit(0);
  } catch (error: any) {
    console.error('FAILED TO DEBUG:', error.message);
    process.exit(1);
  }
}

check();
