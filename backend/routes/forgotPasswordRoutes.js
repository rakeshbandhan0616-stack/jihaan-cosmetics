// routes/forgotPasswordRoutes.js

import express from "express";

import {
  forgotPassword,
  verifyForgotPasswordOtp,
  resendForgotPasswordOtp,
  resetPassword,
} from "../controllers/forgotPasswordController.js";

const router = express.Router();

/* =========================================================
   FORGOT PASSWORD
========================================================= */

/*
  Step 1:
  Enter email and send OTP

  If this router is mounted as:

  app.use("/api", forgotPasswordRoutes);

  Endpoint becomes:

  POST /api/forgot-password
*/
router.post(
  "/forgot-password",
  forgotPassword
);

/*
  Step 2:
  Verify email OTP

  POST /api/forgot-password/verify-otp

  Body:
  {
    "email": "customer@example.com",
    "otp": "123456",
    "challengeId": "..."
  }

  Successful verification returns:
  {
    "success": true,
    "resetToken": "..."
  }
*/
router.post(
  "/forgot-password/verify-otp",
  verifyForgotPasswordOtp
);

/*
  Resend OTP

  POST /api/forgot-password/resend-otp

  Body:
  {
    "email": "customer@example.com"
  }

  The controller applies the configured
  60-second resend cooldown.
*/
router.post(
  "/forgot-password/resend-otp",
  resendForgotPasswordOtp
);

/*
  Step 3:
  Reset password using resetToken

  POST /api/reset-password

  Body:
  {
    "resetToken": "...",
    "newPassword": "newpassword",
    "confirmPassword": "newpassword"
  }

  The resetToken is NOT the normal login JWT.
*/
router.post(
  "/reset-password",
  resetPassword
);

/* =========================================================
   EXPORT ROUTER
========================================================= */

export default router;