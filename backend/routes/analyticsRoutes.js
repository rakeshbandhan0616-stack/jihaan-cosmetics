import express from "express";

import {
  getAnalyticsOverview,
  getSalesAnalytics,
  getOrderAnalytics,
  getProductAnalytics,
  getCustomerAnalytics,
  getInventoryAnalytics,
  getReviewAnalytics,
} from "../controllers/analyticsController.js";

import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get("/overview", getAnalyticsOverview);
router.get("/sales", getSalesAnalytics);
router.get("/orders", getOrderAnalytics);
router.get("/products", getProductAnalytics);
router.get("/customers", getCustomerAnalytics);
router.get("/inventory", getInventoryAnalytics);
router.get("/reviews", getReviewAnalytics);

export default router;