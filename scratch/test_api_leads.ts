import { connectDB } from '../src/lib/db';
import Lead from '../src/models/Lead';
import User from '../src/models/User';

async function testApiLeads() {
  await connectDB();

  const users = await User.find({}).lean();
  for (const user of users) {
    const query: any = { organizationId: user.organizationId };
    if (user.role === 'sales_agent' || user.role === 'onsite_visitor') {
      query.assignedTo = user._id;
    }

    const leads = await Lead.find(query).lean();
    console.log(`User: ${user.email} (${user.role}) => Total Leads returned: ${leads.length}`);
    leads.forEach(l => console.log(`   - Lead: ${l.name}, status: ${l.status}, pipelineStage: ${l.pipelineStage}, assignedTo: ${l.assignedTo}`));
  }

  process.exit(0);
}

testApiLeads().catch(err => {
  console.error(err);
  process.exit(1);
});
