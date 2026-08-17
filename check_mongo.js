const mongoose = require('mongoose');
require('dotenv').config();

const uri = process.env.MONGODB_URI;

console.log('Testing connection to URI...');
console.log('URI format:', uri ? uri.replace(/:[^:@]+@/, ':****@') : 'UNDEFINED');

async function testConnection() {
  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log('✅ SUCCESS: Connected to MongoDB!');
    console.log('Host:', conn.connection.host);
    console.log('Database Name:', conn.connection.name);
    console.log('Ready State:', conn.connection.readyState);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ FAILURE: Could not connect to MongoDB.');
    console.error('Error Code:', err.code);
    console.error('Error Name:', err.name);
    console.error('Error Message:', err.message);
    process.exit(1);
  }
}

testConnection();
