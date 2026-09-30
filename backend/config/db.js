import mongoose from "mongoose";

const connectDB = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing in the environment variables"
      );
    }

    console.log("----------------------------------------");
    console.log("Connecting to MongoDB...");

    await mongoose.connect(
      process.env.MONGO_URI,
      {
        serverSelectionTimeoutMS: 15000,
        family: 4,
      }
    );

    console.log(
      "MongoDB connected successfully"
    );

    console.log(
      "Database:",
      mongoose.connection.name
    );

    console.log(
      "MongoDB host:",
      mongoose.connection.host
    );

    console.log("----------------------------------------");

  } catch (error) {
    console.error(
      "MongoDB connection failed:",
      error.message
    );

    process.exit(1);
  }
};

export default connectDB;