import express from "express";

import {
  createOrder,
  getMyOrders,
  getOrderById,
  cancelOrder,
  requestReturn,
} from "../controllers/orderController.js";

import {
  protect,
  userOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   USER ORDER AUTHENTICATION
========================================================= */

// All customer order routes require authentication.
router.use(protect);

// Only normal users can access these routes.
router.use(userOnly);

/* =========================================================
   CREATE ORDER
========================================================= */

// POST /api/orders
router.post("/", createOrder);

/* =========================================================
   GET LOGGED-IN USER ORDERS
========================================================= */

// GET /api/orders/my-orders
router.get("/my-orders", getMyOrders);

/* =========================================================
   GET SINGLE USER ORDER
========================================================= */

// GET /api/orders/:id
router.get("/:id", getOrderById);

/* =========================================================
   CANCEL ORDER
========================================================= */

// PUT /api/orders/:id/cancel
router.put("/:id/cancel", cancelOrder);

/* =========================================================
   REQUEST RETURN
========================================================= */

// PUT /api/orders/:id/return
router.put("/:id/return", requestReturn);

export default router;