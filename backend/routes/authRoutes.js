import express from "express";

import {
  adminLogin,
  registerUser,
  userLogin,

  /* =========================================================
     SOCIAL AUTHENTICATION
  ========================================================= */

  googleLogin,
  facebookLogin,
  sendSocialOtp,
  completeSocialRegistration,

  /* =========================================================
     PASSWORD RESET
  ========================================================= */

  forgotPassword,
  verifyForgotPasswordOtp,
  resetPassword,

  /* =========================================================
     SESSION / PROFILE
  ========================================================= */

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
   This route remains PUBLIC because the user does not
   have a JWT before logging in.

   Role verification is handled inside adminLogin().
========================================================= */

router.post(
  "/admin-login",
  adminLogin,
);

/* =========================================================
   USER REGISTRATION
=========================================================

   POST /api/auth/register

   Public customer registration.

   Public registration can only create:

   role = user

   Profile image is optional.

   Authentication provider:

   authProvider = local
========================================================= */

router.post(
  "/register",
  userUpload.single(
    "profileImage",
  ),
  registerUser,
);

/* =========================================================
   CUSTOMER LOGIN
=========================================================

   POST /api/auth/login

   This endpoint is ONLY for normal customer login.

   Supported:

   - Email + password
   - Mobile + password

   The controller restricts authentication to:

   role = user
========================================================= */

router.post(
  "/login",
  userLogin,
);

/* =========================================================
   GOOGLE LOGIN
=========================================================

   POST /api/auth/google

   Public route.

   Frontend sends the Google Identity Services credential.

   Example:

   {
     "credential": "GOOGLE_ID_TOKEN"
   }

   Flow:

   Existing Google account
        ↓
   Login

   New Google account
        ↓
   Return socialToken
        ↓
   Ask mobile number
        ↓
   WhatsApp OTP
        ↓
   OTP verification
        ↓
   Complete registration
========================================================= */

router.post(
  "/google",
  googleLogin,
);

/* =========================================================
   FACEBOOK LOGIN
=========================================================

   POST /api/auth/facebook

   Public route.

   Frontend sends:

   {
     "accessToken": "FACEBOOK_ACCESS_TOKEN"
   }

   Backend:

   Facebook access token
        ↓
   Verify token
        ↓
   Get Facebook user information
        ↓
   Existing account → Login

   New account
        ↓
   Return socialToken
        ↓
   Ask mobile number
        ↓
   WhatsApp OTP
        ↓
   OTP verification
        ↓
   Complete registration
========================================================= */

router.post(
  "/facebook",
  facebookLogin,
);

/* =========================================================
   SEND SOCIAL REGISTRATION OTP
=========================================================

   POST /api/auth/social/send-otp

   Public route.

   Used after successful Google/Facebook
   authentication for a new customer.

   Body:

   {
     "socialToken": "...",
     "phone": "9876543210"
   }

   Flow:

   Google/Facebook
        ↓
   socialToken
        ↓
   Mobile number
        ↓
   Generate OTP
        ↓
   Send OTP through WhatsApp
        ↓
   Verify OTP
        ↓
   Create account

   Security:

   - OTP is generated on backend
   - OTP is hashed before storage
   - OTP expires after 5 minutes
   - Maximum 5 verification attempts
   - Resend cooldown is applied
   - OTP is never returned to frontend
========================================================= */

router.post(
  "/social/send-otp",
  sendSocialOtp,
);

/* =========================================================
   COMPLETE SOCIAL REGISTRATION
=========================================================

   POST /api/auth/social/complete

   Public route.

   Body:

   {
     "socialToken": "...",
     "phone": "9876543210",
     "otp": "123456"
   }

   Flow:

   Social account verified
        ↓
   Phone number submitted
        ↓
   WhatsApp OTP verified
        ↓
   Create customer
        ↓
   JWT + HTTP-only cookie
        ↓
   Login successful

   IMPORTANT:

   The controller does NOT trust any frontend
   "verified" flag.

   The OTP must match the backend-generated
   and stored OTP hash.
========================================================= */

router.post(
  "/social/complete",
  completeSocialRegistration,
);

/* =========================================================
   FORGOT PASSWORD - SEND OTP
=========================================================

   POST /api/auth/forgot-password

   Public route.

   Customer can provide:

   - Email
   OR
   - Mobile number

   Example:

   {
     "identifier": "customer@example.com"
   }

   OR:

   {
     "identifier": "9876543210"
   }

   Flow:

   Email / Mobile
        ↓
   Find customer account
        ↓
   Get registered mobile number
        ↓
   Generate OTP
        ↓
   Send OTP through WhatsApp
        ↓
   Verify OTP
        ↓
   Reset password

   SECURITY:

   The response is intentionally generic so that
   the API does not reveal whether an email or
   mobile number belongs to an account.
========================================================= */

router.post(
  "/forgot-password",
  forgotPassword,
);

/* =========================================================
   FORGOT PASSWORD - VERIFY OTP
=========================================================

   POST /api/auth/forgot-password/verify-otp

   Public route.

   Body:

   {
     "identifier": "customer@example.com",
     "otp": "123456"
   }

   OR:

   {
     "identifier": "9876543210",
     "otp": "123456"
   }

   Successful verification returns a short-lived
   password reset token.

   The reset token is NOT the normal login JWT.
========================================================= */

router.post(
  "/forgot-password/verify-otp",
  verifyForgotPasswordOtp,
);

/* =========================================================
   RESET PASSWORD
=========================================================

   POST /api/auth/reset-password

   Public route.

   Body:

   {
     "resetToken": "...",
     "newPassword": "newpassword",
     "confirmPassword": "newpassword"
   }

   Flow:

   Verified OTP
        ↓
   Short-lived resetToken
        ↓
   New password
        ↓
   Hash password
        ↓
   Save password
        ↓
   Password reset successful

   IMPORTANT:

   The reset token is short-lived and can only be
   used for the password reset flow.
========================================================= */

router.post(
  "/reset-password",
  resetPassword,
);

/* =========================================================
   LOGOUT
=========================================================

   POST /api/auth/logout

   Works for both customer and staff sessions because
   authentication is stored in the same HTTP-only cookie.

   This route is intentionally PUBLIC because the cookie
   can simply be cleared even if the session has expired.
========================================================= */

router.post(
  "/logout",
  logoutUser,
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
  getCurrentUser,
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
  getCurrentUser,
);

/* =========================================================
   CUSTOMER PROFILE
=========================================================

   PUT /api/auth/profile

   Customers only.

   Supports:

   - name
   - phone
   - profile image

   Email is intentionally not updated through this
   customer profile endpoint.
========================================================= */

router.put(
  "/profile",
  protect,
  userOnly,
  userUpload.single(
    "profileImage",
  ),
  updateProfile,
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

   Role, permissions, active status, blocked status,
   and password cannot be changed here.
========================================================= */

router.put(
  "/staff/profile",
  protect,
  staffOnly,
  updateStaffProfile,
);

/* =========================================================
   CUSTOMER CHANGE PASSWORD
=========================================================

   PUT /api/auth/change-password

   Customers only.

   Local accounts can change their password.

   Social-only accounts without a local password will
   receive a social-account response from the controller.
========================================================= */

router.put(
  "/change-password",
  protect,
  userOnly,
  changePassword,
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
  changePassword,
);

/* =========================================================
   EXPORT ROUTER
========================================================= */

export default router;