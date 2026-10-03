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
// GET /api/virtual-mall
router.get("/", getVirtualMall);

// Get all active stores
// GET /api/virtual-mall/stores
router.get("/stores", getMallStores);

// Get single store
// GET /api/virtual-mall/stores/:storeId
router.get("/stores/:storeId", getMallStore);

// Get products displayed inside a store
// GET /api/virtual-mall/stores/:storeId/products
router.get(
  "/stores/:storeId/products",
  getStoreProducts
);

// Get product location inside mall
// GET /api/virtual-mall/products/:productId
router.get(
  "/products/:productId",
  getProductLocation
);

// Check whether product is available in mall
// GET /api/virtual-mall/products/:productId/availability
router.get(
  "/products/:productId/availability",
  checkProductAvailability
);


/* =========================================================
   ADMIN / SUPERADMIN VIRTUAL MALL ROUTES
========================================================= */

// Get all Virtual Malls
// GET /api/virtual-mall/admin/all
router.get(
  "/admin/all",
  protect,
  managementOnly,
  getAllVirtualMalls
);

// Get Virtual Mall by MongoDB ID
// GET /api/virtual-mall/admin/:mallId
router.get(
  "/admin/:mallId",
  protect,
  managementOnly,
  getVirtualMallById
);

// Create Virtual Mall
// POST /api/virtual-mall/admin
router.post(
  "/admin",
  protect,
  managementOnly,
  createVirtualMall
);

// Update Virtual Mall
// PUT /api/virtual-mall/admin/:mallId
router.put(
  "/admin/:mallId",
  protect,
  managementOnly,
  updateVirtualMall
);

// Delete Virtual Mall
// DELETE /api/virtual-mall/admin/:mallId
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
// POST /api/virtual-mall/admin/:mallId/stores
router.post(
  "/admin/:mallId/stores",
  protect,
  managementOnly,
  addStore
);

// Update store
// PUT /api/virtual-mall/admin/:mallId/stores/:storeId
router.put(
  "/admin/:mallId/stores/:storeId",
  protect,
  managementOnly,
  updateStore
);

// Delete store
// DELETE /api/virtual-mall/admin/:mallId/stores/:storeId
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
// POST /api/virtual-mall/admin/:mallId/product-location
router.post(
  "/admin/:mallId/product-location",
  protect,
  managementOnly,
  addProductLocation
);

// Update product location
// PUT /api/virtual-mall/admin/:mallId/product-location/:locationId
router.put(
  "/admin/:mallId/product-location/:locationId",
  protect,
  managementOnly,
  updateProductLocation
);

// Delete product from mall
// DELETE /api/virtual-mall/admin/:mallId/product-location/:locationId
router.delete(
  "/admin/:mallId/product-location/:locationId",
  protect,
  managementOnly,
  deleteProductLocation
);

// Move product in 3D mall
// PATCH /api/virtual-mall/admin/:mallId/product-location/:locationId/position
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
// PUT /api/virtual-mall/admin/:mallId/spawn-point
router.put(
  "/admin/:mallId/spawn-point",
  protect,
  managementOnly,
  updateSpawnPoint
);

// Update mall settings
// PUT /api/virtual-mall/admin/:mallId/settings
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
// PATCH /api/virtual-mall/admin/:mallId/publish
router.patch(
  "/admin/:mallId/publish",
  protect,
  managementOnly,
  publishVirtualMall
);

// Unpublish mall
// PATCH /api/virtual-mall/admin/:mallId/unpublish
router.patch(
  "/admin/:mallId/unpublish",
  protect,
  managementOnly,
  unpublishVirtualMall
);


/* =========================================================
   MAINTENANCE MODE
========================================================= */

// Update maintenance mode
// PATCH /api/virtual-mall/admin/:mallId/maintenance
router.patch(
  "/admin/:mallId/maintenance",
  protect,
  managementOnly,
  updateMaintenanceMode
);


/* =========================================================
   GET VIRTUAL MALL BY SLUG
========================================================= */

// IMPORTANT:
// This route must remain AFTER the specific routes above.
//
// Frontend request:
// GET /api/virtual-mall/jini-cosmetics-virtual-mall
//
// This becomes:
// req.params.slug = "jini-cosmetics-virtual-mall"

router.get(
  "/:slug",
  getVirtualMallBySlug
);


export default router;