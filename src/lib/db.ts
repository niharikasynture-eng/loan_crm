import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI as string;

if (!MONGODB_URI) {
  throw new Error('Please define the MONGODB_URI environment variable');
}

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongoose: MongooseCache | undefined;
}

const cached: MongooseCache = global.mongoose ?? { conn: null, promise: null };

if (!global.mongoose) {
  global.mongoose = cached;
}

export async function connectDB(): Promise<typeof mongoose> {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      serverSelectionTimeoutMS: 10000, // 10 seconds timeout for finding a server
      connectTimeoutMS: 10000,         // 10 seconds timeout for initial connection
      socketTimeoutMS: 45000,          // 45 seconds timeout for socket inactivity
    };

    console.log('🔄 Connecting to MongoDB...');
    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log('✅ MongoDB connected successfully');
      return mongoose;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e: any) {
    cached.promise = null;
    
    // Provide a helpful hint for common DNS/SRV errors
    if (e.message?.includes('querySrv ECONNREFUSED')) {
      console.error('[DATABASE_ERROR] ❌ MongoDB DNS Resolution Failed (ECONNREFUSED).');
      console.error('HINT: Your local network or firewall might be blocking SRV records.');
      console.error('FIX: Try switching your MONGODB_URI in .env.local to the "Standard Connection String" format from Atlas (mongodb://node1.example.com:27017,...)');
    } else {
      console.error('[DATABASE_ERROR] ❌ Failed to connect to MongoDB:', e.message);
    }
    
    throw e;
  }

  return cached.conn;
}
