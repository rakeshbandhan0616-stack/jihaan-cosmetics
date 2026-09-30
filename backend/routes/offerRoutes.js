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
 *
 * IMPORTANT:
 * Keep /admin before /:id.
 */
router.get(
  "/admin",
  protect,
  adminOnly,
  getAllOffers
);


/* =========================================================
   CREATE OFFER
========================================================= */

/*
 * POST /api/offers
 *
 * Admin only.
 *
 * offerUpload already handles:
 *
 *   image
 *   demoImage
 *
 * It uses multer.memoryStorage().
 * The controller uploads the buffers to Cloudinary.
 */
router.post(
  "/",
  protect,
  adminOnly,
  offerUpload,
  createOffer
);


/* =========================================================
   GET OFFER BY ID
========================================================= */

/*
 * GET /api/offers/:id
 *
 * Public single offer.
 */
router.get(
  "/:id",
  getOfferById
);


/* =========================================================
   UPDATE OFFER
========================================================= */

/*
 * PUT /api/offers/:id
 *
 * Admin only.
 *
 * Optional replacement files:
 *
 *   image
 *   demoImage
 *
 * offerUpload already contains .fields(),
 * therefore DO NOT use:
 *
 *   offerUpload.fields(...)
 */
router.put(
  "/:id",
  protect,
  adminOnly,
  offerUpload,
  updateOffer
);


/* =========================================================
   DELETE OFFER
========================================================= */

/*
 * DELETE /api/offers/:id
 *
 * Admin only.
 */
router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteOffer
);


/* =========================================================
   TOGGLE OFFER
========================================================= */

/*
 * PATCH /api/offers/:id/toggle
 *
 * Admin only.
 */
router.patch(
  "/:id/toggle",
  protect,
  adminOnly,
  toggleOffer
);


/* =========================================================
   EXPORT
========================================================= */

export default router;