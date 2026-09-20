import express from "express";

import {
  getAccount,
  updateAccountProfile,
  updatePassword,
  logoutAccount,
} from "../controllers/accountController.js";

import {
  protect,
  userOnly,
} from "../middleware/authMiddleware.js";

import upload from "../middleware/uploadMiddleware.js";

const router = express.Router();

/**
 * Get logged-in user's account information
 */
router.get(
  "/me",
  protect,
  userOnly,
  getAccount,
);

/**
 * Update profile information and profile image
 */
router.put(
  "/profile",
  protect,
  userOnly,
  upload.single("profileImage"),
  updateAccountProfile,
);

/**
 * Change account password
 */
router.put(
  "/change-password",
  protect,
  userOnly,
  updatePassword,
);

/**
 * Logout account
 */
router.post(
  "/logout",
  logoutAccount,
);

export default router;