import { connectDB } from '../src/lib/db';
import Lead from '../src/models/Lead';
import User from '../src/models/User';

async function assignLeads() {
  await connectDB();
  const salesAgent = await User.findOne({ email: 'a07124680@gmail.com' });
  const chinmay = await User.findOne({ email: 'chinmay@gmail.com' });

  if (!salesAgent || !chinmay) {
    console.error('Users not found');
    process.exit(1);
  }

  // Ensure all leads have pipelineStage equal to status if missing
  const allLeads = await Lead.find({});
  for (const l of allLeads) {
    if (!l.pipelineStage) {
      l.pipelineStage = l.status;
      await l.save();
    }
  }

  // Assign Tim Cook (contacted) & Elon Musk (new) & Sundar Pichai (won) to salesAgent as well or create demo leads
  const timCook = await Lead.findOne({ name: 'Tim Cook' });
  if (timCook) {
    timCook.assignedTo = salesAgent._id;
    timCook.pipelineStage = 'contacted';
    timCook.status = 'contacted';
    timCook.lastStageChangedBy = chinmay._id;
    timCook.previousStage = 'new';
    timCook.lastStageChangedAt = new Date();
    await timCook.save();
  }

  const elon = await Lead.findOne({ name: 'Elon Musk' });
  if (elon) {
    elon.assignedTo = salesAgent._id;
    elon.pipelineStage = 'new';
    elon.status = 'new';
    await elon.save();
  }

  const sundar = await Lead.findOne({ name: 'Sundar Pichai' });
  if (sundar) {
    sundar.assignedTo = salesAgent._id;
    sundar.pipelineStage = 'won';
    sundar.status = 'won';
    sundar.lastStageChangedBy = chinmay._id;
    sundar.previousStage = 'proposal';
    sundar.lastStageChangedAt = new Date();
    await sundar.save();
  }

  const ankit = await Lead.findOne({ name: 'Ankit' });
  if (ankit) {
    ankit.assignedTo = salesAgent._id;
    ankit.pipelineStage = 'qualified';
    ankit.status = 'qualified';
    ankit.lastStageChangedBy = chinmay._id;
    ankit.previousStage = 'contacted';
    ankit.lastStageChangedAt = new Date();
    await ankit.save();
  }

  console.log('Leads assigned successfully!');
  process.exit(0);
}

assignLeads().catch(err => {
  console.error(err);
  process.exit(1);
});
