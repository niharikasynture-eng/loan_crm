import { connectDB } from '../src/lib/db';
import Lead from '../src/models/Lead';
import User from '../src/models/User';

async function checkLeads() {
  await connectDB();
  const users = await User.find({}).select('_id name email role organizationId').lean();
  console.log('--- ALL USERS ---');
  console.log(users);

  const leads = await Lead.find({}).select('_id name status pipelineStage assignedTo organizationId').populate('assignedTo', 'name email').lean();
  console.log('--- ALL LEADS ---');
  console.log(leads);
  process.exit(0);
}

checkLeads().catch(err => {
  console.error(err);
  process.exit(1);
});
