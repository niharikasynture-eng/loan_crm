import { connectDB } from '../src/lib/db';
import Lead from '../src/models/Lead';
import User from '../src/models/User';

async function moveAnkit() {
  await connectDB();
  const salesAgent = await User.findOne({ email: 'a07124680@gmail.com' });
  const lead = await Lead.findOne({ name: /ankit/i });

  if (lead && salesAgent) {
    lead.status = 'contacted';
    lead.pipelineStage = 'contacted';
    lead.previousStage = 'new';
    lead.lastStageChangedBy = salesAgent._id;
    lead.lastStageChangedAt = new Date();
    await lead.save();
    console.log('Ankit moved to CONTACTED column successfully!');
  }

  process.exit(0);
}

moveAnkit().catch(err => {
  console.error(err);
  process.exit(1);
});
