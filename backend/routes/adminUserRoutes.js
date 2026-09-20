import express from "express";

import {
  getAllUsersAdmin,
  getAdminUserById,
  updateUserAdmin,
  toggleUserBlockAdmin,
  resetUserPasswordAdmin,
} from "../controllers/adminUserController.js";

import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   ADMIN AUTHENTICATION
   All routes below require a valid admin/superadmin token
========================================================= */

router.use(protect);
router.use(adminOnly);

/* =========================================================
   USER MANAGEMENT ROUTES
========================================================= */

// Get all registered users
// GET /api/admin/users
router.get("/", getAllUsersAdmin);

// Get one user by ID
// GET /api/admin/users/:id
router.get("/:id", getAdminUserById);

// Update user information
// PUT /api/admin/users/:id
router.put("/:id", updateUserAdmin);

// Block or unblock a user
// PUT /api/admin/users/:id/block
router.put("/:id/block", toggleUserBlockAdmin);

// Reset a user's password
// PUT /api/admin/users/:id/reset-password
router.put(
  "/:id/reset-password",
  resetUserPasswordAdmin,
);

export default router;