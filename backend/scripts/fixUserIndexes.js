import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";

import User from "../models/User.js";

/* =========================================================
   DNS CONFIGURATION
========================================================= */

dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

dns.setDefaultResultOrder("ipv4first");

/* =========================================================
   FIX USER INDEXES
========================================================= */

const fixUserIndexes = async () => {
  try {
    /* -------------------------------------------------------
       CHECK MONGO URI
    ------------------------------------------------------- */

    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing in .env"
      );
    }

    console.log("");
    console.log("========================================");
    console.log("       USER INDEX SETUP");
    console.log("========================================");
    console.log("");

    /* -------------------------------------------------------
       CONNECT TO DATABASE
       
       IMPORTANT:
       Do NOT specify dbName here.
       The database name comes from MONGO_URI.
    ------------------------------------------------------- */

    console.log("Connecting to MongoDB...");

    await mongoose.connect(
      process.env.MONGO_URI,
      {
        serverSelectionTimeoutMS: 15000,
        family: 4,
      }
    );

    console.log(
      "MongoDB connected successfully."
    );

    console.log(
      "Connected database:",
      mongoose.connection.name
    );

    console.log("");

    /* -------------------------------------------------------
       USERS COLLECTION
    ------------------------------------------------------- */

    const usersCollection =
      mongoose.connection.db.collection("users");

    /* -------------------------------------------------------
       SHOW EXISTING INDEXES
    ------------------------------------------------------- */

    console.log(
      "Current indexes before synchronization:"
    );

    const existingIndexes =
      await usersCollection.indexes();

    for (const index of existingIndexes) {
      console.log(
        "-",
        index.name,
        index.unique ? "[unique]" : "",
        index.sparse ? "[sparse]" : ""
      );
    }

    console.log("");

    /* -------------------------------------------------------
       REMOVE OLD GOOGLE INDEX
       
       Older schema may have created:
       
       googleId_1
       
       The current schema uses:
       
       unique_google_id
    ------------------------------------------------------- */

    const oldGoogleIndex =
      existingIndexes.find(
        (index) =>
          index.name === "googleId_1"
      );

    if (oldGoogleIndex) {
      console.log(
        "Removing old googleId_1 index..."
      );

      await usersCollection.dropIndex(
        "googleId_1"
      );

      console.log(
        "✓ Old googleId_1 index removed."
      );
    } else {
      console.log(
        "✓ Old googleId_1 index not found."
      );
    }

    console.log("");

    /* -------------------------------------------------------
       REMOVE OLD FACEBOOK INDEX
    ------------------------------------------------------- */

    const oldFacebookIndex =
      existingIndexes.find(
        (index) =>
          index.name === "facebookId_1"
      );

    if (oldFacebookIndex) {
      console.log(
        "Removing old facebookId_1 index..."
      );

      await usersCollection.dropIndex(
        "facebookId_1"
      );

      console.log(
        "✓ Old facebookId_1 index removed."
      );
    } else {
      console.log(
        "✓ Old facebookId_1 index not found."
      );
    }

    console.log("");

    /* -------------------------------------------------------
       SYNCHRONIZE MONGOOSE INDEXES
    ------------------------------------------------------- */

    console.log(
      "Synchronizing User indexes..."
    );

    await User.syncIndexes();

    console.log(
      "✓ User indexes synchronized successfully."
    );

    console.log("");

    /* -------------------------------------------------------
       SHOW FINAL INDEXES
    ------------------------------------------------------- */

    const finalIndexes =
      await usersCollection.indexes();

    console.log(
      "Final indexes:"
    );

    for (const index of finalIndexes) {
      console.log(
        "-",
        index.name,
        index.unique ? "[unique]" : "",
        index.sparse ? "[sparse]" : ""
      );
    }

    console.log("");

    /* -------------------------------------------------------
       DISCONNECT
    ------------------------------------------------------- */

    await mongoose.disconnect();

    console.log(
      "MongoDB disconnected."
    );

    console.log("");

    console.log(
      "========================================"
    );

    console.log(
      "       INDEX SETUP COMPLETED"
    );

    console.log(
      "========================================"
    );

    console.log("");

    process.exitCode = 0;

  } catch (error) {
    console.error("");

    console.error(
      "========================================"
    );

    console.error(
      "       INDEX SETUP FAILED"
    );

    console.error(
      "========================================"
    );

    console.error("");

    console.error(
      error?.message || error
    );

    console.error("");

    if (
      mongoose.connection.readyState !== 0
    ) {
      await mongoose
        .disconnect()
        .catch(() => {});
    }

    process.exitCode = 1;
  }
};

/* =========================================================
   RUN
========================================================= */

fixUserIndexes();