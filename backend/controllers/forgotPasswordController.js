// controllers/forgotPasswordController.js

import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import nodemailer from "nodemailer";

import User from "../models/User.js";

/* =========================================================
   CONFIGURATION
========================================================= */

const CUSTOMER_ROLE = "user";

const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;
const OTP_RESEND_COOLDOWN_SECONDS = 60;

const PASSWORD_RESET_EXPIRY = "15m";

const OTP_COLLECTION_NAME = "emailotpverifications";

/* =========================================================
   SMTP CONFIGURATION
   GoDaddy Professional Email / Titan
========================================================= */

const SMTP_HOST =
  process.env.SMTP_HOST || "smtpout.secureserver.net";

const SMTP_PORT = Number(process.env.SMTP_PORT || 465);

const SMTP_SECURE =
  String(process.env.SMTP_SECURE || "true").toLowerCase() === "true";

const SMTP_USER =
  process.env.SMTP_USER || "no-reply@jinicosmetics.com";

const SMTP_PASS =
  process.env.SMTP_PASS || "";

const SMTP_FROM =
  process.env.SMTP_FROM ||
  SMTP_USER ||
  "no-reply@jinicosmetics.com";

/* =========================================================
   SMTP TRANSPORTER
========================================================= */

const emailTransporter = nodemailer.createTransport({
  host: SMTP_HOST,
  port: SMTP_PORT,
  secure: SMTP_SECURE,

  auth: {
    user: SMTP_USER,
    pass: SMTP_PASS,
  },

  pool: true,

  maxConnections: 3,
  maxMessages: 50,

  connectionTimeout: 10000,
  greetingTimeout: 10000,
  socketTimeout: 15000,
});

/* =========================================================
   SMTP CONNECTION CHECK
========================================================= */

if (SMTP_USER && SMTP_PASS) {
  emailTransporter
    .verify()
    .then(() => {
      console.log(
        "✅ Forgot Password SMTP connection verified"
      );
    })
    .catch((error) => {
      console.error(
        "❌ Forgot Password SMTP connection failed:",
        error?.message || error
      );
    });
} else {
  console.warn(
    "⚠️ SMTP_USER or SMTP_PASS is missing. Forgot password emails cannot be sent."
  );
}

/* =========================================================
   HELPERS
========================================================= */

/**
 * Normalize email
 */
const normalizeEmail = (email) => {
  return String(email || "")
    .trim()
    .toLowerCase();
};

/**
 * Generate numeric OTP
 */
const generateOtp = () => {
  const min = 10 ** (OTP_LENGTH - 1);
  const max = 10 ** OTP_LENGTH - 1;

  return String(
    crypto.randomInt(min, max + 1)
  );
};

/**
 * Hash OTP
 */
const hashOtp = async (otp) => {
  return bcrypt.hash(otp, 10);
};

/**
 * Verify OTP
 */
const compareOtp = async (otp, hashedOtp) => {
  return bcrypt.compare(otp, hashedOtp);
};

/**
 * Get OTP collection
 */
const getEmailOtpCollection = () => {
  const db = mongoose.connection.db;

  if (!db) {
    throw new Error(
      "MongoDB connection is not ready."
    );
  }

  return db.collection(OTP_COLLECTION_NAME);
};

/**
 * Create indexes
 *
 * TTL index:
 * MongoDB automatically removes documents after expiresAt.
 */
const ensureOtpIndexes = async () => {
  try {
    const collection = getEmailOtpCollection();

    await collection.createIndex(
      {
        expiresAt: 1,
      },
      {
        expireAfterSeconds: 0,
        name: "email_otp_expiry_ttl",
      }
    );

    await collection.createIndex(
      {
        email: 1,
        purpose: 1,
        consumed: 1,
        createdAt: -1,
      },
      {
        name: "email_otp_lookup",
      }
    );
  } catch (error) {
    console.error(
      "OTP index creation error:",
      error?.message || error
    );
  }
};

/* =========================================================
   ACCOUNT STATUS
========================================================= */

const checkAccountStatus = (user) => {
  if (!user) {
    return {
      valid: false,
      message: "User account not found.",
    };
  }

  if (user.isBlocked === true) {
    return {
      valid: false,
      message:
        "Your account has been blocked. Please contact support.",
    };
  }

  if (
    user.isActive !== undefined &&
    user.isActive === false
  ) {
    return {
      valid: false,
      message:
        "Your account is inactive. Please contact support.",
    };
  }

  return {
    valid: true,
  };
};

/* =========================================================
   SEND FORGOT PASSWORD OTP EMAIL
========================================================= */

const sendForgotPasswordOtpEmail = async ({
  email,
  otp,
}) => {
  if (!SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "SMTP credentials are not configured."
    );
  }

  const mailOptions = {
    from: `"Jihaan Cosmetics" <${SMTP_FROM}>`,
    to: email,

    subject:
      "Your Jihaan Cosmetics Password Reset OTP",

    text: `
Your Jihaan Cosmetics password reset OTP is: ${otp}

This OTP is valid for ${OTP_EXPIRY_MINUTES} minutes.

If you did not request a password reset, please ignore this email.

Jihaan Cosmetics
`,

    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>Password Reset OTP</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:#f7f4f0;
    font-family:Arial,Helvetica,sans-serif;
  "
>

  <div
    style="
      width:100%;
      padding:40px 15px;
      box-sizing:border-box;
    "
  >

    <div
      style="
        max-width:560px;
        margin:0 auto;
        background:#ffffff;
        border-radius:16px;
        overflow:hidden;
        box-shadow:0 8px 30px rgba(0,0,0,0.08);
      "
    >

      <!-- Header -->

      <div
        style="
          padding:30px 25px;
          text-align:center;
          background:#211b17;
        "
      >

        <h1
          style="
            margin:0;
            color:#ffffff;
            font-size:26px;
            letter-spacing:1px;
          "
        >
          Jihaan Cosmetics
        </h1>

        <p
          style="
            margin:8px 0 0;
            color:#d9d0c8;
            font-size:13px;
          "
        >
          Beauty. Confidence. You.
        </p>

      </div>

      <!-- Content -->

      <div
        style="
          padding:35px 30px;
          color:#302a26;
        "
      >

        <h2
          style="
            margin:0 0 15px;
            font-size:22px;
          "
        >
          Password Reset Request
        </h2>

        <p
          style="
            margin:0 0 20px;
            font-size:15px;
            line-height:1.7;
            color:#5f5751;
          "
        >
          We received a request to reset your
          Jihaan Cosmetics account password.
        </p>

        <p
          style="
            margin:0 0 12px;
            font-size:14px;
            color:#5f5751;
          "
        >
          Your verification code is:
        </p>

        <!-- OTP -->

        <div
          style="
            margin:20px 0 25px;
            text-align:center;
          "
        >

          <div
            style="
              display:inline-block;
              padding:18px 28px;
              border-radius:12px;
              background:#f2ede8;
              color:#211b17;
              font-size:32px;
              font-weight:700;
              letter-spacing:8px;
            "
          >
            ${otp}
          </div>

        </div>

        <p
          style="
            margin:0 0 15px;
            font-size:14px;
            line-height:1.6;
            color:#5f5751;
          "
        >
          This OTP will expire in
          <strong>${OTP_EXPIRY_MINUTES} minutes</strong>.
        </p>

        <p
          style="
            margin:0;
            font-size:13px;
            line-height:1.6;
            color:#8a817b;
          "
        >
          If you did not request a password reset,
          you can safely ignore this email.
        </p>

      </div>

      <!-- Footer -->

      <div
        style="
          padding:20px 25px;
          background:#faf8f6;
          text-align:center;
          border-top:1px solid #eee7e1;
        "
      >

        <p
          style="
            margin:0;
            font-size:12px;
            color:#8a817b;
          "
        >
          © ${new Date().getFullYear()}
          Jihaan Cosmetics.
          All rights reserved.
        </p>

      </div>

    </div>

  </div>

</body>
</html>
`,
  };

  return emailTransporter.sendMail(mailOptions);
};

/* =========================================================
   CREATE FORGOT PASSWORD OTP
========================================================= */

const createForgotPasswordOtp = async ({
  email,
  userId,
}) => {
  const normalizedEmail = normalizeEmail(email);

  const collection =
    getEmailOtpCollection();

  /*
   * Invalidate any previously active OTP.
   */
  await collection.updateMany(
    {
      email: normalizedEmail,
      purpose: "forgot-password",
      consumed: false,
    },
    {
      $set: {
        consumed: true,
        consumedAt: new Date(),
      },
    }
  );

  const otp = generateOtp();

  const hashedOtp = await hashOtp(otp);

  const now = new Date();

  const expiresAt = new Date(
    now.getTime() +
      OTP_EXPIRY_MINUTES * 60 * 1000
  );

  const challengeId =
    new mongoose.Types.ObjectId();

  const challenge = {
    _id: challengeId,

    email: normalizedEmail,

    userId: new mongoose.Types.ObjectId(
      userId
    ),

    purpose: "forgot-password",

    otpHash: hashedOtp,

    attempts: 0,

    maxAttempts: OTP_MAX_ATTEMPTS,

    consumed: false,

    createdAt: now,

    expiresAt,

    lastSentAt: now,
  };

  await collection.insertOne(challenge);

  try {
    await sendForgotPasswordOtpEmail({
      email: normalizedEmail,
      otp,
    });
  } catch (error) {
    /*
     * Do not leave an active OTP if the email
     * could not be sent.
     */
    await collection.updateOne(
      {
        _id: challengeId,
      },
      {
        $set: {
          consumed: true,
          consumedAt: new Date(),
          emailSendFailed: true,
        },
      }
    );

    throw error;
  }

  return {
    challengeId: challengeId.toString(),
    expiresAt,
    resendAfter: new Date(
      now.getTime() +
        OTP_RESEND_COOLDOWN_SECONDS * 1000
    ),
  };
};

/* =========================================================
   VERIFY FORGOT PASSWORD OTP
========================================================= */

const verifyForgotOtp = async ({
  email,
  otp,
  challengeId,
}) => {
  const normalizedEmail =
    normalizeEmail(email);

  const cleanOtp = String(otp || "")
    .trim();

  if (!/^\d{6}$/.test(cleanOtp)) {
    return {
      success: false,
      message: "Please enter a valid 6-digit OTP.",
    };
  }

  const collection =
    getEmailOtpCollection();

  const query = {
    email: normalizedEmail,

    purpose: "forgot-password",

    consumed: false,
  };

  if (
    challengeId &&
    mongoose.Types.ObjectId.isValid(
      challengeId
    )
  ) {
    query._id =
      new mongoose.Types.ObjectId(
        challengeId
      );
  }

  const challenge =
    await collection.findOne(
      query,
      {
        sort: {
          createdAt: -1,
        },
      }
    );

  if (!challenge) {
    return {
      success: false,
      message:
        "OTP is invalid or has expired. Please request a new OTP.",
    };
  }

  const now = new Date();

  if (
    challenge.expiresAt &&
    new Date(challenge.expiresAt) <= now
  ) {
    await collection.updateOne(
      {
        _id: challenge._id,
      },
      {
        $set: {
          consumed: true,
          consumedAt: now,
        },
      }
    );

    return {
      success: false,
      message:
        "OTP has expired. Please request a new OTP.",
    };
  }

  if (
    Number(challenge.attempts || 0) >=
    Number(
      challenge.maxAttempts ||
        OTP_MAX_ATTEMPTS
    )
  ) {
    await collection.updateOne(
      {
        _id: challenge._id,
      },
      {
        $set: {
          consumed: true,
          consumedAt: now,
        },
      }
    );

    return {
      success: false,
      message:
        "Too many incorrect attempts. Please request a new OTP.",
    };
  }

  const otpMatches =
    await compareOtp(
      cleanOtp,
      challenge.otpHash
    );

  if (!otpMatches) {
    const newAttempts =
      Number(challenge.attempts || 0) + 1;

    const update = {
      $set: {
        attempts: newAttempts,
      },
    };

    if (
      newAttempts >=
      Number(
        challenge.maxAttempts ||
          OTP_MAX_ATTEMPTS
      )
    ) {
      update.$set.consumed = true;
      update.$set.consumedAt = now;
    }

    await collection.updateOne(
      {
        _id: challenge._id,
      },
      update
    );

    const remainingAttempts = Math.max(
      0,
      Number(
        challenge.maxAttempts ||
          OTP_MAX_ATTEMPTS
      ) - newAttempts
    );

    if (remainingAttempts === 0) {
      return {
        success: false,
        message:
          "Too many incorrect attempts. Please request a new OTP.",
      };
    }

    return {
      success: false,
      message: `Incorrect OTP. ${remainingAttempts} attempt${
        remainingAttempts === 1
          ? ""
          : "s"
      } remaining.`,
    };
  }

  /*
   * OTP verified successfully.
   */
  await collection.updateOne(
    {
      _id: challenge._id,
    },
    {
      $set: {
        consumed: true,
        consumedAt: now,
        verifiedAt: now,
      },
    }
  );

  return {
    success: true,

    userId:
      challenge.userId?.toString(),

    email: normalizedEmail,
  };
};

/* =========================================================
   CREATE PASSWORD RESET TOKEN
========================================================= */

const createPasswordResetToken = ({
  userId,
}) => {
  const secret =
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is not configured."
    );
  }

  /*
   * IMPORTANT:
   * Use userId consistently.
   * The old controller used "id" while
   * resetPassword expected "userId".
   */

  return jwt.sign(
    {
      userId: userId.toString(),

      purpose: "password-reset",
    },

    secret,

    {
      expiresIn:
        PASSWORD_RESET_EXPIRY,
    }
  );
};

/* =========================================================
   VERIFY PASSWORD RESET TOKEN
========================================================= */

const verifyPasswordResetToken = (
  resetToken
) => {
  const secret =
    process.env.JWT_SECRET;

  if (!secret) {
    throw new Error(
      "JWT_SECRET is not configured."
    );
  }

  const decoded =
    jwt.verify(
      resetToken,
      secret
    );

  if (
    !decoded ||
    decoded.purpose !==
      "password-reset"
  ) {
    throw new Error(
      "Invalid password reset token."
    );
  }

  if (!decoded.userId) {
    throw new Error(
      "Password reset token does not contain a user ID."
    );
  }

  return decoded;
};

/* =========================================================
   FORGOT PASSWORD
   POST /auth/forgot-password
========================================================= */

export const forgotPassword = async (
  req,
  res
) => {
  try {
    const email =
      normalizeEmail(
        req.body?.email
      );

    if (!email) {
      return res.status(400).json({
        success: false,
        message:
          "Email address is required.",
      });
    }

    /*
     * Find customer account.
     */
    const user =
      await User.findOne({
        email,
      });

    /*
     * Generic response for non-existing
     * accounts to avoid revealing whether
     * an email is registered.
     */
    if (!user) {
      return res.status(200).json({
        success: true,

        message:
          "If an account exists with this email, a password reset OTP has been sent.",

        requiresOtp: true,
      });
    }

    /*
     * Check account status.
     */
    const accountStatus =
      checkAccountStatus(user);

    if (!accountStatus.valid) {
      return res.status(403).json({
        success: false,
        message:
          accountStatus.message,
      });
    }

    /*
     * Optional role protection.
     *
     * Forgot password is intended for
     * customer/user accounts.
     */
    if (
      user.role &&
      String(user.role).toLowerCase() !==
        CUSTOMER_ROLE
    ) {
      return res.status(200).json({
        success: true,

        message:
          "If an account exists with this email, a password reset OTP has been sent.",

        requiresOtp: true,
      });
    }

    const challenge =
      await createForgotPasswordOtp({
        email,
        userId: user._id,
      });

    return res.status(200).json({
      success: true,

      message:
        "Password reset OTP has been sent to your email.",

      requiresOtp: true,

      challengeId:
        challenge.challengeId,

      expiresAt:
        challenge.expiresAt,

      resendAfter:
        challenge.resendAfter,
    });
  } catch (error) {
    console.error(
      "forgotPassword error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to send password reset OTP. Please try again later.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error?.message
          : undefined,
    });
  }
};

/* =========================================================
   VERIFY FORGOT PASSWORD OTP
   POST /auth/forgot-password/verify-otp
========================================================= */

export const verifyForgotPasswordOtp =
  async (req, res) => {
    try {
      const email =
        normalizeEmail(
          req.body?.email
        );

      const otp = String(
        req.body?.otp || ""
      ).trim();

      const challengeId =
        req.body?.challengeId;

      if (!email) {
        return res.status(400).json({
          success: false,
          message:
            "Email address is required.",
        });
      }

      if (!/^\d{6}$/.test(otp)) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid 6-digit OTP.",
        });
      }

      const result =
        await verifyForgotOtp({
          email,
          otp,
          challengeId,
        });

      if (!result.success) {
        return res.status(400).json(
          result
        );
      }

      /*
       * Verify the user still exists.
       */
      const user =
        await User.findById(
          result.userId
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User account no longer exists.",
        });
      }

      /*
       * Check account status again.
       */
      const accountStatus =
        checkAccountStatus(user);

      if (!accountStatus.valid) {
        return res.status(403).json({
          success: false,
          message:
            accountStatus.message,
        });
      }

      /*
       * Create short-lived reset token.
       */
      const resetToken =
        createPasswordResetToken({
          userId: user._id,
        });

      return res.status(200).json({
        success: true,

        message:
          "OTP verified successfully. You can now reset your password.",

        resetToken,

        user: {
          id: user._id,

          email: user.email,

          name:
            user.name ||
            user.fullName ||
            "",
        },
      });
    } catch (error) {
      console.error(
        "verifyForgotPasswordOtp error:",
        error
      );

      if (
        error?.name ===
        "TokenExpiredError"
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Password reset session has expired. Please start again.",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to verify OTP. Please try again.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? error?.message
            : undefined,
      });
    }
  };

/* =========================================================
   RESEND FORGOT PASSWORD OTP
   POST /auth/forgot-password/resend-otp
========================================================= */

export const resendForgotPasswordOtp =
  async (req, res) => {
    try {
      const email =
        normalizeEmail(
          req.body?.email
        );

      if (!email) {
        return res.status(400).json({
          success: false,
          message:
            "Email address is required.",
        });
      }

      const user =
        await User.findOne({
          email,
        });

      /*
       * Generic response for security.
       */
      if (!user) {
        return res.status(200).json({
          success: true,

          message:
            "If an account exists with this email, a new OTP has been sent.",

          requiresOtp: true,
        });
      }

      const accountStatus =
        checkAccountStatus(user);

      if (!accountStatus.valid) {
        return res.status(403).json({
          success: false,
          message:
            accountStatus.message,
        });
      }

      /*
       * Find latest active challenge.
       */
      const collection =
        getEmailOtpCollection();

      const latestChallenge =
        await collection.findOne(
          {
            email,

            purpose:
              "forgot-password",

            consumed: false,
          },
          {
            sort: {
              createdAt: -1,
            },
          }
        );

      if (latestChallenge) {
        const now = Date.now();

        const lastSentAt =
          new Date(
            latestChallenge.lastSentAt ||
              latestChallenge.createdAt
          ).getTime();

        const cooldownEnd =
          lastSentAt +
          OTP_RESEND_COOLDOWN_SECONDS *
            1000;

        if (now < cooldownEnd) {
          const remainingSeconds =
            Math.ceil(
              (cooldownEnd - now) /
                1000
            );

          return res.status(429).json({
            success: false,

            message: `Please wait ${remainingSeconds} seconds before requesting another OTP.`,

            resendAfter:
              new Date(
                cooldownEnd
              ),
          });
        }
      }

      /*
       * Create and send a fresh OTP.
       */
      const challenge =
        await createForgotPasswordOtp({
          email,
          userId: user._id,
        });

      return res.status(200).json({
        success: true,

        message:
          "A new password reset OTP has been sent to your email.",

        requiresOtp: true,

        challengeId:
          challenge.challengeId,

        expiresAt:
          challenge.expiresAt,

        resendAfter:
          challenge.resendAfter,
      });
    } catch (error) {
      console.error(
        "resendForgotPasswordOtp error:",
        error
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to resend OTP. Please try again later.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? error?.message
            : undefined,
      });
    }
  };

/* =========================================================
   RESET PASSWORD
   POST /auth/reset-password
========================================================= */

export const resetPassword = async (
  req,
  res
) => {
  try {
    /*
     * Support both naming styles.
     */
    const resetToken =
      req.body?.resetToken ||
      req.body?.token;

    const newPassword =
      req.body?.newPassword ||
      req.body?.password;

    const confirmPassword =
      req.body?.confirmPassword;

    if (!resetToken) {
      return res.status(400).json({
        success: false,
        message:
          "Password reset token is required.",
      });
    }

    if (!newPassword) {
      return res.status(400).json({
        success: false,
        message:
          "New password is required.",
      });
    }

    if (
      typeof newPassword !==
      "string"
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be a valid string.",
      });
    }

    /*
     * Keep backend password validation
     * aligned with the reset-password API.
     */
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message:
          "Password must be at least 6 characters long.",
      });
    }

    if (
      confirmPassword !==
        undefined &&
      newPassword !==
        confirmPassword
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Passwords do not match.",
      });
    }

    /*
     * Verify reset JWT.
     */
    let decoded;

    try {
      decoded =
        verifyPasswordResetToken(
          resetToken
        );
    } catch (tokenError) {
      if (
        tokenError?.name ===
        "TokenExpiredError"
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Password reset token has expired. Please request a new OTP.",
        });
      }

      return res.status(401).json({
        success: false,
        message:
          "Invalid password reset token. Please request a new OTP.",
      });
    }

    /*
     * Find user.
     */
    const user =
      await User.findById(
        decoded.userId
      );

    if (!user) {
      return res.status(404).json({
        success: false,
        message:
          "User account not found.",
      });
    }

    /*
     * Check account status.
     */
    const accountStatus =
      checkAccountStatus(user);

    if (!accountStatus.valid) {
      return res.status(403).json({
        success: false,
        message:
          accountStatus.message,
      });
    }

    /*
     * Hash new password.
     */
    const hashedPassword =
      await bcrypt.hash(
        newPassword,
        12
      );

    user.password =
      hashedPassword;

    /*
     * Password was successfully
     * verified through email OTP.
     */
    user.isEmailVerified = true;

    /*
     * If the account does not have an
     * authentication provider, treat it
     * as local/password authentication.
     */
    if (!user.authProvider) {
      user.authProvider = "local";
    }

    await user.save();

    return res.status(200).json({
      success: true,

      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (error) {
    console.error(
      "resetPassword error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Unable to reset password. Please try again later.",

      error:
        process.env.NODE_ENV ===
        "development"
          ? error?.message
          : undefined,
    });
  }
};

/* =========================================================
   INITIALIZE OTP INDEXES
========================================================= */

ensureOtpIndexes().catch(
  (error) => {
    console.error(
      "Failed to initialize OTP indexes:",
      error?.message || error
    );
  }
);

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  forgotPassword,

  verifyForgotPasswordOtp,

  resendForgotPasswordOtp,

  resetPassword,
};