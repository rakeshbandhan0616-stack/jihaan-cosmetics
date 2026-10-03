import "dotenv/config";
import dns from "node:dns";
import mongoose from "mongoose";

import VirtualMall from "../models/VirtualMall.js";

/* =========================================================
   DNS CONFIGURATION
   ========================================================= */

dns.setServers([
  "8.8.8.8",
  "1.1.1.1",
]);

dns.setDefaultResultOrder("ipv4first");

/* =========================================================
   MONGO URI
   ========================================================= */

const MONGO_URI = process.env.MONGO_URI;

/* =========================================================
   CHECK MONGO URI
   ========================================================= */

if (!MONGO_URI) {
  console.error(
    "❌ MONGO_URI is missing in the .env file"
  );

  process.exit(1);
}

/* =========================================================
   VIRTUAL MALL DATA
   ========================================================= */

const mallData = {
  name: "Jini Cosmetics Virtual Mall",

  slug: "jini-cosmetics-virtual-mall",

  description:
    "A 3D walkable virtual shopping mall for Jini Cosmetics.",

  logo: "",

  coverImage: "",

  thumbnailImage: "",

  /*
  |--------------------------------------------------------------------------
  | MAIN 3D MODEL
  |--------------------------------------------------------------------------
  |
  | The actual GLB model will be added later.
  |
  |--------------------------------------------------------------------------
  */

  modelUrl: "",

  modelType: "glb",

  environmentMapUrl: "",

  skyboxUrl: "",

  backgroundColor: "#f8f5f2",

  /*
  |--------------------------------------------------------------------------
  | FLOORS
  |--------------------------------------------------------------------------
  */

  floors: [
    {
      floorNumber: 0,

      name: "Ground Floor",

      description:
        "Main entrance, lobby and cosmetics stores.",

      modelUrl: "",

      modelType: "glb",

      position: {
        x: 0,
        y: 0,
        z: 0,
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

      isActive: true,

      showOnMap: true,

      sortOrder: 0,
    },
  ],

  /*
  |--------------------------------------------------------------------------
  | STORES
  |--------------------------------------------------------------------------
  */

  stores: [
    {
      storeId: "makeup",

      name: "Makeup Store",

      slug: "makeup",

      description:
        "Explore makeup products in our virtual cosmetics store.",

      category: "Makeup",

      subcategory: "",

      logo: "",

      bannerImage: "",

      thumbnailImage: "",

      modelUrl: "",

      modelType: "glb",

      position: {
        x: -12,
        y: 0,
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

      size: {
        width: 10,
        height: 4,
        depth: 10,
      },

      floorNumber: 0,

      primaryColor: "#f6d6df",

      secondaryColor: "#fff5f7",

      isActive: true,

      isFeatured: true,

      allowProductInteraction: true,

      showOnMap: true,

      sortOrder: 1,
    },

    {
      storeId: "skin-care",

      name: "Skin Care Store",

      slug: "skin-care",

      description:
        "Explore skin care products inside the virtual mall.",

      category: "Skin Care",

      subcategory: "",

      logo: "",

      bannerImage: "",

      thumbnailImage: "",

      modelUrl: "",

      modelType: "glb",

      position: {
        x: 0,
        y: 0,
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

      size: {
        width: 10,
        height: 4,
        depth: 10,
      },

      floorNumber: 0,

      primaryColor: "#e4f2df",

      secondaryColor: "#f5fff2",

      isActive: true,

      isFeatured: true,

      allowProductInteraction: true,

      showOnMap: true,

      sortOrder: 2,
    },

    {
      storeId: "hair-care",

      name: "Hair Care Store",

      slug: "hair-care",

      description:
        "Explore hair care products in the virtual mall.",

      category: "Hair Care",

      subcategory: "",

      logo: "",

      bannerImage: "",

      thumbnailImage: "",

      modelUrl: "",

      modelType: "glb",

      position: {
        x: 12,
        y: 0,
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

      size: {
        width: 10,
        height: 4,
        depth: 10,
      },

      floorNumber: 0,

      primaryColor: "#e7ddf5",

      secondaryColor: "#f8f3ff",

      isActive: true,

      isFeatured: false,

      allowProductInteraction: true,

      showOnMap: true,

      sortOrder: 3,
    },

    {
      storeId: "fragrance",

      name: "Fragrance Store",

      slug: "fragrance",

      description:
        "Explore fragrances and perfumes in the virtual mall.",

      category: "Fragrance",

      subcategory: "",

      logo: "",

      bannerImage: "",

      thumbnailImage: "",

      modelUrl: "",

      modelType: "glb",

      position: {
        x: 0,
        y: 0,
        z: 10,
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

      size: {
        width: 10,
        height: 4,
        depth: 10,
      },

      floorNumber: 0,

      primaryColor: "#e9dfd0",

      secondaryColor: "#fffaf2",

      isActive: true,

      isFeatured: false,

      allowProductInteraction: true,

      showOnMap: true,

      sortOrder: 4,
    },
  ],

  /*
  |--------------------------------------------------------------------------
  | PRODUCT LOCATIONS
  |--------------------------------------------------------------------------
  |
  | Products will be connected after the mall is created.
  |
  |--------------------------------------------------------------------------
  */

  productLocations: [],

  /*
  |--------------------------------------------------------------------------
  | PLAYER SPAWN
  |--------------------------------------------------------------------------
  */

  spawnPoint: {
    position: {
      x: 0,
      y: 1.6,
      z: 20,
    },

    rotation: {
      x: 0,
      y: 3.14159,
      z: 0,
    },
  },

  /*
  |--------------------------------------------------------------------------
  | MALL SETTINGS
  |--------------------------------------------------------------------------
  */

  settings: {
    playerHeight: 1.7,

    movementSpeed: 4,

    runningSpeed: 7,

    mouseSensitivity: 0.002,

    cameraFov: 75,

    cameraNear: 0.1,

    cameraFar: 1000,

    mobileJoystickEnabled: true,

    mobileSwipeEnabled: true,

    forceLandscapeOnMobile: true,

    mapEnabled: true,

    minimapEnabled: true,

    productInteractionEnabled: true,

    productInteractionDistance: 3,

    backgroundMusicEnabled: false,

    backgroundMusicUrl: "",

    ambientSoundEnabled: false,

    ambientSoundUrl: "",

    shadowsEnabled: true,

    antialiasingEnabled: true,

    maxPixelRatio: 2,

    enableLazyLoading: true,
  },

  /*
  |--------------------------------------------------------------------------
  | STATUS
  |--------------------------------------------------------------------------
  */

  isActive: true,

  /*
  | Keep false until the frontend has been tested.
  */

  isPublished: false,

  maintenanceMode: false,

  maintenanceMessage: "",

  version: 1,
};

/* =========================================================
   CREATE / UPDATE VIRTUAL MALL
   ========================================================= */

const createVirtualMall = async () => {
  try {
    /*
    |--------------------------------------------------------------------------
    | CONNECT MONGODB
    |--------------------------------------------------------------------------
    */

    console.log("");

    console.log(
      "========================================"
    );

    console.log(
      "   JIHAAN COSMETICS VIRTUAL MALL"
    );

    console.log(
      "========================================"
    );

    console.log("");

    console.log(
      "Connecting to MongoDB..."
    );

    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 15000,
    });

    console.log(
      "MongoDB connected successfully."
    );

    console.log(
      "Connected database:",
      mongoose.connection.name
    );

    console.log("");

    /*
    |--------------------------------------------------------------------------
    | FIND EXISTING MALL
    |--------------------------------------------------------------------------
    */

    let mall = await VirtualMall.findOne({
      slug: mallData.slug,
    });

    /*
    |--------------------------------------------------------------------------
    | UPDATE EXISTING MALL
    |--------------------------------------------------------------------------
    */

    if (mall) {
      console.log(
        "Virtual Mall already exists."
      );

      console.log(
        "Updating existing configuration..."
      );

      mall.name = mallData.name;

      mall.description =
        mallData.description;

      mall.logo = mallData.logo;

      mall.coverImage =
        mallData.coverImage;

      mall.thumbnailImage =
        mallData.thumbnailImage;

      mall.modelUrl =
        mallData.modelUrl;

      mall.modelType =
        mallData.modelType;

      mall.environmentMapUrl =
        mallData.environmentMapUrl;

      mall.skyboxUrl =
        mallData.skyboxUrl;

      mall.backgroundColor =
        mallData.backgroundColor;

      mall.floors =
        mallData.floors;

      mall.stores =
        mallData.stores;

      /*
      |--------------------------------------------------------------------------
      | IMPORTANT
      |--------------------------------------------------------------------------
      |
      | Do NOT overwrite productLocations
      | when updating the existing mall.
      |
      | This protects product placements that
      | we add later.
      |
      |--------------------------------------------------------------------------
      */

      mall.spawnPoint =
        mallData.spawnPoint;

      mall.settings =
        mallData.settings;

      mall.isActive =
        mallData.isActive;

      mall.maintenanceMode =
        mallData.maintenanceMode;

      mall.maintenanceMessage =
        mallData.maintenanceMessage;

      /*
      |--------------------------------------------------------------------------
      | DO NOT AUTOMATICALLY PUBLISH
      |--------------------------------------------------------------------------
      */

      mall.isPublished = false;

      await mall.save();

      console.log(
        "✅ Existing Virtual Mall updated."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | CREATE NEW MALL
    |--------------------------------------------------------------------------
    */

    else {
      mall = await VirtualMall.create(
        mallData
      );

      console.log(
        "✅ Virtual Mall created successfully."
      );
    }

    /*
    |--------------------------------------------------------------------------
    | RESULT
    |--------------------------------------------------------------------------
    */

    console.log("");

    console.log(
      "----------------------------------------"
    );

    console.log(
      "Virtual Mall ID:",
      mall._id.toString()
    );

    console.log(
      "Mall Name:",
      mall.name
    );

    console.log(
      "Mall Slug:",
      mall.slug
    );

    console.log(
      "Stores:",
      mall.stores.length
    );

    console.log(
      "Floors:",
      mall.floors.length
    );

    console.log(
      "Product Locations:",
      mall.productLocations.length
    );

    console.log(
      "Published:",
      mall.isPublished
    );

    console.log(
      "Active:",
      mall.isActive
    );

    console.log(
      "Version:",
      mall.version
    );

    console.log(
      "----------------------------------------"
    );

    console.log("");

    /*
    |--------------------------------------------------------------------------
    | DISCONNECT
    |--------------------------------------------------------------------------
    */

    await mongoose.disconnect();

    console.log(
      "MongoDB disconnected."
    );

    console.log("");

    console.log(
      "✅ Virtual Mall setup completed successfully."
    );

    console.log("");

    process.exitCode = 0;
  } catch (error) {
    /*
    |--------------------------------------------------------------------------
    | ERROR
    |--------------------------------------------------------------------------
    */

    console.error("");

    console.error(
      "========================================"
    );

    console.error(
      "   VIRTUAL MALL SETUP FAILED"
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

createVirtualMall();