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
   ========================================================= */

const STAFF_USERS = [
  {
    name: "Super Admin",
    email: "superadmin@jihaancosmetics.com",
    password: "SuperAdmin@123",
    role: "superadmin",
  },

  {
    name: "Admin",
    email: "admin@jihaancosmetics.com",
    password: "Admin@123",
    role: "admin",
  },

  {
    name: "Accounts Manager",
    email: "accounts@jihaancosmetics.com",
    password: "Accounts@123",
    role: "accounts",
  },

  {
    name: "Logistics Manager",
    email: "logistics@jihaancosmetics.com",
    password: "Logistics@123",
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
    });

    console.log(
      "MongoDB connected successfully."
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

      const existingUser = await User.findOne({
        email,
      });

      const hashedPassword =
        await bcrypt.hash(
          staff.password,
          12
        );

      /* ---------------------------------------------------
         EXISTING USER
         --------------------------------------------------- */

      if (existingUser) {
        existingUser.name = staff.name;
        existingUser.email = email;
        existingUser.password =
          hashedPassword;
        existingUser.role = staff.role;
        existingUser.isActive = true;

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

    console.log("SUPER ADMIN");
    console.log(
      "Email:    superadmin@jihaancosmetics.com"
    );
    console.log(
      "Password: SuperAdmin@123"
    );

    console.log("");

    console.log("ADMIN");
    console.log(
      "Email:    admin@jihaancosmetics.com"
    );
    console.log(
      "Password: Admin@123"
    );

    console.log("");

    console.log("ACCOUNTS");
    console.log(
      "Email:    accounts@jihaancosmetics.com"
    );
    console.log(
      "Password: Accounts@123"
    );

    console.log("");

    console.log("LOGISTICS");
    console.log(
      "Email:    logistics@jihaancosmetics.com"
    );
    console.log(
      "Password: Logistics@123"
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