const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

if (!uri) {
  console.error('❌ MONGODB_URI is not set in .env file');
  process.exit(1);
}

async function wipeCustomerData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;

    // Collections to wipe (all customer, lead, deal, post-sales, task, and activity data)
    const collectionsToWipe = [
      'leads',
      'deals',
      'bookings',
      'tasks',
      'calllogs',
      'sitevisits',
      'activities',
      'notifications',
      'auditlogs',
      'inventoryunits',
      'projects',
      'pipelines'
    ];

    console.log('\n🧹 Wiping customer and transactional data...');

    for (const name of collectionsToWipe) {
      try {
        const collections = await db.listCollections({ name }).toArray();
        if (collections.length > 0) {
          const res = await db.collection(name).deleteMany({});
          console.log(`  - Cleared collection '${name}': ${res.deletedCount} documents deleted.`);
        } else {
          console.log(`  - Collection '${name}' not present (skipped).`);
        }
      } catch (err) {
        console.error(`  - Error clearing '${name}':`, err.message);
      }
    }

    // Report preserved collections
    const userCount = await db.collection('users').countDocuments();
    const orgCount = await db.collection('organizations').countDocuments();

    console.log('\n=========================================');
    console.log('🎉 CUSTOMER DATA WIPE COMPLETE!');
    console.log('=========================================');
    console.log(`👥 Preserved Users (Logins): ${userCount}`);
    console.log(`🏢 Preserved Organizations: ${orgCount}`);
    console.log('=========================================\n');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ Error during wipe operation:', err);
    process.exit(1);
  }
}

wipeCustomerData();
