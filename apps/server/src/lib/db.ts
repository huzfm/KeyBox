import mongoose from "mongoose"

const MONGO_URI = process.env.MONGO_URI as string

if (!MONGO_URI) {
     throw new Error("Missing MONGO_URI")
}

export async function connectDB() {
     if (mongoose.connection.readyState !== 0) {
          await mongoose.disconnect()
     }
     if (mongoose.connection.readyState === 1) return mongoose.connection

     const conn = await mongoose.connect(MONGO_URI, {
          serverSelectionTimeoutMS: 5000,
     })

     console.log("MongoDB connected (new connection)")
     return conn
}
