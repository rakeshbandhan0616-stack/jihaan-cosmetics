import express from "express";

import {
  protect,
  managementOnly,
} from "../middleware/authMiddleware.js";

import {
  getVirtualMall,
  getVirtualMallBySlug,
  getMallStores,
  getMallStore,
  getStoreProducts,
  getProductLocation,
  checkProductAvailability,

  getAllVirtualMalls,
  getVirtualMallById,
  createVirtualMall,
  updateVirtualMall,
  deleteVirtualMall,

  addStore,
  updateStore,
  deleteStore,

  addProductLocation,
  updateProductLocation,
  deleteProductLocation,
  updateProductPosition,

  updateSpawnPoint,
  updateMallSettings,

  publishVirtualMall,
  unpublishVirtualMall,
  updateMaintenanceMode,
} from "../controllers/virtualMallController.js";

const router = express.Router();

/* =========================================================
   PUBLIC VIRTUAL MALL ROUTES
========================================================= */

// Get currently published/active mall
router.get("/", getVirtualMall);

// Get mall by slug
router.get("/slug/:slug", getVirtualMallBySlug);

// Get all active stores
router.get("/stores", getMallStores);

// Get single store
router.get("/stores/:storeId", getMallStore);

// Get products displayed inside a store
router.get("/stores/:storeId/products", getStoreProducts);

// Get product location inside mall
router.get("/products/:productId", getProductLocation);

// Check whether product is available in mall
router.get(
  "/products/:productId/availability",
  checkProductAvailability
);


/* =========================================================
   ADMIN / SUPERADMIN VIRTUAL MALL ROUTES
========================================================= */

// All Virtual Malls
router.get(
  "/admin/all",
  protect,
  managementOnly,
  getAllVirtualMalls
);

// Get mall by MongoDB ID
router.get(
  "/admin/:mallId",
  protect,
  managementOnly,
  getVirtualMallById
);

// Create Virtual Mall
router.post(
  "/admin",
  protect,
  managementOnly,
  createVirtualMall
);

// Update Virtual Mall
router.put(
  "/admin/:mallId",
  protect,
  managementOnly,
  updateVirtualMall
);

// Delete Virtual Mall
router.delete(
  "/admin/:mallId",
  protect,
  managementOnly,
  deleteVirtualMall
);


/* =========================================================
   STORE MANAGEMENT
========================================================= */

// Add store
router.post(
  "/admin/:mallId/stores",
  protect,
  managementOnly,
  addStore
);

// Update store
router.put(
  "/admin/:mallId/stores/:storeId",
  protect,
  managementOnly,
  updateStore
);

// Delete store
router.delete(
  "/admin/:mallId/stores/:storeId",
  protect,
  managementOnly,
  deleteStore
);


/* =========================================================
   PRODUCT LOCATION MANAGEMENT
========================================================= */

// Add product to mall
router.post(
  "/admin/:mallId/product-location",
  protect,
  managementOnly,
  addProductLocation
);

// Update product location
router.put(
  "/admin/:mallId/product-location/:locationId",
  protect,
  managementOnly,
  updateProductLocation
);

// Delete product from mall
router.delete(
  "/admin/:mallId/product-location/:locationId",
  protect,
  managementOnly,
  deleteProductLocation
);

// Move product in 3D mall
router.patch(
  "/admin/:mallId/product-location/:locationId/position",
  protect,
  managementOnly,
  updateProductPosition
);


/* =========================================================
   MALL CONFIGURATION
========================================================= */

// Update player spawn point
router.put(
  "/admin/:mallId/spawn-point",
  protect,
  managementOnly,
  updateSpawnPoint
);

// Update mall settings
router.put(
  "/admin/:mallId/settings",
  protect,
  managementOnly,
  updateMallSettings
);


/* =========================================================
   PUBLISH / UNPUBLISH
========================================================= */

// Publish mall
router.patch(
  "/admin/:mallId/publish",
  protect,
  managementOnly,
  publishVirtualMall
);

// Unpublish mall
router.patch(
  "/admin/:mallId/unpublish",
  protect,
  managementOnly,
  unpublishVirtualMall
);


/* =========================================================
   MAINTENANCE MODE
========================================================= */

router.patch(
  "/admin/:mallId/maintenance",
  protect,
  managementOnly,
  updateMaintenanceMode
);


export default router;