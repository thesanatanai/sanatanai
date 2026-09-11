import mongoose from 'mongoose';

const isProd = process.env.NODE_ENV == "production"
const MONGO_URI = isProd ? process.env.MONGO_URI : "mongodb://localhost:27017/sanatanai";

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

  if (!cached?.promise) {
    cached.promise = mongoose.connect(MONGO_URI as string).then((mongoose) => {
      return mongoose;
    });
  }
  
  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    throw e;
  }

  return cached.conn;
}

export default dbConnect;