import mongoose from 'mongoose'

const MONGODB_URI = process.env.MONGODB_URI

let cached = globalThis.mongoose

if (!cached) {
  cached = globalThis.mongoose = { conn: null, promise: null }
}

export async function connectDB() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set')
  }

  if (cached.conn) {
    return cached.conn
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000,
    })
  }

  cached.conn = await cached.promise
  return cached.conn
}
