import express from "express";

import {
  getAdminProfile,
  updateAdminProfile,
} from "../controllers/adminAccountController.js";

import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| ADMIN ACCOUNT ROUTES
|--------------------------------------------------------------------------
|
| Base URL:
| /api/admin/account
|
| Authentication:
| - JWT required
| - Admin and Super Admin only
|
| Available endpoints:
|
| GET  /api/admin/account/profile
| PUT  /api/admin/account/profile
|
|--------------------------------------------------------------------------
*/

/**
 * GET /api/admin/account/profile
 *
 * Get the profile of the currently authenticated
 * admin or superadmin.
 *
 * Authentication:
 * protect
 *
 * Authorization:
 * adminOnly
 */
router.get(
  "/profile",
  protect,
  adminOnly,
  getAdminProfile,
);

/**
 * PUT /api/admin/account/profile
 *
 * Update the profile of the currently authenticated
 * admin or superadmin.
 *
 * Updatable fields:
 * - name
 * - email
 * - phone
 *
 * Protected fields:
 * - role
 * - isActive
 * - lastLoginAt
 * - lastLoginIp
 *
 * Authentication:
 * protect
 *
 * Authorization:
 * adminOnly
 */
router.put(
  "/profile",
  protect,
  adminOnly,
  updateAdminProfile,
);

export default router;