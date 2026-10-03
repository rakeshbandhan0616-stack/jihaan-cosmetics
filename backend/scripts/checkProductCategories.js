import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import Product from "../models/Product.js";

dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

dns.setDefaultResultOrder("ipv4first");

const checkProductCategories = async () => {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log("✅ MongoDB connected");
    console.log("Database:", mongoose.connection.name);
    console.log("");

    const categories = await Product.aggregate([
      {
        $match: {
          active: {
            $ne: false,
          },
        },
      },
      {
        $group: {
          _id: "$category",
          count: {
            $sum: 1,
          },
        },
      },
      {
        $sort: {
          _id: 1,
        },
      },
    ]);

    console.log("========================================");
    console.log("ACTIVE PRODUCT CATEGORIES");
    console.log("========================================");

    console.log(
      JSON.stringify(categories, null, 2)
    );

    console.log("========================================");

    await mongoose.disconnect();

    console.log("✅ MongoDB disconnected");
  } catch (error) {
    console.error("");
    console.error("❌ Failed to check categories");
    console.error(error);

    await mongoose.disconnect().catch(() => {});

    process.exitCode = 1;
  }
};

checkProductCategories();