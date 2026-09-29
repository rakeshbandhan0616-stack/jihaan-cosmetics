import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";

import User from "../models/User.js";

dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

dns.setDefaultResultOrder("ipv4first");

const fixUserIndexes = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in .env");
    }

    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      family: 4,
      dbName: "jihaan",
    });

    console.log(
      "Connected database:",
      mongoose.connection.name
    );

    console.log("Synchronizing User indexes...");

    await User.syncIndexes();

    console.log("✓ User indexes synchronized successfully.");

    const indexes =
      await mongoose.connection.db
        .collection("users")
        .indexes();

    console.log("");
    console.log("Current indexes:");

    for (const index of indexes) {
      console.log(
        index.name,
        index.unique ? "unique" : "",
        index.sparse ? "sparse" : "",
        index.partialFilterExpression || ""
      );
    }

    await mongoose.disconnect();

    console.log("");
    console.log("MongoDB disconnected.");
  } catch (error) {
    console.error("");
    console.error("INDEX SETUP FAILED");
    console.error(error.message);

    await mongoose.disconnect().catch(() => {});

    process.exitCode = 1;
  }
};

fixUserIndexes();