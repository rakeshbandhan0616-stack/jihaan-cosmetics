import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import VirtualMall from "../models/VirtualMall.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
dns.setDefaultResultOrder("ipv4first");

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  throw new Error("MONGO_URI is missing from .env");
}

try {
  await mongoose.connect(MONGO_URI, {
    serverSelectionTimeoutMS: 15000,
  });

  console.log("MongoDB connected successfully.");
  console.log("Database:", mongoose.connection.name);

  const mall = await VirtualMall.findOne({
    slug: "jini-cosmetics-virtual-mall",
  });

  if (!mall) {
    console.error("Virtual Mall not found.");
    process.exitCode = 1;
  } else {
    mall.isActive = true;
    mall.isPublished = true;
    mall.maintenanceMode = false;

    await mall.save();

    console.log("");
    console.log("Virtual Mall published successfully.");
    console.log("ID:", mall._id.toString());
    console.log("Name:", mall.name);
    console.log("Slug:", mall.slug);
    console.log("Active:", mall.isActive);
    console.log("Published:", mall.isPublished);
    console.log("Stores:", mall.stores.length);
    console.log("Products:", mall.productLocations.length);
    console.log("Version:", mall.version);
  }
} catch (error) {
  console.error("Failed to publish Virtual Mall:");
  console.error(error);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
  console.log("MongoDB disconnected.");
}