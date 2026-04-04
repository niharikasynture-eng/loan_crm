const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });

async function fix() {
  await mongoose.connect(process.env.MONGODB_URI);
  try {
    await mongoose.connection.collection('calllogs').dropIndex('twilioCallSid_1');
    console.log('Dropped twilioCallSid_1 index');
  } catch (err) {
    console.log('Did not drop because:', err.message);
  }
  process.exit(0);
}

fix();
