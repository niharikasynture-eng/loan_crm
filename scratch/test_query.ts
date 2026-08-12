import { connectDB } from '../src/lib/db';
import Lead from '../src/models/Lead';
import User from '../src/models/User';

async function testQuery() {
  await connectDB();
  try {
    const leads = await Lead.find({})
      .populate('assignedTo', 'name email avatar')
      .populate('createdBy', 'name email')
      .populate('lastStageChangedBy', 'name email avatar')
      .lean();
    console.log('Success! Returned leads count:', leads.length);
    leads.forEach(l => {
      console.log('Lead:', l.name, '| lastStageChangedBy:', l.lastStageChangedBy);
    });
  } catch (err) {
    console.error('Error during query:', err);
  }
  process.exit(0);
}

testQuery();
