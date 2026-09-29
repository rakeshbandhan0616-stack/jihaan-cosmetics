import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

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
   STAFF USERS
   Only:
   - Admin
   - Accounts
   - Logistics
   ========================================================= */

const STAFF_USERS = [
  {
    name: "Admin",
    email: "admin@jinicosmetics.com",
    password: "123",
    role: "admin",
  },

  {
    name: "Accounts Manager",
    email: "accounts@jinicosmetics.com",
    password: "123",
    role: "accounts",
  },

  {
    name: "Logistics Manager",
    email: "logistics@jinicosmetics.com",
    password: "123",
    role: "logistics",
  },
];

/* =========================================================
   CREATE / UPDATE STAFF USERS
   ========================================================= */

const createStaffUsers = async () => {
  try {
    /* -----------------------------------------------------
       CHECK MONGO URI
       ----------------------------------------------------- */

    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing in the .env file"
      );
    }

    console.log("");
    console.log("========================================");
    console.log("   JIHAAN COSMETICS STAFF SETUP");
    console.log("========================================");
    console.log("");

    /* -----------------------------------------------------
       CONNECT MONGODB
       ----------------------------------------------------- */

    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
      family: 4,
      dbName: "jihaan",
    });

    console.log(
      "MongoDB connected successfully."
    );

    console.log(
      `Connected database: ${mongoose.connection.name}`
    );

    console.log("");

    /* -----------------------------------------------------
       CREATE / UPDATE EACH STAFF ACCOUNT
       ----------------------------------------------------- */

    for (const staff of STAFF_USERS) {
      const email = staff.email
        .trim()
        .toLowerCase();

      console.log(
        `Processing ${staff.role}: ${email}`
      );

      /* ---------------------------------------------------
         FIND EXISTING USER
         --------------------------------------------------- */

      const existingUser = await User.findOne({
        email,
      });

      /* ---------------------------------------------------
         HASH PASSWORD
         --------------------------------------------------- */

      const hashedPassword =
        await bcrypt.hash(
          staff.password,
          12
        );

      /* ---------------------------------------------------
         UPDATE EXISTING USER
         --------------------------------------------------- */

      if (existingUser) {
        existingUser.name = staff.name;
        existingUser.email = email;
        existingUser.password = hashedPassword;
        existingUser.role = staff.role;
        existingUser.isActive = true;
        existingUser.isBlocked = false;

        await existingUser.save();

        console.log(
          `✓ Updated ${staff.role}: ${email}`
        );

        continue;
      }

      /* ---------------------------------------------------
         CREATE NEW USER
         --------------------------------------------------- */

      const newUser = await User.create({
        name: staff.name,
        email,
        password: hashedPassword,
        role: staff.role,
        isActive: true,
        isBlocked: false,
      });

      console.log(
        `✓ Created ${staff.role}: ${newUser.email}`
      );
    }

    /* =====================================================
       RESULT
       ===================================================== */

    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "       STAFF USERS READY"
    );
    console.log(
      "========================================"
    );

    console.log("");

    console.log("ADMIN");
    console.log(
      "Email:    admin@jinicosmetics.com"
    );
    console.log(
      "Password: 123"
    );

    console.log("");

    console.log("ACCOUNTS");
    console.log(
      "Email:    accounts@jinicosmetics.com"
    );
    console.log(
      "Password: 123"
    );

    console.log("");

    console.log("LOGISTICS");
    console.log(
      "Email:    logistics@jinicosmetics.com"
    );
    console.log(
      "Password: 123"
    );

    console.log("");

    console.log(
      "========================================"
    );
    console.log(
      "Staff setup completed successfully."
    );
    console.log(
      "========================================"
    );

    console.log("");

    /* -----------------------------------------------------
       DISCONNECT
       ----------------------------------------------------- */

    await mongoose.disconnect();

    console.log(
      "MongoDB disconnected."
    );

    process.exitCode = 0;
  } catch (error) {
    console.error("");
    console.error(
      "========================================"
    );
    console.error(
      "       STAFF SETUP FAILED"
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

createStaffUsers();