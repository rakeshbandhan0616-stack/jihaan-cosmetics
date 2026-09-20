import express from "express";

import {
  getAllReviews,
  getReviewStats,
  getProductReviewsAdmin,
  deleteReview,
} from "../controllers/reviewController.js";

import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get("/", getAllReviews);
router.get("/stats", getReviewStats);
router.get("/:productId", getProductReviewsAdmin);
router.delete("/:productId/:reviewId", deleteReview);

export default router;