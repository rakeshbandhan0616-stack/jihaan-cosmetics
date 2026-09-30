import express from "express";

import {
  getOffers,
  getAllOffers,
  getOfferById,
  createOffer,
  updateOffer,
  deleteOffer,
  toggleOffer,
} from "../controllers/offerController.js";

import offerUpload from "../middleware/offerUpload.js";

const router = express.Router();

/**
 * Public routes
 */

// Get all active offers
router.get("/", getOffers);

/**
 * Admin routes
 */

// Get all offers, including inactive offers
// Keep this route before /:id
router.get("/admin", getAllOffers);

/**
 * Offer management routes
 */

// Create a new offer with desktop image uploads
router.post(
  "/",
  offerUpload.fields([
    {
      name: "image",
      maxCount: 1,
    },
    {
      name: "demoImage",
      maxCount: 1,
    },
  ]),
  createOffer
);

// Get one offer by ID
router.get("/:id", getOfferById);

// Update an offer by ID with optional image replacement
router.put(
  "/:id",
  offerUpload.fields([
    {
      name: "image",
      maxCount: 1,
    },
    {
      name: "demoImage",
      maxCount: 1,
    },
  ]),
  updateOffer
);

// Delete an offer by ID
router.delete("/:id", deleteOffer);

// Toggle offer active/inactive status
router.patch("/:id/toggle", toggleOffer);

export default router;