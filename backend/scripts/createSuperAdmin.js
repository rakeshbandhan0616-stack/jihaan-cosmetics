
import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import User from "../models/User.js";

/* =========================================================
   DNS CONFIGURATION
   ========================================================= */

// Use reliable public DNS servers for MongoDB Atlas SRV resolution
dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

dns.setDefaultResultOrder("ipv4first");

/* =========================================================
   SUPER ADMIN DETAILS
   ========================================================= */

const SUPER_ADMIN_NAME = "Super Admin";

const SUPER_ADMIN_EMAIL =
  "superadmin@jihaanbeauty.com";

const SUPER_ADMIN_PASSWORD =
  "SuperAdmin@123";

/* =========================================================
   CREATE SUPER ADMIN
   ========================================================= */

const createSuperAdmin = async () => {
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
    console.log(
      "========================================"
    );
    console.log(
      "     JIHAAN COSMETICS SUPER ADMIN"
    );
    console.log(
      "========================================"
    );
    console.log("");

    /* -----------------------------------------------------
       CONNECT TO MONGODB
       ----------------------------------------------------- */

    console.log("Connecting to MongoDB...");

    await mongoose.connect(
      process.env.MONGO_URI,
      {
        serverSelectionTimeoutMS: 15000,
        family: 4,
        dbName: "jihaan",
      }
    );

    console.log(
      "MongoDB connected successfully."
    );

    console.log(
      `Connected database: ${mongoose.connection.name}`
    );

    console.log("");

    /* -----------------------------------------------------
       CHECK EXISTING SUPER ADMIN
       ----------------------------------------------------- */

    const existingSuperAdmin =
      await User.findOne({
        role: "superadmin",
      });

    if (existingSuperAdmin) {
      console.log(
        "A Super Admin already exists."
      );

      console.log(
        `Email: ${existingSuperAdmin.email}`
      );

      console.log(
        `Role: ${existingSuperAdmin.role}`
      );

      console.log("");

      await mongoose.disconnect();

      console.log(
        "MongoDB disconnected."
      );

      process.exitCode = 0;
      return;
    }

    /* -----------------------------------------------------
       CHECK EMAIL
       ----------------------------------------------------- */

    const normalizedEmail =
      SUPER_ADMIN_EMAIL
        .trim()
        .toLowerCase();

    const existingUser =
      await User.findOne({
        email: normalizedEmail,
      });

    if (existingUser) {
      console.log(
        "This email is already registered."
      );

      console.log(
        `Email: ${normalizedEmail}`
      );

      console.log(
        `Existing role: ${existingUser.role}`
      );

      console.log("");

      await mongoose.disconnect();

      console.log(
        "MongoDB disconnected."
      );

      process.exitCode = 0;
      return;
    }

    /* -----------------------------------------------------
       HASH PASSWORD
       ----------------------------------------------------- */

    const hashedPassword =
      await bcrypt.hash(
        SUPER_ADMIN_PASSWORD,
        12
      );

    /* -----------------------------------------------------
       CREATE SUPER ADMIN
       ----------------------------------------------------- */

    const superAdmin =
      await User.create({
        name: SUPER_ADMIN_NAME,
        email: normalizedEmail,
        password: hashedPassword,
        role: "superadmin",
        isActive: true,
        isBlocked: false,
      });

    /* =====================================================
       SUCCESS
       ===================================================== */

    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "   SUPER ADMIN CREATED SUCCESSFULLY"
    );
    console.log(
      "========================================"
    );

    console.log("");
    console.log(
      "Name:",
      superAdmin.name
    );

    console.log(
      "Email:",
      superAdmin.email
    );

    console.log(
      "Role:",
      superAdmin.role
    );

    console.log(
      "Password:",
      SUPER_ADMIN_PASSWORD
    );

    console.log("");
    console.log(
      "Database:",
      mongoose.connection.name
    );

    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "       SUPER ADMIN SETUP COMPLETE"
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
      "     SUPER ADMIN SETUP FAILED"
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

createSuperAdmin();

