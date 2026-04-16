import { connectDB } from '../src/lib/db';
import User from '../src/models/User';
import Lead from '../src/models/Lead';
import CallLog from '../src/models/CallLog';
import Activity from '../src/models/Activity';

async function testSync() {
  await connectDB();
  
  // Find Mayur
  const user = await User.findOne({ email: 'sales@dealbyte.com' }); // or find by name Mayur Shinde
  if (!user) {
    console.log('User not found');
    return;
  }
  
  const lead = await Lead.findOne({ organizationId: user.organizationId });
  if (!lead) {
     console.log('Lead not found');
     return;
  }

  // 1. Simulate browser-start
  console.log('Simulating browser-start...');
  const newLog = await CallLog.create({
      leadId: lead._id,
      organizationId: user.organizationId,
      salesPersonId: user._id,
      status: 'initiated',
      startedAt: new Date(Date.now() - 23000), // 23 seconds ago
  });

  // 2. Simulate browser-end
  console.log('Simulating browser-end...');
  newLog.status = 'completed';
  newLog.duration = 23;
  newLog.connectedDuration = 23;
  newLog.endedAt = new Date();
  newLog.syncId = 'BROWSER_TIMER';
  newLog.notes = `✅ Verified Outgoing Call. Duration: 23s`;
  await newLog.save();

  const activity = await Activity.create({
      organizationId: user.organizationId,
      leadId: lead._id,
      type: 'call',
      notes: `✅ Verified Outgoing Call. Duration: 23s`,
      duration: 23,
      callLogId: newLog._id,
      createdBy: user._id,
      status: 'completed',
      completedAt: new Date(),
      syncId: 'BROWSER_TIMER',
  });
  console.log('Browser timer saved UI: 23s. Activity ID:', activity._id);

  // 3. Simulate sync-call-log
  console.log('Simulating phone sync (duration 5s)...');
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      
  const activityToUpdate = await Activity.findOne({
    leadId: lead._id,
    createdBy: user._id,
    type: 'call',
    createdAt: { $gte: fiveMinutesAgo },
    $or: [
      { syncId: 'BROWSER_TIMER' },
      { syncId: 'SMART_APP' },
      { notes: /Timer|Syncing|Manual/i }
    ]
  }).sort({ createdAt: -1 });

  const callLogToUpdate = await CallLog.findOne({
    leadId: lead._id,
    salesPersonId: user._id,
    createdAt: { $gte: fiveMinutesAgo },
    $or: [
      { syncId: 'MANUAL' },
      { syncId: 'SMART_APP' },
      { syncId: 'BROWSER_TIMER' },
      { notes: /Timer|Manual/i },
      { status: 'initiated' }
    ]
  }).sort({ createdAt: -1 });

  console.log('Found Activity to update:', activityToUpdate ? 'YES' : 'NO');
  console.log('Found CallLog to update:', callLogToUpdate ? 'YES' : 'NO');

  process.exit(0);
}

testSync().catch(console.error);
