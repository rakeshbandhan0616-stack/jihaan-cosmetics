import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import User from "../models/User.js";

// Use reliable public DNS servers for MongoDB Atlas SRV resolution
dns.setServers(["8.8.8.8", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

const SUPER_ADMIN_NAME = "Super Admin";
const SUPER_ADMIN_EMAIL = "superadmin@jihaanbeauty.com";
const SUPER_ADMIN_PASSWORD = "SuperAdmin@123";

const createSuperAdmin = async () => {
  try {
    if (!process.env.MONGO_URI) {
      throw new Error("MONGO_URI is missing in the .env file");
    }

    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log("MongoDB connected successfully");

    const existingSuperAdmin = await User.findOne({
      role: "superadmin",
    });

    if (existingSuperAdmin) {
      console.log("A Super Admin already exists.");
      console.log(`Email: ${existingSuperAdmin.email}`);

      await mongoose.disconnect();
      process.exitCode = 0;
      return;
    }

    const existingUser = await User.findOne({
      email: SUPER_ADMIN_EMAIL.toLowerCase().trim(),
    });

    if (existingUser) {
      console.log("This email is already registered.");
      console.log(`Email: ${SUPER_ADMIN_EMAIL}`);

      await mongoose.disconnect();
      process.exitCode = 0;
      return;
    }

    const hashedPassword = await bcrypt.hash(
      SUPER_ADMIN_PASSWORD,
      12
    );

    const superAdmin = await User.create({
      name: SUPER_ADMIN_NAME,
      email: SUPER_ADMIN_EMAIL.toLowerCase().trim(),
      password: hashedPassword,
      role: "superadmin",
      isActive: true,
    });

    console.log("-----------------------------------");
    console.log("Super Admin created successfully");
    console.log("-----------------------------------");
    console.log("Name:", superAdmin.name);
    console.log("Email:", superAdmin.email);
    console.log("Role:", superAdmin.role);
    console.log("Password:", SUPER_ADMIN_PASSWORD);
    console.log("-----------------------------------");

    await mongoose.disconnect();
    process.exitCode = 0;
  } catch (error) {
    console.error("-----------------------------------");
    console.error("Failed to create Super Admin");
    console.error("-----------------------------------");
    console.error(error.message);

    if (mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
    }

    process.exitCode = 1;
  }
};

createSuperAdmin();