import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";
import Product from "../models/Product.js";

dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

dns.setDefaultResultOrder("ipv4first");

const checkProducts = async () => {
  try {
    console.log("Connecting to MongoDB...");

    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log("✅ MongoDB connected");
    console.log("Database:", mongoose.connection.name);
    console.log("");

    const products = await Product.find({
      active: {
        $ne: false,
      },
    })
      .select(
        "_id name slug brand category subcategory price oldPrice images stock active"
      )
      .lean();

    console.log("========================================");
    console.log("PRODUCTS FOR VIRTUAL MALL");
    console.log("========================================");

    console.log(
      JSON.stringify(products, null, 2)
    );

    console.log("========================================");

    console.log(
      `Total active products: ${products.length}`
    );

    await mongoose.disconnect();

    console.log("");
    console.log("✅ MongoDB disconnected");
  } catch (error) {
    console.error("");
    console.error("❌ Failed to check products");
    console.error(error);

    await mongoose.disconnect().catch(() => {});

    process.exitCode = 1;
  }
};

checkProducts();