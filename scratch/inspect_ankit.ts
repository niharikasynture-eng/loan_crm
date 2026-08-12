import { connectDB } from '../src/lib/db';
import User from '../src/models/User';
import Lead from '../src/models/Lead';
import Activity from '../src/models/Activity';

async function inspectAnkit() {
  await connectDB();
  // Touch user model so it registers
  const u = User.modelName;

  const lead = await Lead.findOne({ name: /ankit/i }).populate('assignedTo', 'name email').lean();
  console.log('--- LEAD ANKIT ---');
  console.log(lead);

  const activities = await Activity.find({ leadId: lead?._id }).sort({ createdAt: -1 }).lean();
  console.log('--- ACTIVITIES FOR ANKIT ---');
  console.log(activities);

  process.exit(0);
}

inspectAnkit().catch(err => {
  console.error(err);
  process.exit(1);
});
