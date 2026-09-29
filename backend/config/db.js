import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing in environment variables"
      );
    }

    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      family: 4,
    });

    console.log("MongoDB connected successfully");
    console.log(
      `Database: ${mongoose.connection.name}`
    );
  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error instanceof Error
        ? error.message
        : error
    );

    process.exit(1);
  }
};

export default connectDB;