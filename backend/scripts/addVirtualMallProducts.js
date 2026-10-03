import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";

import VirtualMall from "../models/VirtualMall.js";
import Product from "../models/Product.js";

dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

dns.setDefaultResultOrder("ipv4first");

const MALL_SLUG =
  "jini-cosmetics-virtual-mall";

const productMappings = [
  {
    productId: "6abccc1e727ad9f2fc7afb00",

    storeId: "makeup",

    floorNumber: 0,

    position: {
      x: -14,
      y: 1.2,
      z: -5,
    },

    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },

    scale: {
      x: 1,
      y: 1,
      z: 1,
    },

    displayType: "shelf",

    modelUrl: "",

    modelType: "none",

    isInteractive: true,

    showProductPopup: true,

    allowAddToCart: true,

    allowViewDetails: true,

    isActive: true,

    sortOrder: 1,
  },

  {
    productId: "6abcceb2727ad9f2fc7afb01",

    storeId: "makeup",

    floorNumber: 0,

    position: {
      x: -10,
      y: 1.2,
      z: -5,
    },

    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },

    scale: {
      x: 1,
      y: 1,
      z: 1,
    },

    displayType: "shelf",

    modelUrl: "",

    modelType: "none",

    isInteractive: true,

    showProductPopup: true,

    allowAddToCart: true,

    allowViewDetails: true,

    isActive: true,

    sortOrder: 2,
  },

  {
    productId: "6abcd014727ad9f2fc7afb03",

    storeId: "skin-care",

    floorNumber: 0,

    position: {
      x: -2,
      y: 1.2,
      z: -5,
    },

    rotation: {
      x: 0,
      y: 0,
      z: 0,
    },

    scale: {
      x: 1,
      y: 1,
      z: 1,
    },

    displayType: "shelf",

    modelUrl: "",

    modelType: "none",

    isInteractive: true,

    showProductPopup: true,

    allowAddToCart: true,

    allowViewDetails: true,

    isActive: true,

    sortOrder: 1,
  },
];

/* =========================================================
   MAIN
   ========================================================= */

const addVirtualMallProducts = async () => {
  try {
    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "   VIRTUAL MALL PRODUCT SETUP"
    );
    console.log(
      "========================================"
    );
    console.log("");

    /* =====================================================
       CONNECT
       ===================================================== */

    console.log(
      "Connecting to MongoDB..."
    );

    await mongoose.connect(
      process.env.MONGO_URI,
      {
        serverSelectionTimeoutMS: 15000,
      }
    );

    console.log(
      "✅ MongoDB connected"
    );

    console.log(
      "Database:",
      mongoose.connection.name
    );

    console.log("");

    /* =====================================================
       FIND MALL
       ===================================================== */

    const mall =
      await VirtualMall.findOne({
        slug: MALL_SLUG,
      });

    if (!mall) {
      throw new Error(
        `Virtual Mall not found: ${MALL_SLUG}`
      );
    }

    console.log(
      "Mall found:",
      mall.name
    );

    console.log(
      "Mall ID:",
      mall._id.toString()
    );

    console.log("");

    /* =====================================================
       ADD PRODUCTS
       ===================================================== */

    let added = 0;
    let skipped = 0;

    for (const mapping of productMappings) {
      console.log(
        "----------------------------------------"
      );

      /* ===================================================
         FIND PRODUCT
         =================================================== */

      const product =
        await Product.findById(
          mapping.productId
        );

      if (!product) {
        console.log(
          `❌ Product not found: ${mapping.productId}`
        );

        continue;
      }

      console.log(
        "Product:",
        product.name
      );

      console.log(
        "Category:",
        product.category
      );

      /* ===================================================
         CHECK DUPLICATE
         =================================================== */

      const existing =
        mall.productLocations.find(
          (location) =>
            location.product &&
            location.product.toString() ===
              product._id.toString()
        );

      if (existing) {
        console.log(
          "⚠️ Product already exists in mall."
        );

        console.log(
          "Store:",
          existing.storeId
        );

        skipped++;

        continue;
      }

      /* ===================================================
         VALIDATE STORE
         =================================================== */

      const store =
        mall.stores.find(
          (item) =>
            item.storeId ===
            mapping.storeId
        );

      if (!store) {
        console.log(
          `❌ Store not found: ${mapping.storeId}`
        );

        continue;
      }

      /* ===================================================
         CREATE PRODUCT LOCATION

         IMPORTANT:
         displayPrice and displayBadge are NOT included
         because your current VirtualMall schema defines
         those fields as Boolean.

         Real product price/name/badge will come from
         the referenced Product document.
         =================================================== */

      mall.productLocations.push({
        product:
          product._id,

        storeId:
          mapping.storeId,

        floorNumber:
          mapping.floorNumber,

        position:
          mapping.position,

        rotation:
          mapping.rotation,

        scale:
          mapping.scale,

        displayType:
          mapping.displayType,

        modelUrl:
          mapping.modelUrl,

        modelType:
          mapping.modelType,

        isInteractive:
          mapping.isInteractive,

        showProductPopup:
          mapping.showProductPopup,

        allowAddToCart:
          mapping.allowAddToCart,

        allowViewDetails:
          mapping.allowViewDetails,

        isActive:
          mapping.isActive,

        sortOrder:
          mapping.sortOrder,
      });

      console.log(
        "Store:",
        store.name
      );

      console.log(
        "Position:",
        JSON.stringify(
          mapping.position
        )
      );

      console.log(
        "✅ Product added to mall"
      );

      added++;
    }

    /* =====================================================
       SAVE
       ===================================================== */

    if (added > 0) {
      await mall.save();

      console.log("");
      console.log(
        "✅ Virtual Mall saved successfully."
      );
    } else {
      console.log("");
      console.log(
        "ℹ️ No new products were added."
      );
    }

    /* =====================================================
       SUMMARY
       ===================================================== */

    console.log("");

    console.log(
      "========================================"
    );

    console.log(
      "PRODUCT MAPPING SUMMARY"
    );

    console.log(
      "========================================"
    );

    console.log(
      "Added:",
      added
    );

    console.log(
      "Skipped:",
      skipped
    );

    console.log(
      "Total mall products:",
      mall.productLocations.length
    );

    console.log(
      "========================================"
    );

    console.log("");

    /* =====================================================
       DISCONNECT
       ===================================================== */

    await mongoose.disconnect();

    console.log(
      "MongoDB disconnected."
    );

    console.log("");

    console.log(
      "✅ Virtual Mall product setup completed."
    );

    process.exitCode = 0;
  } catch (error) {
    console.error("");

    console.error(
      "========================================"
    );

    console.error(
      "❌ VIRTUAL MALL PRODUCT SETUP FAILED"
    );

    console.error(
      "========================================"
    );

    console.error("");

    console.error(
      error?.message || error
    );

    console.error("");

    await mongoose
      .disconnect()
      .catch(() => {});

    process.exitCode = 1;
  }
};

/* =========================================================
   RUN
   ========================================================= */

addVirtualMallProducts();