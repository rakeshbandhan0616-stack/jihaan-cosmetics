import express from "express";

import {
  getActiveHeroBanners,
  getAllHeroBanners,
  getHeroBannerById,
  createHeroBanner,
  updateHeroBanner,
  deleteHeroBanner,
  toggleHeroBanner,
} from "../controllers/heroBannerController.js";

import heroBannerUpload from "../middleware/heroBannerUpload.js";

const router = express.Router();

// ============================================================
// HERO BANNER UPLOAD
// ============================================================
// desktopSrc = Desktop banner
// mobileSrc  = Mobile banner
//
// heroBannerUpload uses memoryStorage(), so files are
// temporarily kept in memory and then uploaded to Cloudinary
// by heroBannerController.js.
// ============================================================
const uploadHeroBannerFiles = heroBannerUpload.fields([
  {
    name: "desktopSrc",
    maxCount: 1,
  },
  {
    name: "mobileSrc",
    maxCount: 1,
  },
]);

// ============================================================
// PUBLIC ROUTES
// ============================================================

// Get only active hero banners
router.get(
  "/",
  getActiveHeroBanners
);

// Get a single hero banner
router.get(
  "/:id",
  getHeroBannerById
);

// ============================================================
// ADMIN / MANAGEMENT ROUTES
// ============================================================

// Get all hero banners
router.get(
  "/admin",
  getAllHeroBanners
);

// Create hero banner
router.post(
  "/",
  uploadHeroBannerFiles,
  createHeroBanner
);

// Update hero banner
router.put(
  "/:id",
  uploadHeroBannerFiles,
  updateHeroBanner
);

// Delete hero banner
router.delete(
  "/:id",
  deleteHeroBanner
);

// Activate / deactivate hero banner
router.patch(
  "/:id/toggle",
  toggleHeroBanner
);

export default router;