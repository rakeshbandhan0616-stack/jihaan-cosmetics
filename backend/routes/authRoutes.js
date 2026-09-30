import express from "express";

import {
  /* =========================================================
     STAFF / ADMIN LOGIN
  ========================================================= */

  adminLogin,

  /* =========================================================
     CUSTOMER REGISTRATION / LOGIN
  ========================================================= */

  registerUser,
  verifyRegistrationOtp,
  resendRegistrationOtp,
  userLogin,

  /* =========================================================
     SOCIAL AUTHENTICATION

     Google/Facebook users are created and logged in
     immediately.

     NO email OTP.
     NO WhatsApp OTP.
  ========================================================= */

  googleLogin,
  facebookLogin,

  /* =========================================================
     PASSWORD RESET

     Email OTP is used.

     NO WhatsApp OTP.
  ========================================================= */

  forgotPassword,
  resendForgotPasswordOtp,
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

   POST /api/auth/admin-login

   Supported staff roles:

   - superadmin
   - admin
   - accounts
   - logistics

   This route is PUBLIC because the user does not
   have a JWT before logging in.

   Role verification is handled inside adminLogin().
========================================================= */

router.post(
  "/admin-login",
  adminLogin,
);

/* =========================================================
   USER REGISTRATION - SEND EMAIL OTP
=========================================================

   POST /api/auth/register

   Public customer registration.

   Expected multipart/form-data or JSON:

   {
     "name": "Customer Name",
     "email": "customer@example.com",
     "phone": "9876543210",
     "password": "password"
   }

   Optional multipart field:

   profileImage

   Flow:

   Registration details
          ↓
   Validate details
          ↓
   Check duplicate account
          ↓
   Generate email OTP
          ↓
   Send OTP to email
          ↓
   Wait for verification
          ↓
   /register/verify-otp
          ↓
   Create account
          ↓
   Login

   IMPORTANT:

   The account is NOT created before the
   email OTP is successfully verified.

   NO WhatsApp OTP.
========================================================= */

router.post(
  "/register",
  userUpload.single("profileImage"),
  registerUser,
);

/* =========================================================
   USER REGISTRATION - VERIFY EMAIL OTP
=========================================================

   POST /api/auth/register/verify-otp

   Body:

   {
     "email": "customer@example.com",
     "otp": "123456"
   }

   Successful verification:

   - Creates the customer account
   - Marks email as verified
   - Generates JWT
   - Logs the user in
========================================================= */

router.post(
  "/register/verify-otp",
  verifyRegistrationOtp,
);

/* =========================================================
   USER REGISTRATION - RESEND EMAIL OTP
=========================================================

   POST /api/auth/register/resend-otp

   Body:

   {
     "email": "customer@example.com"
   }

   The backend applies the configured OTP
   resend cooldown.
========================================================= */

router.post(
  "/register/resend-otp",
  resendRegistrationOtp,
);

/* =========================================================
   CUSTOMER LOGIN
=========================================================

   POST /api/auth/login

   Supported:

   - Email + password
   - Mobile + password

   Authentication is handled by userLogin().

   Normal customer accounts use the "user" role.
========================================================= */

router.post(
  "/login",
  userLogin,
);

/* =========================================================
   GOOGLE LOGIN
=========================================================

   POST /api/auth/google

   Frontend sends:

   {
     "credential": "GOOGLE_ID_TOKEN"
   }

   Flow:

   Existing Google account
          ↓
       Login

   Existing email account
          ↓
   Link Google account
          ↓
       Login

   New Google account
          ↓
   Create account immediately
          ↓
       Login

   IMPORTANT:

   Google authentication is sufficient for
   account creation/login.

   There is NO:

   - email OTP
   - phone OTP
   - WhatsApp OTP
   - social registration completion step
========================================================= */

router.post(
  "/google",
  googleLogin,
);

/* =========================================================
   FACEBOOK LOGIN
=========================================================

   POST /api/auth/facebook

   Frontend sends:

   {
     "accessToken": "FACEBOOK_ACCESS_TOKEN"
   }

   Flow:

   Existing Facebook account
          ↓
       Login

   Existing email account
          ↓
   Link Facebook account
          ↓
       Login

   New Facebook account
          ↓
   Create account immediately
          ↓
       Login

   IMPORTANT:

   There is NO:

   - email OTP
   - phone OTP
   - WhatsApp OTP
   - social registration completion step
========================================================= */

router.post(
  "/facebook",
  facebookLogin,
);

/* =========================================================
   FORGOT PASSWORD - SEND EMAIL OTP
=========================================================

   POST /api/auth/forgot-password

   Body:

   {
     "email": "customer@example.com"
   }

   Flow:

   Email
      ↓
   Find customer
      ↓
   Generate OTP
      ↓
   Send OTP to email
      ↓
   Verify OTP
      ↓
   Receive password reset token
      ↓
   Set new password

   IMPORTANT:

   WhatsApp OTP is NOT used.
========================================================= */

router.post(
  "/forgot-password",
  forgotPassword,
);

/* =========================================================
   FORGOT PASSWORD - RESEND EMAIL OTP
=========================================================

   POST /api/auth/forgot-password/resend-otp

   Body:

   {
     "email": "customer@example.com"
   }

   The backend applies the configured OTP
   resend cooldown.
========================================================= */

router.post(
  "/forgot-password/resend-otp",
  resendForgotPasswordOtp,
);

/* =========================================================
   FORGOT PASSWORD - VERIFY EMAIL OTP
=========================================================

   POST /api/auth/forgot-password/verify-otp

   Body:

   {
     "email": "customer@example.com",
     "otp": "123456"
   }

   Successful verification returns a short-lived
   password reset token.

   Example:

   {
     "success": true,
     "message": "...",
     "resetToken": "...",
     "expiresIn": 600
   }

   IMPORTANT:

   resetToken is NOT the normal login JWT.

   It can only be used with:
   POST /reset-password
========================================================= */

router.post(
  "/forgot-password/verify-otp",
  verifyForgotPasswordOtp,
);

/* =========================================================
   RESET PASSWORD
=========================================================

   POST /api/auth/reset-password

   Body:

   {
     "resetToken": "...",
     "newPassword": "newpassword"
   }

   The controller also supports "password" / "token"
   aliases where configured.

   Flow:

   Verified email OTP
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

   This route is PUBLIC because the resetToken
   itself authorizes the password reset.
========================================================= */

router.post(
  "/reset-password",
  resetPassword,
);

/* =========================================================
   LOGOUT
=========================================================

   POST /api/auth/logout

   The controller handles the logout operation.

   This route is intentionally public so that the
   frontend can safely call logout even if the JWT
   has already expired.
========================================================= */

router.post(
  "/logout",
  logoutUser,
);

/* =========================================================
   CURRENT CUSTOMER
=========================================================

   GET /api/auth/me

   Middleware:

   protect
      ↓
   userOnly
      ↓
   getCurrentUser

   Only normal customers can access this endpoint.

   Legacy "customer" role is also supported by
   userOnly() for existing accounts.
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

   Email is intentionally not changed here.

   Phone verification is NOT automatically completed
   merely by changing the phone number.
========================================================= */

router.put(
  "/profile",
  protect,
  userOnly,
  userUpload.single("profileImage"),
  updateProfile,
);

/* =========================================================
   STAFF PROFILE
=========================================================

   PUT /api/auth/staff/profile

   Staff only.

   Supported:

   - name
   - phone
   - profile image
   - department
   - designation

   Role, permissions, active status, blocked status,
   and password are not changed here.
========================================================= */

router.put(
  "/staff/profile",
  protect,
  staffOnly,
  userUpload.single("profileImage"),
  updateStaffProfile,
);

/* =========================================================
   CUSTOMER CHANGE PASSWORD
=========================================================

   PUT /api/auth/change-password

   Customers only.

   Requires authentication.

   Body:

   {
     "currentPassword": "...",
     "newPassword": "..."
   }

   Social-only users without a password should use
   the forgot-password flow to create a password.
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

   Supported:

   - superadmin
   - admin
   - accounts
   - logistics

   Requires:

   protect
      ↓
   staffOnly
      ↓
   changePassword
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