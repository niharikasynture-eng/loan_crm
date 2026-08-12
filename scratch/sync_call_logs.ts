import { connectDB } from '../src/lib/db';
import CallLog from '../src/models/CallLog';
import Activity from '../src/models/Activity';

async function syncCallLogs() {
  await connectDB();
  
  const callActivities = await Activity.find({ type: 'call' }).lean();
  console.log(`Found ${callActivities.length} call activities to sync into CallLog...`);

  for (const act of callActivities) {
    const existing = await CallLog.findOne({
      leadId: act.leadId,
      startedAt: act.createdAt
    });

    if (!existing) {
      const dur = act.duration || 15;
      const status = (act as any).status === 'missed' ? 'missed' : 'completed';
      const outcome = (act.outcome as any) || 'interested';

      await CallLog.create({
        leadId: act.leadId,
        organizationId: act.organizationId,
        salesPersonId: act.createdBy,
        status: status,
        outcome: ['interested', 'not-interested', 'callback', 'no-answer', 'busy', 'wrong-number'].includes(outcome) ? outcome : null,
        duration: dur,
        connectedDuration: dur,
        notes: act.notes || 'Call recorded',
        startedAt: act.createdAt || new Date(),
        endedAt: new Date(new Date(act.createdAt).getTime() + dur * 1000),
        isBrowserInitiated: false,
      });
      console.log(`Created CallLog for activity: ${act._id}`);
    }
  }

  const count = await CallLog.countDocuments({});
  console.log(`Total CallLogs in database now: ${count}`);
  process.exit(0);
}

syncCallLogs().catch(err => {
  console.error(err);
  process.exit(1);
});
