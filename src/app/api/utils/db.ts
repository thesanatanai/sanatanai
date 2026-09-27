import mongoose from 'mongoose';

const uriDev = process.env.NODE_ENV == "development" ? process.env.MONGO_DEV : undefined;
const MONGO_URI = uriDev || process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error('Please define the MONGO_URI environment variable');
}

interface global {
  mongoose?: {
    conn: null | mongoose.Mongoose,
    promise: null | Promise<mongoose.Mongoose>
  }
}

// Use global to persist the connection across serverless invocations
let cached = (global as global).mongoose as NonNullable<global["mongoose"]>;

if (!cached) {
  cached = (global as global).mongoose = { conn: null, promise: null };
}

async function dbConnect() {
  if (cached?.conn) {
    return cached.conn;
  }

  cached.promise ??= mongoose.connect(MONGO_URI as string).then((mongoose) => {
      return mongoose;
    });
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;