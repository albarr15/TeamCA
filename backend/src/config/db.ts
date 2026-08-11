import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

// Prefer local MongoDB for development, fallback to Atlas if configured
const MONGO_URI =
  process.env.MONGODB_URI ||
  process.env.MONGO_URI ||
  "mongodb://127.0.0.1:27017/teamca";

// ── 1. Post-Connect Event Handlers ──
mongoose.connection.on("disconnected", () => {
  console.warn("MongoDB disconnected.");
});

mongoose.connection.on("error", (err) => {
  console.error("MongoDB post-connection error:", err.message);
  console.error(err.stack);
});

mongoose.connection.on("reconnected", () => {
  console.info("MongoDB reconnected.");
});

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGO_URI, {
      // Set shorter timeout for local connections
      serverSelectionTimeoutMS:
        process.env.NODE_ENV === "production" ? 30000 : 5000,
      socketTimeoutMS: process.env.NODE_ENV === "production" ? 45000 : 10000,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // ── 2. Log Error (Message + Stack) Before Exiting ──
    console.error("❌ Fatal MongoDB Connection Error:");
    if (error instanceof Error) {
      console.error(error.message);
      console.error(error.stack);
    } else {
      console.error(error);
    }
    process.exit(1);
  }
};