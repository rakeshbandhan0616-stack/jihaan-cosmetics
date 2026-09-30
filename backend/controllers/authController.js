import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import mongoose from "mongoose";
import nodemailer from "nodemailer";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";

/* =========================================================
   ROLE CONFIGURATION
========================================================= */

const STAFF_ROLES = [
  "superadmin",
  "admin",
  "accounts",
  "logistics",
];

const CUSTOMER_ROLE = "user";

const SOCIAL_PROVIDERS = [
  "google",
  "facebook",
];

/* =========================================================
   GOOGLE CLIENT
========================================================= */

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
);

/* =========================================================
   EMAIL OTP CONFIGURATION
========================================================= */

const OTP_LENGTH = 6;

const OTP_EXPIRY_MINUTES = 5;

const OTP_EXPIRY_MS =
  OTP_EXPIRY_MINUTES * 60 * 1000;

const OTP_MAX_ATTEMPTS = 5;

const OTP_RESEND_COOLDOWN_SECONDS = 60;

const RESET_TOKEN_EXPIRY = "10m";

const EMAIL_OTP_COLLECTION_NAME =
  "emailotpverifications";

/* =========================================================
   EMAIL TRANSPORTER

   Configure these environment variables:

   SMTP_HOST
   SMTP_PORT
   SMTP_SECURE
   SMTP_USER
   SMTP_PASS
   SMTP_FROM

   GoDaddy Professional Email / Titan SMTP:

   SMTP_HOST=smtpout.secureserver.net
   SMTP_PORT=465
   SMTP_SECURE=true
   SMTP_USER=no-reply@jinicosmetics.com
   SMTP_PASS=your_GoDaddy_mailbox_password
   SMTP_FROM=no-reply@jinicosmetics.com

   Use your GoDaddy mailbox password.
   Never expose SMTP_PASS in frontend code.
========================================================= */

const emailTransporter =
  nodemailer.createTransport({
    host:
      process.env.SMTP_HOST ||
      "smtpout.secureserver.net",

    port:
      Number(
        process.env.SMTP_PORT ||
        465,
      ),

    secure:
      String(
        process.env.SMTP_SECURE ??
          "true",
      ).toLowerCase() ===
      "true",

    auth: {
      user:
        process.env.SMTP_USER,

      pass:
        process.env.SMTP_PASS,
    },
  });

const getEmailFromAddress = () =>
  process.env.SMTP_FROM ||
  process.env.SMTP_USER ||
  "no-reply@jinicosmetics.com";

/* =========================================================
   SEND EMAIL OTP

   Used for:

   1. Manual registration
   2. Forgot password

   Google login does NOT use this function.
   WhatsApp OTP is NOT used.
========================================================= */

const sendEmailOtp = async ({
  email,
  otp,
  purpose,
}) => {
  const from =
    getEmailFromAddress();

  if (
    !process.env.SMTP_USER ||
    !process.env.SMTP_PASS ||
    !from
  ) {
    throw new Error(
      "Email SMTP configuration is missing. Please configure SMTP_USER, SMTP_PASS and SMTP_FROM.",
    );
  }

  const isRegistration =
    purpose ===
    "registration";

  const subject =
    isRegistration
      ? "Jihaan Cosmetics - Verify Your Email"
      : "Jihaan Cosmetics - Password Reset OTP";

  const title =
    isRegistration
      ? "Verify your email address"
      : "Reset your password";

  const description =
    isRegistration
      ? "Use the OTP below to verify your email and complete your Jihaan Cosmetics account registration."
      : "Use the OTP below to verify your identity and create a new password for your Jihaan Cosmetics account.";

  await emailTransporter.sendMail({
    from,
    to: email,
    subject,

    text:
      `${title}\n\n` +
      `${description}\n\n` +
      `Your OTP is: ${otp}\n\n` +
      `This OTP expires in ${OTP_EXPIRY_MINUTES} minutes.\n` +
      `If you did not request this, you can safely ignore this email.\n\n` +
      `Jihaan Cosmetics`,

    html: `
      <div style="
        margin:0;
        padding:32px 16px;
        background:#f8f6f3;
        font-family:Arial,sans-serif;
      ">
        <div style="
          max-width:520px;
          margin:0 auto;
          background:#ffffff;
          border-radius:16px;
          padding:32px;
          box-shadow:0 8px 30px rgba(0,0,0,.06);
        ">
          <h2 style="
            margin:0 0 12px;
            color:#222;
          ">
            ${title}
          </h2>

          <p style="
            margin:0 0 20px;
            color:#666;
            line-height:1.6;
          ">
            ${description}
          </p>

          <div style="
            margin:24px 0;
            padding:18px;
            text-align:center;
            background:#f6f1eb;
            border-radius:12px;
          ">
            <div style="
              font-size:13px;
              color:#777;
              margin-bottom:8px;
            ">
              Your verification code
            </div>

            <div style="
              font-size:34px;
              font-weight:700;
              letter-spacing:8px;
              color:#222;
            ">
              ${otp}
            </div>
          </div>

          <p style="
            margin:0;
            color:#777;
            font-size:13px;
            line-height:1.6;
          ">
            This OTP expires in ${OTP_EXPIRY_MINUTES} minutes.
            If you did not request this email, you can safely ignore it.
          </p>

          <p style="
            margin:24px 0 0;
            color:#333;
            font-weight:600;
          ">
            Jihaan Cosmetics
          </p>
        </div>
      </div>
    `,
  });
};

/* =========================================================
   CREATE JWT TOKEN
========================================================= */

const createToken = (user) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is missing in the .env file",
    );
  }

  return jwt.sign(
    {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    },
  );
};

/* =========================================================
   FORMAT USER RESPONSE

   Never return password or sensitive provider information.
========================================================= */

const getUserResponse = (user) => {
  return {
    id: user._id.toString(),

    _id: user._id.toString(),

    name: user.name,

    email: user.email,

    phone: user.phone || "",

    profileImage:
      user.profileImage || "",

    role: user.role,

    authProvider:
      user.authProvider || "local",

    isActive:
      user.isActive,

    isBlocked:
      user.isBlocked,

    isEmailVerified:
      user.isEmailVerified,

    isPhoneVerified:
      user.isPhoneVerified || false,

    lastLoginAt:
      user.lastLoginAt || null,

    createdAt:
      user.createdAt,

    updatedAt:
      user.updatedAt,
  };
};

/* =========================================================
   SET AUTH COOKIE
========================================================= */

const setAuthCookie = (
  res,
  token,
) => {
  const isProduction =
    process.env.NODE_ENV ===
    "production";

  res.cookie(
    "token",
    token,
    {
      httpOnly: true,

      secure:
        isProduction,

      sameSite:
        isProduction
          ? "none"
          : "lax",

      maxAge:
        7 *
        24 *
        60 *
        60 *
        1000,
    },
  );
};

/* =========================================================
   NORMALIZE PHONE NUMBER
========================================================= */

const normalizePhone = (
  phone,
) => {
  let normalizedPhone =
    String(
      phone || "",
    ).replace(
      /\D/g,
      "",
    );

  if (
    normalizedPhone.startsWith(
      "91",
    ) &&
    normalizedPhone.length ===
      12
  ) {
    normalizedPhone =
      normalizedPhone.slice(2);
  }

  return normalizedPhone;
};

/* =========================================================
   VALIDATE INDIAN PHONE NUMBER
========================================================= */

const isValidPhone = (
  phone,
) => {
  return /^[6-9][0-9]{9}$/.test(
    phone,
  );
};

/* =========================================================
   VALIDATE EMAIL
========================================================= */

const isValidEmail = (
  email,
) => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
    email,
  );
};

/* =========================================================
   NORMALIZE NAME
========================================================= */

const normalizeName = (
  name,
) => {
  return String(
    name || "",
  ).trim();
};

/* =========================================================
   CHECK ACCOUNT STATUS
========================================================= */

const checkAccountStatus = (
  user,
  res,
) => {
  if (!user) {
    res.status(401).json({
      success: false,
      message:
        "Account not found",
    });

    return false;
  }

  if (
    user.isBlocked === true
  ) {
    res.status(403).json({
      success: false,
      message:
        "Your account has been blocked",
    });

    return false;
  }

  if (
    user.isActive === false
  ) {
    res.status(403).json({
      success: false,
      message:
        "Your account is inactive",
    });

    return false;
  }

  return true;
};

/* =========================================================
   COMPLETE LOGIN RESPONSE
========================================================= */

const completeLogin = async (
  user,
  res,
  message = "Login successful",
) => {
  user.lastLoginAt =
    new Date();

  await user.save();

  const token =
    createToken(user);

  setAuthCookie(
    res,
    token,
  );

  return res.status(200).json({
    success: true,
    message,
    token,
    user:
      getUserResponse(user),
  });
};

/* =========================================================
   EMAIL OTP COLLECTION
========================================================= */

const getEmailOtpCollection =
  async () => {
    if (
      mongoose.connection
        .readyState !==
      1
    ) {
      throw new Error(
        "MongoDB connection is not ready",
      );
    }

    const collection =
      mongoose.connection.collection(
        EMAIL_OTP_COLLECTION_NAME,
      );

    try {
      await collection.createIndex(
        {
          expiresAt: 1,
        },
        {
          expireAfterSeconds: 0,
          name:
            "email_otp_expiry_ttl",
        },
      );
    } catch (error) {
      if (
        !String(
          error?.message || "",
        ).includes(
          "already exists",
        )
      ) {
        console.error(
          "EMAIL OTP TTL INDEX ERROR:",
          error,
        );
      }
    }

    try {
      await collection.createIndex(
        {
          email: 1,
          purpose: 1,
          consumedAt: 1,
        },
        {
          name:
            "email_otp_lookup_index",
        },
      );
    } catch (error) {
      if (
        !String(
          error?.message || "",
        ).includes(
          "already exists",
        )
      ) {
        console.error(
          "EMAIL OTP LOOKUP INDEX ERROR:",
          error,
        );
      }
    }

    return collection;
  };

/* =========================================================
   HASH OTP
========================================================= */

const hashOtp = (
  otp,
) => {
  return crypto
    .createHash("sha256")
    .update(
      String(otp),
    )
    .digest("hex");
};

/* =========================================================
   GENERATE OTP
========================================================= */

const generateOtp = () => {
  const minimum =
    10 **
      (OTP_LENGTH - 1);

  const maximum =
    10 ** OTP_LENGTH;

  return String(
    crypto.randomInt(
      minimum,
      maximum,
    ),
  );
};

/* =========================================================
   HASH CHALLENGE KEY
========================================================= */

const hashChallengeKey = (
  value,
) => {
  return crypto
    .createHash("sha256")
    .update(
      String(value),
    )
    .digest("hex");
};

/* =========================================================
   RESEND COOLDOWN
========================================================= */

const getResendCooldown = (
  record,
) => {
  if (!record?.lastSentAt) {
    return 0;
  }

  const elapsed =
    Date.now() -
    new Date(
      record.lastSentAt,
    ).getTime();

  const remaining =
    OTP_RESEND_COOLDOWN_SECONDS *
      1000 -
    elapsed;

  if (remaining <= 0) {
    return 0;
  }

  return Math.ceil(
    remaining / 1000,
  );
};

/* =========================================================
   CREATE EMAIL OTP CHALLENGE
========================================================= */

const createEmailOtpChallenge =
  async ({
    email,
    purpose,
    registrationData = null,
    userId = null,
  }) => {
    const collection =
      await getEmailOtpCollection();

    const existing =
      await collection.findOne(
        {
          email,
          purpose,
          consumedAt: null,
          expiresAt: {
            $gt: new Date(),
          },
        },
        {
          sort: {
            createdAt: -1,
          },
        },
      );

    const cooldown =
      getResendCooldown(
        existing,
      );

    if (cooldown > 0) {
      const error =
        new Error(
          "Please wait before requesting another OTP",
        );

      error.code =
        "OTP_RESEND_COOLDOWN";

      error.retryAfter =
        cooldown;

      throw error;
    }

    if (existing) {
      await collection.updateMany(
        {
          email,
          purpose,
          consumedAt: null,
        },
        {
          $set: {
            consumedAt:
              new Date(),
          },
        },
      );
    }

    const otp =
      generateOtp();

    const now =
      new Date();

    const expiresAt =
      new Date(
        now.getTime() +
          OTP_EXPIRY_MS,
      );

    const record = {
      email,
      purpose,

      userId:
        userId
          ? new mongoose.Types.ObjectId(
              userId,
            )
          : null,

      otpHash:
        hashOtp(otp),

      attempts: 0,

      maxAttempts:
        OTP_MAX_ATTEMPTS,

      registrationData,

      createdAt: now,

      lastSentAt: now,

      expiresAt,

      consumedAt: null,

      verifiedAt: null,

      resetUsedAt: null,
    };

    const insertResult =
      await collection.insertOne(
        record,
      );

    try {
      await sendEmailOtp({
        email,
        otp,
        purpose,
      });
    } catch (error) {
      await collection.updateOne(
        {
          _id:
            insertResult.insertedId,
        },
        {
          $set: {
            consumedAt:
              new Date(),
          },
        },
      );

      throw error;
    }

    return {
      challengeId:
        insertResult.insertedId.toString(),

      expiresIn:
        OTP_EXPIRY_MINUTES *
        60,

      resendAfter:
        OTP_RESEND_COOLDOWN_SECONDS,
    };
  };

/* =========================================================
   VERIFY EMAIL OTP CHALLENGE
========================================================= */

const verifyEmailOtpChallenge =
  async ({
    email,
    purpose,
    otp,
  }) => {
    const collection =
      await getEmailOtpCollection();

    const record =
      await collection.findOne(
        {
          email,
          purpose,
          consumedAt: null,
          expiresAt: {
            $gt: new Date(),
          },
        },
        {
          sort: {
            createdAt: -1,
          },
        },
      );

    if (!record) {
      return {
        success: false,
        code:
          "OTP_INVALID_OR_EXPIRED",
        message:
          "OTP is invalid or has expired.",
      };
    }

    if (
      record.attempts >=
      record.maxAttempts
    ) {
      await collection.updateOne(
        {
          _id:
            record._id,
        },
        {
          $set: {
            consumedAt:
              new Date(),
          },
        },
      );

      return {
        success: false,
        code:
          "OTP_MAX_ATTEMPTS",
        message:
          "Too many incorrect OTP attempts. Please request a new OTP.",
      };
    }

    const submittedHash =
      hashOtp(otp);

    if (
      submittedHash !==
      record.otpHash
    ) {
      const newAttempts =
        (record.attempts || 0) +
        1;

      const update = {
        $set: {
          attempts:
            newAttempts,
        },
      };

      if (
        newAttempts >=
        record.maxAttempts
      ) {
        update.$set.consumedAt =
          new Date();
      }

      await collection.updateOne(
        {
          _id:
            record._id,
        },
        update,
      );

      return {
        success: false,
        code:
          "OTP_INCORRECT",
        message:
          newAttempts >=
          record.maxAttempts
            ? "Too many incorrect OTP attempts. Please request a new OTP."
            : "Incorrect OTP.",
        attemptsRemaining:
          Math.max(
            0,
            record.maxAttempts -
              newAttempts,
          ),
      };
    }

    const verifiedAt =
      new Date();

    await collection.updateOne(
      {
        _id:
          record._id,
      },
      {
        $set: {
          consumedAt:
            verifiedAt,

          verifiedAt,
        },
      },
    );

    return {
      success: true,

      code:
        "OTP_VERIFIED",

      message:
        "OTP verified successfully.",

      record,
    };
  };

/* =========================================================
   MASK PHONE NUMBER
========================================================= */

const maskPhone = (
  phone,
) => {
  if (!phone) {
    return "";
  }

  const normalized =
    normalizePhone(phone);

  if (
    normalized.length !==
    10
  ) {
    return "**********";
  }

  return `${normalized.slice(
    0,
    2,
  )}******${normalized.slice(
    -2,
  )}`;
};

/* =========================================================
   MASK EMAIL
========================================================= */

const maskEmail = (
  email,
) => {
  if (!email) {
    return "";
  }

  const [local, domain] =
    String(email).split("@");

  if (
    !local ||
    !domain
  ) {
    return email;
  }

  if (local.length <= 2) {
    return `${local[0] || ""}***@${domain}`;
  }

  return `${local.slice(
    0,
    2,
  )}***@${domain}`;
};

/* =========================================================
   REGISTRATION DATA VALIDATION
========================================================= */

const validateRegistrationData =
  ({
    name,
    email,
    phone,
    password,
  }) => {
    const errors = {};

    const normalizedName =
      normalizeName(name);

    const normalizedEmail =
      String(
        email || "",
      )
        .trim()
        .toLowerCase();

    const normalizedPhone =
      normalizePhone(phone);

    if (
      normalizedName.length <
      2
    ) {
      errors.name =
        "Name must contain at least 2 characters";
    }

    if (
      !isValidEmail(
        normalizedEmail,
      )
    ) {
      errors.email =
        "Please enter a valid email address";
    }

    if (
      !isValidPhone(
        normalizedPhone,
      )
    ) {
      errors.phone =
        "Please enter a valid 10-digit Indian mobile number";
    }

    if (
      !password ||
      String(password).length <
        6
    ) {
      errors.password =
        "Password must contain at least 6 characters";
    }

    return {
      valid:
        Object.keys(errors)
          .length === 0,

      errors,

      data: {
        name:
          normalizedName,

        email:
          normalizedEmail,

        phone:
          normalizedPhone,

        password:
          String(password || ""),
      },
    };
  };

/* =========================================================
   REGISTRATION DUPLICATE CHECK
========================================================= */

const checkRegistrationDuplicates =
  async ({
    email,
    phone,
  }) => {
    const conditions = [
      {
        email,
        role: CUSTOMER_ROLE,
      },
    ];

    if (phone) {
      conditions.push({
        phone,
        role: CUSTOMER_ROLE,
      });
    }

    const existing =
      await User.findOne({
        $or: conditions,
      }).select(
        "_id name email phone role authProvider isEmailVerified isPhoneVerified",
      );

    if (!existing) {
      return {
        exists: false,
      };
    }

    if (
      existing.email ===
      email
    ) {
      return {
        exists: true,
        field: "email",
        message:
          "An account with this email already exists.",
        user: existing,
      };
    }

    if (
      phone &&
      existing.phone ===
        phone
    ) {
      return {
        exists: true,
        field: "phone",
        message:
          "An account with this phone number already exists.",
        user: existing,
      };
    }

    return {
      exists: true,
      field: "account",
      message:
        "An account with these details already exists.",
      user: existing,
    };
  };

/* =========================================================
   CREATE PASSWORD RESET TOKEN
========================================================= */

const createPasswordResetToken =
  (user) => {
    if (
      !process.env.JWT_SECRET
    ) {
      throw new Error(
        "JWT_SECRET is missing in the .env file",
      );
    }

    return jwt.sign(
      {
        id: user._id.toString(),

        purpose:
          "password-reset",
      },

      process.env.JWT_SECRET,

      {
        expiresIn:
          RESET_TOKEN_EXPIRY,
      },
    );
  };

/* =========================================================
   VERIFY PASSWORD RESET TOKEN
========================================================= */

const verifyPasswordResetToken =
  (token) => {
    if (
      !process.env.JWT_SECRET
    ) {
      throw new Error(
        "JWT_SECRET is missing in the .env file",
      );
    }

    try {
      const decoded =
        jwt.verify(
          token,
          process.env.JWT_SECRET,
        );

      if (
        decoded?.purpose !==
        "password-reset"
      ) {
        return null;
      }

      return decoded;
    } catch {
      return null;
    }
  };
  /* =========================================================
   REGISTER USER
========================================================= */

export const registerUser =
  async (
    req,
    res,
  ) => {
    try {
      const {
        name,
        email,
        phone,
        password,
      } =
        req.body || {};

      const validation =
        validateRegistrationData(
          {
            name,
            email,
            phone,
            password,
          },
        );

      if (
        !validation.valid
      ) {
        return res.status(
          400,
        ).json({
          success: false,

          message:
            "Please correct the registration details.",

          errors:
            validation.errors,
        });
      }

      const {
        data,
      } = validation;

      const duplicate =
        await checkRegistrationDuplicates(
          {
            email:
              data.email,

            phone:
              data.phone,
          },
        );

      if (
        duplicate.exists
      ) {
        return res.status(
          409,
        ).json({
          success: false,

          message:
            duplicate.message,

          field:
            duplicate.field,

          account:
            duplicate.user
              ? {
                  id:
                    duplicate.user._id.toString(),

                  name:
                    duplicate.user.name,

                  email:
                    duplicate.user.email,

                  phone:
                    maskPhone(
                      duplicate.user.phone,
                    ),

                  authProvider:
                    duplicate.user.authProvider ||
                    "local",
                }
              : null,
        });
      }

      /*
       * MANUAL EMAIL REGISTRATION
       *
       * Always send email OTP.
       *
       * Google registration does not use this
       * function and therefore does not receive OTP.
       */

      const challenge =
        await createEmailOtpChallenge(
          {
            email:
              data.email,

            purpose:
              "registration",

            registrationData: {
              name:
                data.name,

              email:
                data.email,

              phone:
                data.phone,

              password:
                data.password,
            },
          },
        );

      return res.status(
        200,
      ).json({
        success: true,

        requiresOtp: true,

        message:
          "OTP sent to your email. Please verify your email to complete registration.",

        email:
          data.email,

        maskedEmail:
          maskEmail(
            data.email,
          ),

        challengeId:
          challenge.challengeId,

        expiresIn:
          challenge.expiresIn,

        resendAfter:
          challenge.resendAfter,
      });
    } catch (error) {
      console.error(
        "REGISTER USER ERROR:",
        error,
      );

      if (
        error?.code ===
        "OTP_RESEND_COOLDOWN"
      ) {
        return res.status(
          429,
        ).json({
          success: false,

          message:
            error.message,

          retryAfter:
            error.retryAfter,
        });
      }

      if (
        error?.code ===
        11000
      ) {
        return res.status(
          409,
        ).json({
          success: false,

          message:
            "An account with these details already exists.",
        });
      }

      return res.status(
        500,
      ).json({
        success: false,

        message:
          "Unable to start registration. Please try again.",
      });
    }
  };

/* =========================================================
   VERIFY REGISTRATION OTP
========================================================= */

export const verifyRegistrationOtp =
  async (
    req,
    res,
  ) => {
    try {
      const {
        email,
        otp,
      } =
        req.body || {};

      const normalizedEmail =
        String(
          email || "",
        )
          .trim()
          .toLowerCase();

      const normalizedOtp =
        String(
          otp || "",
        ).trim();

      if (
        !isValidEmail(
          normalizedEmail,
        )
      ) {
        return res.status(
          400,
        ).json({
          success: false,

          message:
            "Please enter a valid email address.",
        });
      }

      if (
        !/^\d{6}$/.test(
          normalizedOtp,
        )
      ) {
        return res.status(
          400,
        ).json({
          success: false,

          message:
            "Please enter the 6-digit OTP.",
        });
      }

      const verification =
        await verifyEmailOtpChallenge(
          {
            email:
              normalizedEmail,

            purpose:
              "registration",

            otp:
              normalizedOtp,
          },
        );

      if (
        !verification.success
      ) {
        return res.status(
          400,
        ).json({
          success: false,

          message:
            verification.message,

          code:
            verification.code,

          attemptsRemaining:
            verification.attemptsRemaining,
        });
      }

      const registrationData =
        verification.record
          ?.registrationData;

      if (
        !registrationData
      ) {
        return res.status(
          400,
        ).json({
          success: false,

          message:
            "Registration session has expired. Please register again.",
        });
      }

      /*
       * Check again immediately before account creation.
       * This prevents duplicate accounts if somebody registered
       * the same email/phone while OTP was pending.
       */

      const duplicate =
        await checkRegistrationDuplicates(
          {
            email:
              normalizedEmail,

            phone:
              registrationData.phone,
          },
        );

      if (
        duplicate.exists
      ) {
        return res.status(
          409,
        ).json({
          success: false,

          message:
            duplicate.message,

          field:
            duplicate.field,

          account:
            duplicate.user
              ? {
                  id:
                    duplicate.user._id.toString(),

                  name:
                    duplicate.user.name,

                  email:
                    duplicate.user.email,

                  phone:
                    maskPhone(
                      duplicate.user.phone,
                    ),

                  authProvider:
                    duplicate.user.authProvider ||
                    "local",
                }
              : null,
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          registrationData.password,
          12,
        );

      const user =
        await User.create({
          name:
            registrationData.name,

          email:
            normalizedEmail,

          phone:
            registrationData.phone,

          password:
            hashedPassword,

          role:
            CUSTOMER_ROLE,

          authProvider:
            "local",

          isEmailVerified:
            true,

          isPhoneVerified:
            false,

          isActive:
            true,

          isBlocked:
            false,
        });

      return completeLogin(
        user,
        res,
        "Registration successful. Welcome to Jihaan Cosmetics!",
      );
    } catch (error) {
      console.error(
        "VERIFY REGISTRATION OTP ERROR:",
        error,
      );

      if (
        error?.code ===
        11000
      ) {
        return res.status(
          409,
        ).json({
          success: false,

          message:
            "An account with these details already exists.",
        });
      }

      return res.status(
        500,
      ).json({
        success: false,

        message:
          "Unable to complete registration. Please try again.",
      });
    }
  };

/* =========================================================
   RESEND REGISTRATION OTP
========================================================= */

export const resendRegistrationOtp =
  async (
    req,
    res,
  ) => {
    try {
      const {
        email,
      } =
        req.body || {};

      const normalizedEmail =
        String(
          email || "",
        )
          .trim()
          .toLowerCase();

      if (
        !isValidEmail(
          normalizedEmail,
        )
      ) {
        return res.status(
          400,
        ).json({
          success: false,

          message:
            "Please enter a valid email address.",
        });
      }

      const collection =
        await getEmailOtpCollection();

      const previous =
        await collection.findOne(
          {
            email:
              normalizedEmail,

            purpose:
              "registration",

            consumedAt:
              null,
          },

          {
            sort: {
              createdAt:
                -1,
            },
          },
        );

      if (!previous) {
        return res.status(
          404,
        ).json({
          success: false,

          message:
            "Registration session not found. Please start registration again.",
        });
      }

      const registrationData =
        previous.registrationData;

      if (
        !registrationData
      ) {
        return res.status(
          400,
        ).json({
          success: false,

          message:
            "Registration session is invalid. Please register again.",
        });
      }

      const challenge =
        await createEmailOtpChallenge(
          {
            email:
              normalizedEmail,

            purpose:
              "registration",

            registrationData,

            userId:
              null,
          },
        );

      return res.status(
        200,
      ).json({
        success: true,

        message:
          "A new OTP has been sent to your email.",

        requiresOtp:
          true,

        email:
          normalizedEmail,

        maskedEmail:
          maskEmail(
            normalizedEmail,
          ),

        challengeId:
          challenge.challengeId,

        expiresIn:
          challenge.expiresIn,

        resendAfter:
          challenge.resendAfter,
      });
    } catch (error) {
      console.error(
        "RESEND REGISTRATION OTP ERROR:",
        error,
      );

      if (
        error?.code ===
        "OTP_RESEND_COOLDOWN"
      ) {
        return res.status(
          429,
        ).json({
          success: false,

          message:
            error.message,

          retryAfter:
            error.retryAfter,
        });
      }

      return res.status(
        500,
      ).json({
        success: false,

        message:
          "Unable to resend OTP. Please try again.",
      });
    }
  };

/* =========================================================
   USER LOGIN

   POST /api/auth/login

   Supports:
   - email + password
   - phone + password
   - identifier + password
========================================================= */

export const userLogin =
  async (
    req,
    res,
  ) => {
    try {
      const identifier =
        String(
          req.body?.identifier ??
            req.body?.login ??
            req.body?.email ??
            req.body?.phone ??
            "",
        ).trim();

      const password =
        String(
          req.body?.password ??
            "",
        );

      if (
        !identifier ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Email/phone and password are required.",
        });
      }

      const normalizedIdentifier =
        identifier.toLowerCase();

      const normalizedPhone =
        normalizePhone(
          identifier,
        );

      const conditions = [
        {
          email:
            normalizedIdentifier,
          role:
            CUSTOMER_ROLE,
        },
      ];

      if (
        isValidPhone(
          normalizedPhone,
        )
      ) {
        conditions.push({
          phone:
            normalizedPhone,
          role:
            CUSTOMER_ROLE,
        });
      }

      const user =
        await User.findOne({
          $or: conditions,
        }).select(
          "+password",
        );

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email/phone or password.",
        });
      }

      if (
        !checkAccountStatus(
          user,
          res,
        )
      ) {
        return;
      }

      if (!user.password) {
        return res.status(401).json({
          success: false,
          message:
            "This account does not have a password. Please use the appropriate social login method or reset your password.",
        });
      }

      const passwordValid =
        await bcrypt.compare(
          password,
          user.password,
        );

      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email/phone or password.",
        });
      }

      return completeLogin(
        user,
        res,
        "Login successful.",
      );
    } catch (error) {
      console.error(
        "USER LOGIN ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error during login.",
        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  };

/* =========================================================
   GOOGLE LOGIN

   POST /api/auth/google

   Flow:

   Existing Google account
        ↓
   Login immediately

   Existing email account
        ↓
   Link Google account
        ↓
   Login immediately

   New Google account
        ↓
   Create account
        ↓
   Login immediately

   IMPORTANT:
   Google login does NOT use email OTP.
   Google login does NOT use WhatsApp OTP.
========================================================= */

export const googleLogin =
  async (
    req,
    res,
  ) => {
    try {
      const {
        credential,
        idToken,
        token,
      } =
        req.body || {};

      const googleToken =
        credential ||
        idToken ||
        token;

      if (!googleToken) {
        return res.status(400).json({
          success: false,
          message:
            "Google credential is required.",
        });
      }

      if (
        !process.env.GOOGLE_CLIENT_ID
      ) {
        console.error(
          "GOOGLE_CLIENT_ID is missing.",
        );

        return res.status(500).json({
          success: false,
          message:
            "Google authentication is not configured.",
        });
      }

      const ticket =
        await googleClient.verifyIdToken({
          idToken:
            googleToken,

          audience:
            process.env.GOOGLE_CLIENT_ID,
        });

      const payload =
        ticket.getPayload();

      if (!payload) {
        return res.status(401).json({
          success: false,
          message:
            "Unable to verify Google account.",
        });
      }

      const googleId =
        payload.sub;

      const email =
        String(
          payload.email ||
            "",
        )
          .trim()
          .toLowerCase();

      const name =
        normalizeName(
          payload.name ||
            payload.given_name ||
            "Jihaan User",
        );

      const picture =
        payload.picture ||
        "";

      const emailVerified =
        payload.email_verified ===
        true;

      if (!googleId) {
        return res.status(401).json({
          success: false,
          message:
            "Google account ID is missing.",
        });
      }

      if (!email) {
        return res.status(400).json({
          success: false,
          message:
            "Your Google account does not provide an email address.",
        });
      }

      if (!emailVerified) {
        return res.status(401).json({
          success: false,
          message:
            "Your Google email address is not verified.",
        });
      }

      /*
       * STEP 1:
       * Find account using Google ID.
       */

      let user =
        await User.findOne({
          googleId,
          role:
            CUSTOMER_ROLE,
        });

      if (user) {
        if (
          !checkAccountStatus(
            user,
            res,
          )
        ) {
          return;
        }

        return completeLogin(
          user,
          res,
          "Google login successful.",
        );
      }

      /*
       * STEP 2:
       * Find existing account by email.
       *
       * We link the Google ID to the existing account.
       *
       * No email OTP is required.
       * No WhatsApp OTP is required.
       */

      user =
        await User.findOne({
          email,
          role:
            CUSTOMER_ROLE,
        });

      if (user) {
        if (
          !checkAccountStatus(
            user,
            res,
          )
        ) {
          return;
        }

        if (
          !user.googleId
        ) {
          user.googleId =
            googleId;
        }

        if (
          !user.profileImage &&
          picture
        ) {
          user.profileImage =
            picture;
        }

        user.isEmailVerified =
          true;

        if (
          !user.authProvider ||
          user.authProvider ===
            "local"
        ) {
          if (!user.password) {
            user.authProvider =
              "google";
          }
        }

        await user.save();

        return completeLogin(
          user,
          res,
          "Google login successful.",
        );
      }

      /*
       * STEP 3:
       * New Google user.
       *
       * Create immediately.
       *
       * No email OTP.
       * No phone OTP.
       * No WhatsApp verification.
       */

      const userData = {
        name:
          name ||
          "Jihaan User",

        email,

        googleId,

        profileImage:
          picture,

        role:
          CUSTOMER_ROLE,

        authProvider:
          "google",

        isEmailVerified:
          true,

        isPhoneVerified:
          false,

        isActive:
          true,

        isBlocked:
          false,
      };

      user =
        await User.create(
          userData,
        );

      return completeLogin(
        user,
        res,
        "Google account created successfully. Welcome to Jihaan Cosmetics!",
      );
    } catch (error) {
      console.error(
        "GOOGLE LOGIN ERROR:",
        error,
      );

      if (
        error?.code ===
        11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "An account with this Google email already exists. Please try logging in again.",
        });
      }

      if (
        error?.message?.includes(
          "Wrong number of segments",
        ) ||
        error?.message?.includes(
          "Invalid token",
        ) ||
        error?.message?.includes(
          "Token used too late",
        )
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid or expired Google credential.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Server error during Google login.",
        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  };

/* =========================================================
   FACEBOOK LOGIN

   POST /api/auth/facebook

   Flow:

   Existing Facebook account
        ↓
   Login immediately

   Existing email account
        ↓
   Link Facebook account
        ↓
   Login immediately

   New Facebook account
        ↓
   Create account
        ↓
   Login immediately

   IMPORTANT:
   Facebook login does NOT use WhatsApp OTP.
========================================================= */

export const facebookLogin =
  async (
    req,
    res,
  ) => {
    try {
      const {
        accessToken,
        token,
      } =
        req.body || {};

      const facebookToken =
        accessToken ||
        token;

      if (!facebookToken) {
        return res.status(400).json({
          success: false,
          message:
            "Facebook access token is required.",
        });
      }

      const appId =
        process.env.FACEBOOK_APP_ID;

      const appSecret =
        process.env.FACEBOOK_APP_SECRET;

      const graphVersion =
        process.env.FACEBOOK_GRAPH_VERSION ||
        "v24.0";

      if (
        !appId ||
        !appSecret
      ) {
        console.error(
          "Facebook authentication environment variables are missing.",
        );

        return res.status(500).json({
          success: false,
          message:
            "Facebook authentication is not configured.",
        });
      }

      const appAccessToken =
        `${appId}|${appSecret}`;

      const debugUrl =
        `https://graph.facebook.com/${graphVersion}/debug_token` +
        `?input_token=${encodeURIComponent(
          facebookToken,
        )}` +
        `&access_token=${encodeURIComponent(
          appAccessToken,
        )}`;

      const debugResponse =
        await fetch(
          debugUrl,
        );

      const debugData =
        await debugResponse.json();

      if (
        !debugResponse.ok ||
        !debugData?.data?.is_valid
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid or expired Facebook access token.",
        });
      }

      const tokenData =
        debugData.data;

      if (
        tokenData.app_id &&
        String(
          tokenData.app_id,
        ) !==
          String(appId)
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Facebook token does not belong to this application.",
        });
      }

      const profileUrl =
        `https://graph.facebook.com/${graphVersion}/me` +
        `?fields=id,name,email,picture.type(large)` +
        `&access_token=${encodeURIComponent(
          facebookToken,
        )}`;

      const profileResponse =
        await fetch(
          profileUrl,
        );

      const profileData =
        await profileResponse.json();

      if (
        !profileResponse.ok ||
        !profileData?.id
      ) {
        console.error(
          "FACEBOOK PROFILE ERROR:",
          profileData,
        );

        return res.status(401).json({
          success: false,
          message:
            "Unable to retrieve your Facebook account information.",
        });
      }

      const facebookId =
        profileData.id;

      const email =
        String(
          profileData.email ||
            "",
        )
          .trim()
          .toLowerCase();

      const name =
        normalizeName(
          profileData.name ||
            "Jihaan User",
        );

      const picture =
        profileData?.picture
          ?.data?.url ||
        "";

      if (!email) {
        return res.status(400).json({
          success: false,
          message:
            "Your Facebook account does not provide an email address. Please use email registration instead.",
        });
      }

      let user =
        await User.findOne({
          facebookId,
          role:
            CUSTOMER_ROLE,
        });

      if (user) {
        if (
          !checkAccountStatus(
            user,
            res,
          )
        ) {
          return;
        }

        return completeLogin(
          user,
          res,
          "Facebook login successful.",
        );
      }

      user =
        await User.findOne({
          email,
          role:
            CUSTOMER_ROLE,
        });

      if (user) {
        if (
          !checkAccountStatus(
            user,
            res,
          )
        ) {
          return;
        }

        if (
          !user.facebookId
        ) {
          user.facebookId =
            facebookId;
        }

        if (
          !user.profileImage &&
          picture
        ) {
          user.profileImage =
            picture;
        }

        user.isEmailVerified =
          true;

        if (
          !user.authProvider ||
          user.authProvider ===
            "local"
        ) {
          if (!user.password) {
            user.authProvider =
              "facebook";
          }
        }

        await user.save();

        return completeLogin(
          user,
          res,
          "Facebook login successful.",
        );
      }

      user =
        await User.create({
          name:
            name ||
            "Jihaan User",

          email,

          facebookId,

          profileImage:
            picture,

          role:
            CUSTOMER_ROLE,

          authProvider:
            "facebook",

          isEmailVerified:
            true,

          isPhoneVerified:
            false,

          isActive:
            true,

          isBlocked:
            false,
        });

      return completeLogin(
        user,
        res,
        "Facebook account created successfully. Welcome to Jihaan Cosmetics!",
      );
    } catch (error) {
      console.error(
        "FACEBOOK LOGIN ERROR:",
        error,
      );

      if (
        error?.code ===
        11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "An account with this Facebook email already exists. Please try logging in again.",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Server error during Facebook login.",
        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  };
  /* =========================================================
   ADMIN LOGIN
========================================================= */

export const adminLogin =
  async (
    req,
    res,
  ) => {
    try {
      const {
        email,
        password,
      } =
        req.body || {};

      const normalizedEmail =
        String(
          email || "",
        )
          .trim()
          .toLowerCase();

      if (
        !normalizedEmail ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Email and password are required.",
        });
      }

      const user =
        await User.findOne({
          email:
            normalizedEmail,
        }).select(
          "+password",
        );

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email or password.",
        });
      }

      const isAdmin =
        isAdminRole(
          user.role,
        );

      if (!isAdmin) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to access the admin panel.",
        });
      }

      if (
        !checkAccountStatus(
          user,
          res,
        )
      ) {
        return;
      }

      if (!user.password) {
        return res.status(401).json({
          success: false,
          message:
            "This admin account does not have a password configured.",
        });
      }

      const passwordValid =
        await bcrypt.compare(
          password,
          user.password,
        );

      if (!passwordValid) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email or password.",
        });
      }

      return completeLogin(
        user,
        res,
        "Admin login successful.",
      );
    } catch (error) {
      console.error(
        "ADMIN LOGIN ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error during admin login.",
        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  };

/* =========================================================
   FORGOT PASSWORD

   POST /api/auth/forgot-password

   Flow:

   Email
      ↓
   Find account
      ↓
   Generate email OTP
      ↓
   Send OTP through SMTP
      ↓
   User verifies OTP
      ↓
   Reset token is issued
      ↓
   User sets new password

   IMPORTANT:
   Forgot password uses EMAIL OTP.
   It does NOT use WhatsApp OTP.
========================================================= */

export const forgotPassword =
  async (
    req,
    res,
  ) => {
    try {
      const {
        email,
      } =
        req.body || {};

      const normalizedEmail =
        String(
          email || "",
        )
          .trim()
          .toLowerCase();

      if (
        !isValidEmail(
          normalizedEmail,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid email address.",
        });
      }

      const user =
        await User.findOne({
          email:
            normalizedEmail,

          role:
            CUSTOMER_ROLE,
        });

      /*
       * Do not reveal whether an email exists.
       * This prevents account/email enumeration.
       */

      if (!user) {
        return res.status(200).json({
          success: true,

          requiresOtp: true,

          message:
            "If an account exists with this email, an OTP has been sent.",
        });
      }

      if (
        !checkAccountStatus(
          user,
          res,
        )
      ) {
        return;
      }

      const challenge =
        await createEmailOtpChallenge(
          {
            email:
              normalizedEmail,

            purpose:
              "forgot-password",

            userId:
              user._id.toString(),
          },
        );

      return res.status(200).json({
        success: true,

        requiresOtp: true,

        message:
          "A password reset OTP has been sent to your email.",

        email:
          normalizedEmail,

        maskedEmail:
          maskEmail(
            normalizedEmail,
          ),

        challengeId:
          challenge.challengeId,

        expiresIn:
          challenge.expiresIn,

        resendAfter:
          challenge.resendAfter,
      });
    } catch (error) {
      console.error(
        "FORGOT PASSWORD ERROR:",
        error,
      );

      if (
        error?.code ===
        "OTP_RESEND_COOLDOWN"
      ) {
        return res.status(429).json({
          success: false,

          message:
            error.message,

          retryAfter:
            error.retryAfter,
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to start password reset. Please try again.",
      });
    }
  };

/* =========================================================
   VERIFY FORGOT PASSWORD OTP

   POST /api/auth/forgot-password/verify-otp

   Successful verification returns a short-lived
   password reset token.

   The reset token can then be used with:
      POST /api/auth/reset-password
========================================================= */

export const verifyForgotPasswordOtp =
  async (
    req,
    res,
  ) => {
    try {
      const {
        email,
        otp,
      } =
        req.body || {};

      const normalizedEmail =
        String(
          email || "",
        )
          .trim()
          .toLowerCase();

      const normalizedOtp =
        String(
          otp || "",
        ).trim();

      if (
        !isValidEmail(
          normalizedEmail,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid email address.",
        });
      }

      if (
        !/^\d{6}$/.test(
          normalizedOtp,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter the 6-digit OTP.",
        });
      }

      const verification =
        await verifyEmailOtpChallenge(
          {
            email:
              normalizedEmail,

            purpose:
              "forgot-password",

            otp:
              normalizedOtp,
          },
        );

      if (
        !verification.success
      ) {
        return res.status(400).json({
          success: false,

          message:
            verification.message,

          code:
            verification.code,

          attemptsRemaining:
            verification.attemptsRemaining,
        });
      }

      const userId =
        verification.record
          ?.userId;

      const user =
        userId
          ? await User.findOne({
              _id:
                userId,

              role:
                CUSTOMER_ROLE,
            })
          : await User.findOne({
              email:
                normalizedEmail,

              role:
                CUSTOMER_ROLE,
            });

      if (!user) {
        return res.status(400).json({
          success: false,

          message:
            "Account not found. Please start the password reset process again.",
        });
      }

      if (
        !checkAccountStatus(
          user,
          res,
        )
      ) {
        return;
      }

      /*
       * OTP has now been successfully verified.
       *
       * Only now create the password reset token.
       */

      const resetToken =
        createPasswordResetToken(
          user,
        );

      return res.status(200).json({
        success: true,

        message:
          "OTP verified successfully. You can now reset your password.",

        resetToken,

        expiresIn:
          PASSWORD_RESET_TOKEN_EXPIRY_MINUTES *
          60,
      });
    } catch (error) {
      console.error(
        "VERIFY FORGOT PASSWORD OTP ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to verify OTP. Please try again.",
      });
    }
  };

/* =========================================================
   RESEND FORGOT PASSWORD OTP

   POST /api/auth/forgot-password/resend-otp
========================================================= */

export const resendForgotPasswordOtp =
  async (
    req,
    res,
  ) => {
    try {
      const {
        email,
      } =
        req.body || {};

      const normalizedEmail =
        String(
          email || "",
        )
          .trim()
          .toLowerCase();

      if (
        !isValidEmail(
          normalizedEmail,
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Please enter a valid email address.",
        });
      }

      const user =
        await User.findOne({
          email:
            normalizedEmail,

          role:
            CUSTOMER_ROLE,
        });

      /*
       * Keep the response generic if the account
       * does not exist.
       */

      if (!user) {
        return res.status(200).json({
          success: true,

          message:
            "If an account exists with this email, a new OTP has been sent.",
        });
      }

      if (
        !checkAccountStatus(
          user,
          res,
        )
      ) {
        return;
      }

      const challenge =
        await createEmailOtpChallenge(
          {
            email:
              normalizedEmail,

            purpose:
              "forgot-password",

            userId:
              user._id.toString(),
          },
        );

      return res.status(200).json({
        success: true,

        requiresOtp: true,

        message:
          "A new password reset OTP has been sent to your email.",

        email:
          normalizedEmail,

        maskedEmail:
          maskEmail(
            normalizedEmail,
          ),

        challengeId:
          challenge.challengeId,

        expiresIn:
          challenge.expiresIn,

        resendAfter:
          challenge.resendAfter,
      });
    } catch (error) {
      console.error(
        "RESEND FORGOT PASSWORD OTP ERROR:",
        error,
      );

      if (
        error?.code ===
        "OTP_RESEND_COOLDOWN"
      ) {
        return res.status(429).json({
          success: false,

          message:
            error.message,

          retryAfter:
            error.retryAfter,
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to resend password reset OTP. Please try again.",
      });
    }
  };

/* =========================================================
   RESET PASSWORD

   POST /api/auth/reset-password

   Body:
   {
     resetToken,
     password
   }
========================================================= */

export const resetPassword =
  async (
    req,
    res,
  ) => {
    try {
      const {
        resetToken,
        token,
        password,
        newPassword,
      } =
        req.body || {};

      const passwordResetToken =
        resetToken ||
        token;

      const finalPassword =
        newPassword ||
        password;

      if (
        !passwordResetToken
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Password reset token is required.",
        });
      }

      if (
        !finalPassword
      ) {
        return res.status(400).json({
          success: false,

          message:
            "New password is required.",
        });
      }

      const passwordValidation =
        validatePassword(
          finalPassword,
        );

      if (
        !passwordValidation.valid
      ) {
        return res.status(400).json({
          success: false,

          message:
            passwordValidation.message,
        });
      }

      let decoded;

      try {
        decoded =
          verifyPasswordResetToken(
            passwordResetToken,
          );
      } catch (tokenError) {
        return res.status(400).json({
          success: false,

          message:
            "Password reset token is invalid or expired. Please request a new OTP.",
        });
      }

      if (
        !decoded?.userId
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid password reset token.",
        });
      }

      const user =
        await User.findOne({
          _id:
            decoded.userId,

          role:
            CUSTOMER_ROLE,
        }).select(
          "+password",
        );

      if (!user) {
        return res.status(404).json({
          success: false,

          message:
            "User account not found.",
        });
      }

      if (
        !checkAccountStatus(
          user,
          res,
        )
      ) {
        return;
      }

      const hashedPassword =
        await bcrypt.hash(
          finalPassword,
          12,
        );

      user.password =
        hashedPassword;

      /*
       * A password reset through verified email
       * confirms the email address.
       */

      user.isEmailVerified =
        true;

      /*
       * Keep the account as a local/password-capable
       * account when it previously had no local password.
       */

      if (
        !user.authProvider
      ) {
        user.authProvider =
          "local";
      }

      await user.save();

      return res.status(200).json({
        success: true,

        message:
          "Password reset successfully. You can now log in with your new password.",
      });
    } catch (error) {
      console.error(
        "RESET PASSWORD ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to reset password. Please try again.",
      });
    }
  };

/* =========================================================
   LOGOUT USER
========================================================= */

export const logoutUser =
  async (
    req,
    res,
  ) => {
    try {
      /*
       * JWT authentication is stateless.
       *
       * The frontend should remove the stored token.
       *
       * If refresh-token/session storage is added later,
       * revoke it here.
       */

      return res.status(200).json({
        success: true,

        message:
          "Logged out successfully.",
      });
    } catch (error) {
      console.error(
        "LOGOUT ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to logout.",
      });
    }
  };

/* =========================================================
   GET CURRENT USER
========================================================= */

export const getCurrentUser =
  async (
    req,
    res,
  ) => {
    try {
      const userId =
        req.user?.id ||
        req.user?._id ||
        req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,

          message:
            "Authentication required.",
        });
      }

      const user =
        await User.findById(
          userId,
        );

      if (!user) {
        return res.status(404).json({
          success: false,

          message:
            "User account not found.",
        });
      }

      if (
        !checkAccountStatus(
          user,
          res,
        )
      ) {
        return;
      }

      return res.status(200).json({
        success: true,

        user:
          sanitizeUser(
            user,
          ),
      });
    } catch (error) {
      console.error(
        "GET CURRENT USER ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to retrieve current user.",
      });
    }
  };
  /* =========================================================
   UPDATE PROFILE
========================================================= */

export const updateProfile =
  async (
    req,
    res,
  ) => {
    try {
      const userId =
        req.user?.id ||
        req.user?._id ||
        req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required.",
        });
      }

      const user =
        await User.findById(
          userId,
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User account not found.",
        });
      }

      if (
        !checkAccountStatus(
          user,
          res,
        )
      ) {
        return;
      }

      const {
        name,
        phone,
        profileImage,
        gender,
        dateOfBirth,
        address,
      } =
        req.body || {};

      if (
        name !== undefined
      ) {
        const normalizedName =
          normalizeName(
            name,
          );

        if (
          !normalizedName ||
          normalizedName.length <
            2
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please enter a valid name.",
          });
        }

        user.name =
          normalizedName;
      }

      if (
        phone !== undefined
      ) {
        const normalizedPhone =
          normalizePhone(
            phone,
          );

        if (
          normalizedPhone &&
          !isValidPhone(
            normalizedPhone,
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please enter a valid phone number.",
          });
        }

        if (
          normalizedPhone &&
          normalizedPhone !==
            user.phone
        ) {
          const existingUser =
            await User.findOne({
              phone:
                normalizedPhone,

              _id: {
                $ne:
                  user._id,
              },
            });

          if (existingUser) {
            return res.status(409).json({
              success: false,
              message:
                "This phone number is already registered with another account.",
            });
          }

          user.phone =
            normalizedPhone;

          user.isPhoneVerified =
            false;
        }
      }

      if (
        profileImage !==
        undefined
      ) {
        user.profileImage =
          String(
            profileImage || "",
          ).trim();
      }

      if (
        gender !== undefined
      ) {
        user.gender =
          String(
            gender || "",
          ).trim();
      }

      if (
        dateOfBirth !==
        undefined
      ) {
        user.dateOfBirth =
          dateOfBirth || null;
      }

      if (
        address !== undefined
      ) {
        user.address =
          address;
      }

      await user.save();

      return res.status(200).json({
        success: true,

        message:
          "Profile updated successfully.",

        user:
          sanitizeUser(
            user,
          ),
      });
    } catch (error) {
      console.error(
        "UPDATE PROFILE ERROR:",
        error,
      );

      if (
        error?.code ===
        11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "One of the provided profile details is already in use.",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update profile.",
      });
    }
  };

/* =========================================================
   UPDATE STAFF PROFILE
========================================================= */

export const updateStaffProfile =
  async (
    req,
    res,
  ) => {
    try {
      const userId =
        req.user?.id ||
        req.user?._id ||
        req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,

          message:
            "Authentication required.",
        });
      }

      const user =
        await User.findById(
          userId,
        );

      if (!user) {
        return res.status(404).json({
          success: false,

          message:
            "User account not found.",
        });
      }

      if (
        !isStaffRole(
          user.role,
        )
      ) {
        return res.status(403).json({
          success: false,

          message:
            "This endpoint is available only for staff accounts.",
        });
      }

      if (
        !checkAccountStatus(
          user,
          res,
        )
      ) {
        return;
      }

      const {
        name,
        phone,
        profileImage,
        department,
        designation,
      } =
        req.body || {};

      if (
        name !== undefined
      ) {
        const normalizedName =
          normalizeName(
            name,
          );

        if (
          !normalizedName ||
          normalizedName.length <
            2
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Please enter a valid name.",
          });
        }

        user.name =
          normalizedName;
      }

      if (
        phone !== undefined
      ) {
        const normalizedPhone =
          normalizePhone(
            phone,
          );

        if (
          normalizedPhone &&
          !isValidPhone(
            normalizedPhone,
          )
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Please enter a valid phone number.",
          });
        }

        if (
          normalizedPhone &&
          normalizedPhone !==
            user.phone
        ) {
          const existingUser =
            await User.findOne({
              phone:
                normalizedPhone,

              _id: {
                $ne:
                  user._id,
              },
            });

          if (existingUser) {
            return res.status(409).json({
              success: false,

              message:
                "This phone number is already registered with another account.",
            });
          }

          user.phone =
            normalizedPhone;

          user.isPhoneVerified =
            false;
        }
      }

      if (
        profileImage !==
        undefined
      ) {
        user.profileImage =
          String(
            profileImage || "",
          ).trim();
      }

      if (
        department !==
        undefined
      ) {
        user.department =
          String(
            department || "",
          ).trim();
      }

      if (
        designation !==
        undefined
      ) {
        user.designation =
          String(
            designation || "",
          ).trim();
      }

      await user.save();

      return res.status(200).json({
        success: true,

        message:
          "Staff profile updated successfully.",

        user:
          sanitizeUser(
            user,
          ),
      });
    } catch (error) {
      console.error(
        "UPDATE STAFF PROFILE ERROR:",
        error,
      );

      if (
        error?.code ===
        11000
      ) {
        return res.status(409).json({
          success: false,

          message:
            "One of the provided profile details is already in use.",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update staff profile.",
      });
    }
  };

/* =========================================================
   CHANGE PASSWORD

   POST /api/auth/change-password

   Body:
   {
     currentPassword,
     newPassword
   }
========================================================= */

export const changePassword =
  async (
    req,
    res,
  ) => {
    try {
      const userId =
        req.user?.id ||
        req.user?._id ||
        req.user?.userId;

      if (!userId) {
        return res.status(401).json({
          success: false,

          message:
            "Authentication required.",
        });
      }

      const {
        currentPassword,
        newPassword,
        password,
      } =
        req.body || {};

      const finalNewPassword =
        newPassword ||
        password;

      if (
        !currentPassword ||
        !finalNewPassword
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Current password and new password are required.",
        });
      }

      const passwordValidation =
        validatePassword(
          finalNewPassword,
        );

      if (
        !passwordValidation.valid
      ) {
        return res.status(400).json({
          success: false,

          message:
            passwordValidation.message,
        });
      }

      const user =
        await User.findById(
          userId,
        ).select(
          "+password",
        );

      if (!user) {
        return res.status(404).json({
          success: false,

          message:
            "User account not found.",
        });
      }

      if (
        !checkAccountStatus(
          user,
          res,
        )
      ) {
        return;
      }

      if (!user.password) {
        return res.status(400).json({
          success: false,

          message:
            "This account does not currently have a password. Please use forgot password to create one.",
        });
      }

      const currentPasswordValid =
        await bcrypt.compare(
          currentPassword,
          user.password,
        );

      if (!currentPasswordValid) {
        return res.status(400).json({
          success: false,

          message:
            "Current password is incorrect.",
        });
      }

      const samePassword =
        await bcrypt.compare(
          finalNewPassword,
          user.password,
        );

      if (samePassword) {
        return res.status(400).json({
          success: false,

          message:
            "New password must be different from your current password.",
        });
      }

      user.password =
        await bcrypt.hash(
          finalNewPassword,
          12,
        );

      await user.save();

      return res.status(200).json({
        success: true,

        message:
          "Password changed successfully.",
      });
    } catch (error) {
      console.error(
        "CHANGE PASSWORD ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to change password.",
      });
    }
  };

/* =========================================================
   VERIFY EMAIL TRANSPORTER
   Useful for checking SMTP configuration.

   This uses the GoDaddy mailbox configured in:
   SMTP_HOST
   SMTP_PORT
   SMTP_USER
   SMTP_PASS
========================================================= */

export const verifyEmailTransport =
  async (
    req,
    res,
  ) => {
    try {
      await emailTransporter.verify();

      return res.status(200).json({
        success: true,

        message:
          "Email SMTP connection is working correctly.",
      });
    } catch (error) {
      console.error(
        "EMAIL TRANSPORT VERIFY ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Email SMTP connection failed.",

        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  };