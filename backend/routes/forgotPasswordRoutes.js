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

  POST /api/forgot-password
*/
router.post(
  "/forgot-password",
  forgotPassword
);

/*
  Step 2:
  Verify OTP

  POST /api/forgot-password/verify-otp
*/
router.post(
  "/forgot-password/verify-otp",
  verifyForgotPasswordOtp
);

/*
  Resend OTP

  POST /api/forgot-password/resend-otp
*/
router.post(
  "/forgot-password/resend-otp",
  resendForgotPasswordOtp
);

/*
  Step 3:
  Reset password

  POST /api/forgot-password/reset-password
*/
router.post(
  "/forgot-password/reset-password",
  resetPassword
);

export default router;