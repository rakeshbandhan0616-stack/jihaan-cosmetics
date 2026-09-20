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

// Public routes
router.get("/", getActiveHeroBanners);

// Admin route
router.get("/admin", getAllHeroBanners);

// Single banner
router.get("/:id", getHeroBannerById);

// Create banner with desktop/mobile files
router.post("/", uploadHeroBannerFiles, createHeroBanner);

// Update banner with optional replacement files
router.put("/:id", uploadHeroBannerFiles, updateHeroBanner);

// Delete banner
router.delete("/:id", deleteHeroBanner);

// Toggle active status
router.patch("/:id/toggle", toggleHeroBanner);

export default router;