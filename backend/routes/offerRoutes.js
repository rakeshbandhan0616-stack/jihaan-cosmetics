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

import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

import offerUpload from "../middleware/offerUpload.js";

const router = express.Router();

/* =========================================================
   PUBLIC OFFER ROUTES
========================================================= */

/*
 * GET /api/offers
 *
 * Get all active offers.
 */
router.get(
  "/",
  getOffers
);


/* =========================================================
   ADMIN OFFER ROUTES
========================================================= */

/*
 * GET /api/offers/admin
 *
 * Get all offers including inactive offers.
 */
router.get(
  "/admin",
  protect,
  adminOnly,
  getAllOffers
);


/*
 * POST /api/offers
 *
 * Create offer.
 *
 * Upload fields:
 *
 * image
 * demoImage
 *
 * Files are uploaded to Cloudinary
 * inside offerController.
 */
router.post(
  "/",
  protect,
  adminOnly,
  offerUpload,
  createOffer
);


/*
 * GET /api/offers/:id
 *
 * Public single-offer details.
 */
router.get(
  "/:id",
  getOfferById
);


/*
 * PUT /api/offers/:id
 *
 * Admin-only offer update.
 *
 * Optional:
 *
 * image
 * demoImage
 */
router.put(
  "/:id",
  protect,
  adminOnly,
  offerUpload,
  updateOffer
);


/*
 * DELETE /api/offers/:id
 *
 * Admin-only.
 *
 * Controller should:
 * 1. Delete offer from MongoDB
 * 2. Delete associated Cloudinary images
 */
router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteOffer
);


/*
 * PATCH /api/offers/:id/toggle
 *
 * Admin-only active/inactive toggle.
 */
router.patch(
  "/:id/toggle",
  protect,
  adminOnly,
  toggleOffer
);


export default router;