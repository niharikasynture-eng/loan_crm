import { connectDB } from '../src/lib/db';
import CallLog from '../src/models/CallLog';
import Activity from '../src/models/Activity';

async function checkCallLogs() {
  await connectDB();
  const logs = await CallLog.find({}).lean();
  console.log('--- ALL CALL LOGS IN MONGO ---');
  console.log(logs);

  const callActivities = await Activity.find({ type: 'call' }).lean();
  console.log('--- ALL CALL ACTIVITIES IN MONGO ---');
  console.log(callActivities);

  process.exit(0);
}

checkCallLogs().catch(err => {
  console.error(err);
  process.exit(1);
});
