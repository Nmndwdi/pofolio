import mongoose, { type Mongoose } from "mongoose";

/*
 * In serverless environments (Vercel functions) and during Next dev hot reload,
 * the module is re-evaluated frequently. A naive `mongoose.connect()` at the
 * top level would open a new connection on every invocation — exhausting your
 * Atlas connection pool within minutes.
 *
 * The fix is to cache the connection promise on globalThis, which survives
 * hot reloads. This is the standard Next.js + Mongoose pattern.
 */

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error(
    "MONGODB_URI is not set. Add it to .env.local (see .env.example).",
  );
}

interface MongooseCache {
  conn: Mongoose | null;
  promise: Promise<Mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache: MongooseCache | undefined;
}

const cached: MongooseCache =
  global.__mongooseCache ?? (global.__mongooseCache = { conn: null, promise: null });

export async function connectDB(): Promise<Mongoose> {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI!, {
      // Recommended for serverless: don't buffer commands while connecting,
      // fail fast instead.
      bufferCommands: false,
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }

  return cached.conn;
}
