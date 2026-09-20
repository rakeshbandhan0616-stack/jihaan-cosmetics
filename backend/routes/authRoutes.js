import express from "express";

import {
  adminLogin,
  registerUser,
  userLogin,
  logoutUser,
  getCurrentUser,
  updateProfile,
  updateStaffProfile,
  changePassword,
} from "../controllers/authController.js";

import {
  protect,
  userOnly,
  staffOnly,
} from "../middleware/authMiddleware.js";

import userUpload from "../middleware/userUpload.js";

const router = express.Router();

/* =========================================================
   STAFF / ADMIN LOGIN
   =========================================================

   Supported staff roles:

   - superadmin
   - admin
   - accounts
   - logistics

   POST /api/auth/admin-login

   IMPORTANT:
   This route must remain PUBLIC because the user
   does not have a JWT before logging in.

   Role verification is handled inside adminLogin().
   ========================================================= */

router.post(
  "/admin-login",
  adminLogin
);

/* =========================================================
   USER REGISTRATION
   =========================================================

   POST /api/auth/register

   Public customer registration.

   Public registration can only create:
   role = user

   Profile image is optional.
   ========================================================= */

router.post(
  "/register",
  userUpload.single("profileImage"),
  registerUser
);

/* =========================================================
   CUSTOMER LOGIN
   =========================================================

   POST /api/auth/login

   This endpoint is ONLY for normal customers.

   The controller restricts authentication to:
   role = user
   ========================================================= */

router.post(
  "/login",
  userLogin
);

/* =========================================================
   LOGOUT
   =========================================================

   POST /api/auth/logout

   Works for both customer and staff sessions because
   authentication is stored in the same HTTP-only cookie.
   ========================================================= */

router.post(
  "/logout",
  logoutUser
);

/* =========================================================
   CURRENT CUSTOMER
   =========================================================

   GET /api/auth/me

   Only normal customer accounts can access this endpoint.

   Staff applications should NOT use this endpoint because
   userOnly intentionally blocks staff roles.
   ========================================================= */

router.get(
  "/me",
  protect,
  userOnly,
  getCurrentUser
);

/* =========================================================
   CURRENT STAFF
   =========================================================

   GET /api/auth/staff/me

   Used by the staff portal to verify the HTTP-only
   authentication cookie and retrieve the current staff user.

   Supported roles:

   - superadmin
   - admin
   - accounts
   - logistics
   ========================================================= */

router.get(
  "/staff/me",
  protect,
  staffOnly,
  getCurrentUser
);

/* =========================================================
   CUSTOMER PROFILE
   =========================================================

   PUT /api/auth/profile

   Customers only.

   Supports:
   - name
   - email
   - phone
   - profile image
   ========================================================= */

router.put(
  "/profile",
  protect,
  userOnly,
  userUpload.single("profileImage"),
  updateProfile
);

/* =========================================================
   STAFF PROFILE
   =========================================================

   PUT /api/auth/staff/profile

   Staff only.

   Supported staff roles:

   - superadmin
   - admin
   - accounts
   - logistics

   Supports:
   - name
   - email

   The controller validates the email and prevents
   duplicate email addresses.
   ========================================================= */

router.put(
  "/staff/profile",
  protect,
  staffOnly,
  updateStaffProfile
);

/* =========================================================
   CUSTOMER CHANGE PASSWORD
   =========================================================

   PUT /api/auth/change-password

   Customers only.
   ========================================================= */

router.put(
  "/change-password",
  protect,
  userOnly,
  changePassword
);

/* =========================================================
   STAFF CHANGE PASSWORD
   =========================================================

   PUT /api/auth/staff/change-password

   Staff only.

   Supported staff roles:

   - superadmin
   - admin
   - accounts
   - logistics

   Uses the same changePassword controller, which updates
   the authenticated user's password after validating the
   current password.
   ========================================================= */

router.put(
  "/staff/change-password",
  protect,
  staffOnly,
  changePassword
);

/* =========================================================
   EXPORT
   ========================================================= */

export default router;