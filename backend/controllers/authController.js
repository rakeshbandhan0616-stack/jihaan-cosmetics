import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import mongoose from "mongoose";
import { OAuth2Client } from "google-auth-library";
import User from "../models/User.js";
import { sendWhatsAppOtp } from "../services/whatsappService.js";

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
   OTP CONFIGURATION
========================================================= */

const OTP_LENGTH = 6;

const OTP_EXPIRY_MINUTES = 5;

const OTP_EXPIRY_MS =
  OTP_EXPIRY_MINUTES * 60 * 1000;

const OTP_MAX_ATTEMPTS = 5;

const OTP_RESEND_COOLDOWN_SECONDS = 60;

const RESET_TOKEN_EXPIRY = "10m";

const OTP_COLLECTION_NAME =
  "otpverifications";

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
   CREATE SHORT-LIVED SOCIAL REGISTRATION TOKEN

   This token is NOT the final login token.

   Flow:

   Social login
       ↓
   Mobile number
       ↓
   WhatsApp OTP
       ↓
   OTP verification
       ↓
   Account creation
========================================================= */

const createSocialPendingToken = ({
  provider,
  providerId,
  email,
  name,
  profileImage,
}) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is missing in the .env file",
    );
  }

  return jwt.sign(
    {
      type: "social-registration",
      provider,
      providerId,
      email,
      name,
      profileImage: profileImage || "",
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "10m",
    },
  );
};

/* =========================================================
   VERIFY SOCIAL REGISTRATION TOKEN
========================================================= */

const verifySocialPendingToken = (token) => {
  if (!token) {
    throw new Error(
      "Social registration token is required",
    );
  }

  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is missing in the .env file",
    );
  }

  const decoded = jwt.verify(
    token,
    process.env.JWT_SECRET,
  );

  if (
    decoded.type !==
    "social-registration"
  ) {
    throw new Error(
      "Invalid social registration token",
    );
  }

  return decoded;
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
   MONGODB OTP COLLECTION
========================================================= */

const getOtpCollection = async () => {
  if (
    mongoose.connection.readyState !==
    1
  ) {
    throw new Error(
      "MongoDB connection is not ready",
    );
  }

  const collection =
    mongoose.connection.collection(
      OTP_COLLECTION_NAME,
    );

  /*
   * TTL index.
   *
   * MongoDB automatically removes documents
   * after expiresAt.
   */
  try {
    await collection.createIndex(
      {
        expiresAt: 1,
      },
      {
        expireAfterSeconds: 0,
        name: "otp_expiry_ttl",
      },
    );
  } catch (error) {
    /*
     * Index may already exist.
     * Do not break OTP requests because of
     * an already-created index.
     */
    if (
      !String(
        error?.message || "",
      ).includes(
        "already exists",
      )
    ) {
      console.error(
        "OTP TTL INDEX ERROR:",
        error,
      );
    }
  }

  try {
    await collection.createIndex(
      {
        phone: 1,
        purpose: 1,
        challengeKey: 1,
      },
      {
        name:
          "otp_lookup_index",
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
        "OTP LOOKUP INDEX ERROR:",
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

   Prevent storing social tokens directly
   inside OTP records.
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
   INVALIDATE EXISTING OTP
========================================================= */

const invalidateExistingOtp = async ({
  phone,
  purpose,
  challengeKey,
}) => {
  const collection =
    await getOtpCollection();

  await collection.updateMany(
    {
      phone,
      purpose,
      challengeKey,
      consumedAt: null,
      expiresAt: {
        $gt: new Date(),
      },
    },
    {
      $set: {
        consumedAt:
          new Date(),
      },
    },
  );
};

/* =========================================================
   CHECK RESEND COOLDOWN
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
   CREATE OTP CHALLENGE
========================================================= */

const createOtpChallenge = async ({
  phone,
  purpose,
  challengeKey,
  userId = null,
}) => {
  const collection =
    await getOtpCollection();

  const existing =
    await collection.findOne(
      {
        phone,
        purpose,
        challengeKey,
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

  /*
   * Invalidate older OTP.
   */
  if (existing) {
    await collection.updateMany(
      {
        phone,
        purpose,
        challengeKey,
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

  const otpHash =
    hashOtp(otp);

  const now =
    new Date();

  const expiresAt =
    new Date(
      now.getTime() +
        OTP_EXPIRY_MS,
    );

  const record = {
    phone,

    purpose,

    challengeKey,

    userId:
      userId
        ? new mongoose.Types.ObjectId(
            userId,
          )
        : null,

    otpHash,

    attempts: 0,

    maxAttempts:
      OTP_MAX_ATTEMPTS,

    createdAt: now,

    lastSentAt: now,

    expiresAt,

    consumedAt: null,

    whatsappMessageId:
      null,
  };

  const insertResult =
    await collection.insertOne(
      record,
    );

  /*
   * Send OTP only after creating the
   * challenge. If WhatsApp fails, invalidate
   * the challenge.
   */
  try {
    const whatsappResult =
      await sendWhatsAppOtp({
        phone,
        otp,
      });

    await collection.updateOne(
      {
        _id:
          insertResult.insertedId,
      },
      {
        $set: {
          whatsappMessageId:
            whatsappResult.messageId,
        },
      },
    );
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
   VERIFY OTP CHALLENGE
========================================================= */

const verifyOtpChallenge = async ({
  phone,
  purpose,
  challengeKey,
  otp,
}) => {
  const collection =
    await getOtpCollection();

  const record =
    await collection.findOne(
      {
        phone,
        purpose,
        challengeKey,
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
        _id: record._id,
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
        _id: record._id,
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
    };
  }

  await collection.updateOne(
    {
      _id: record._id,
    },
    {
      $set: {
        consumedAt:
          new Date(),
        verifiedAt:
          new Date(),
      },
    },
  );

  return {
    success: true,
    record,
  };
};

/* =========================================================
   CREATE PASSWORD RESET TOKEN
========================================================= */

const createPasswordResetToken = ({
  userId,
  challengeId,
}) => {
  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is missing in the .env file",
    );
  }

  return jwt.sign(
    {
      type:
        "password-reset",

      userId:
        userId.toString(),

      challengeId:
        challengeId.toString(),
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

const verifyPasswordResetToken = (
  token,
) => {
  if (!token) {
    throw new Error(
      "Password reset token is required",
    );
  }

  if (!process.env.JWT_SECRET) {
    throw new Error(
      "JWT_SECRET is missing in the .env file",
    );
  }

  const decoded =
    jwt.verify(
      token,
      process.env.JWT_SECRET,
    );

  if (
    decoded.type !==
    "password-reset"
  ) {
    throw new Error(
      "Invalid password reset token",
    );
  }

  return decoded;
};

/* =========================================================
   STAFF LOGIN

   POST /api/auth/admin-login
========================================================= */

export const adminLogin =
  async (
    req,
    res,
  ) => {
    try {
      const rawEmail =
        req.body?.email ??
        req.body?.identifier ??
        req.body?.login ??
        "";

      const rawPassword =
        req.body?.password ??
        "";

      const normalizedEmail =
        String(
          rawEmail,
        )
          .trim()
          .toLowerCase();

      const password =
        String(
          rawPassword,
        );

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

      if (
        !isValidEmail(
          normalizedEmail,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid staff email address.",
        });
      }

      const staff =
        await User.findOne({
          email:
            normalizedEmail,

          role: {
            $in:
              STAFF_ROLES,
          },
        }).select(
          "+password",
        );

      if (!staff) {
        return res.status(401).json({
          success: false,
          message:
            "Staff account not found. Check the email and staff role.",
        });
      }

      if (
        !STAFF_ROLES.includes(
          staff.role,
        )
      ) {
        return res.status(403).json({
          success: false,
          message:
            "This account does not have permission to access the staff portal.",
        });
      }

      if (
        !checkAccountStatus(
          staff,
          res,
        )
      ) {
        return;
      }

      if (!staff.password) {
        return res.status(401).json({
          success: false,
          message:
            "This staff account does not have a valid password.",
        });
      }

      const isPasswordValid =
        await bcrypt.compare(
          password,
          staff.password,
        );

      if (
        !isPasswordValid
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid staff email or password.",
        });
      }

      const roleMessages = {
        superadmin:
          "Superadmin login successful.",

        admin:
          "Admin login successful.",

        accounts:
          "Accounts login successful.",

        logistics:
          "Logistics login successful.",
      };

      return completeLogin(
        staff,
        res,
        roleMessages[
          staff.role
        ] ||
          "Staff login successful.",
      );
    } catch (error) {
      console.error(
        "STAFF LOGIN ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error during staff login.",
        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  };

/* =========================================================
   USER REGISTRATION

   POST /api/auth/register
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
        confirmPassword,
      } =
        req.body;

      if (
        !name ||
        !email ||
        !phone ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Name, email, phone, and password are required",
        });
      }

      const normalizedName =
        normalizeName(name);

      const normalizedEmail =
        String(
          email,
        )
          .trim()
          .toLowerCase();

      const normalizedPhone =
        normalizePhone(phone);

      if (
        normalizedName.length <
        2
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Name must contain at least 2 characters",
        });
      }

      if (
        normalizedName.length >
        80
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Name cannot exceed 80 characters",
        });
      }

      if (
        !isValidEmail(
          normalizedEmail,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid email address",
        });
      }

      if (
        !isValidPhone(
          normalizedPhone,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid 10-digit mobile number",
        });
      }

      if (
        String(password).length <
        4
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must contain at least 4 characters",
        });
      }

      if (
        confirmPassword !==
          undefined &&
        password !==
          confirmPassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Passwords do not match",
        });
      }

      const existingUser =
        await User.findOne({
          $or: [
            {
              email:
                normalizedEmail,
            },
            {
              phone:
                normalizedPhone,
            },
          ],
        });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message:
            "Email or phone number is already registered",
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          12,
        );

      const profileImage =
        req.file
          ? `/uploads/users/${req.file.filename}`
          : "";

      const user =
        await User.create({
          name:
            normalizedName,

          email:
            normalizedEmail,

          phone:
            normalizedPhone,

          password:
            hashedPassword,

          authProvider:
            "local",

          profileImage,

          role:
            CUSTOMER_ROLE,

          isActive:
            true,

          isBlocked:
            false,

          isEmailVerified:
            false,

          /*
           * Kept false because the current
           * local-registration frontend does not
           * use the social OTP flow.
           */
          isPhoneVerified:
            false,
        });

      const token =
        createToken(user);

      setAuthCookie(
        res,
        token,
      );

      return res.status(201).json({
        success: true,

        message:
          "Registration successful",

        token,

        user:
          getUserResponse(user),
      });
    } catch (error) {
      console.error(
        "USER REGISTRATION ERROR:",
        error,
      );

      if (
        error?.code ===
        11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Email or phone number is already registered",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Server error during registration",
      });
    }
  };
  /* =========================================================
   USER LOGIN

   POST /api/auth/login
========================================================= */

export const userLogin =
  async (
    req,
    res,
  ) => {
    try {
      const {
        identifier,
        login,
        email,
        phone,
        password,
      } =
        req.body;

      const loginInput =
        identifier ??
        login ??
        email ??
        phone;

      if (
        !loginInput ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Email/phone and password are required",
        });
      }

      const loginValue =
        String(
          loginInput,
        ).trim();

      let userQuery;

      if (
        loginValue.includes("@")
      ) {
        const normalizedEmail =
          loginValue.toLowerCase();

        if (
          !isValidEmail(
            normalizedEmail,
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please enter a valid email address",
          });
        }

        userQuery = {
          email:
            normalizedEmail,

          role:
            CUSTOMER_ROLE,
        };
      } else {
        const normalizedPhone =
          normalizePhone(
            loginValue,
          );

        if (
          !isValidPhone(
            normalizedPhone,
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please enter a valid email or 10-digit mobile number",
          });
        }

        userQuery = {
          phone:
            normalizedPhone,

          role:
            CUSTOMER_ROLE,
        };
      }

      const user =
        await User.findOne(
          userQuery,
        ).select(
          "+password",
        );

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email/phone or password",
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
            "This account uses social login. Please continue with Google or Facebook.",
        });
      }

      const isPasswordValid =
        await bcrypt.compare(
          password,
          user.password,
        );

      if (
        !isPasswordValid
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email/phone or password",
        });
      }

      return completeLogin(
        user,
        res,
        "Login successful",
      );
    } catch (error) {
      console.error(
        "USER LOGIN ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Server error during login",
      });
    }
  };

/* =========================================================
   GOOGLE LOGIN

   POST /api/auth/google
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
      } =
        req.body || {};

      const googleToken =
        credential ||
        idToken;

      if (!googleToken) {
        return res.status(400).json({
          success: false,
          message:
            "Google credential is required",
        });
      }

      if (
        !process.env.GOOGLE_CLIENT_ID
      ) {
        return res.status(500).json({
          success: false,
          message:
            "Google authentication is not configured on the server",
        });
      }

      const ticket =
        await googleClient.verifyIdToken(
          {
            idToken:
              googleToken,

            audience:
              process.env
                .GOOGLE_CLIENT_ID,
          },
        );

      const payload =
        ticket.getPayload();

      if (!payload) {
        return res.status(401).json({
          success: false,
          message:
            "Unable to verify Google account",
        });
      }

      const googleId =
        payload.sub;

      const googleEmail =
        String(
          payload.email ||
            "",
        )
          .trim()
          .toLowerCase();

      const googleName =
        normalizeName(
          payload.name ||
            payload.given_name ||
            "Google User",
        );

      const googleImage =
        payload.picture ||
        "";

      const emailVerified =
        payload.email_verified ===
        true;

      if (!googleId) {
        return res.status(401).json({
          success: false,
          message:
            "Google account ID was not provided",
        });
      }

      if (!googleEmail) {
        return res.status(400).json({
          success: false,
          message:
            "Google did not provide an email address",
        });
      }

      if (!emailVerified) {
        return res.status(403).json({
          success: false,
          message:
            "Your Google email address is not verified",
        });
      }

      /*
       * FIND BY GOOGLE ID
       */

      let user =
        await User.findOne({
          googleId,
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

        user.isEmailVerified =
          true;

        return completeLogin(
          user,
          res,
          "Google login successful",
        );
      }

      /*
       * FIND BY EMAIL
       */

      user =
        await User.findOne({
          email:
            googleEmail,
        });

      if (user) {
        /*
         * Do not silently attach a Google
         * account to another provider.
         */

        if (
          user.authProvider !==
          "google"
        ) {
          return res.status(409).json({
            success: false,

            accountExists:
              true,

            requiresExistingLogin:
              true,

            message:
              "An account already exists with this email. Please log in using your existing login method.",
          });
        }

        if (
          !user.googleId
        ) {
          user.googleId =
            googleId;

          user.isEmailVerified =
            true;

          await user.save();
        }

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
          "Google login successful",
        );
      }

      /*
       * NEW SOCIAL USER
       *
       * Do not create the account yet.
       *
       * First collect phone and verify
       * WhatsApp OTP.
       */

      const socialToken =
        createSocialPendingToken(
          {
            provider:
              "google",

            providerId:
              googleId,

            email:
              googleEmail,

            name:
              googleName,

            profileImage:
              googleImage,
          },
        );

      return res.status(200).json({
        success: true,

        requiresPhone:
          true,

        requiresOtp:
          true,

        provider:
          "google",

        socialToken,

        user: {
          name:
            googleName,

          email:
            googleEmail,

          profileImage:
            googleImage,
        },

        message:
          "Google account verified. Please provide your mobile number and verify OTP to complete registration.",
      });
    } catch (error) {
      console.error(
        "GOOGLE LOGIN ERROR:",
        error,
      );

      if (
        error?.name ===
        "TokenExpiredError"
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Google login session expired. Please try again.",
        });
      }

      return res.status(401).json({
        success: false,
        message:
          "Google authentication failed",
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
========================================================= */

export const facebookLogin =
  async (
    req,
    res,
  ) => {
    try {
      const {
        accessToken,
      } =
        req.body || {};

      if (!accessToken) {
        return res.status(400).json({
          success: false,
          message:
            "Facebook access token is required",
        });
      }

      if (
        !process.env.FACEBOOK_APP_ID ||
        !process.env.FACEBOOK_APP_SECRET
      ) {
        return res.status(500).json({
          success: false,
          message:
            "Facebook authentication is not configured on the server",
        });
      }

      const graphVersion =
        process.env
          .FACEBOOK_GRAPH_VERSION;

      if (!graphVersion) {
        return res.status(500).json({
          success: false,
          message:
            "FACEBOOK_GRAPH_VERSION is not configured",
        });
      }

      /*
       * VERIFY ACCESS TOKEN
       */

      const appAccessToken =
        `${process.env.FACEBOOK_APP_ID}|${process.env.FACEBOOK_APP_SECRET}`;

      const debugUrl =
        `https://graph.facebook.com/${graphVersion}/debug_token` +
        `?input_token=${encodeURIComponent(
          accessToken,
        )}` +
        `&access_token=${encodeURIComponent(
          appAccessToken,
        )}`;

      const debugResponse =
        await fetch(
          debugUrl,
        );

      if (
        !debugResponse.ok
      ) {
        const debugText =
          await debugResponse.text();

        console.error(
          "FACEBOOK DEBUG TOKEN ERROR:",
          debugText,
        );

        return res.status(401).json({
          success: false,
          message:
            "Unable to verify Facebook access token",
        });
      }

      const debugData =
        await debugResponse.json();

      const tokenData =
        debugData?.data;

      if (!tokenData?.is_valid) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid or expired Facebook access token",
        });
      }

      if (
        tokenData.app_id &&
        String(
          tokenData.app_id,
        ) !==
          String(
            process.env
              .FACEBOOK_APP_ID,
          )
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Facebook access token belongs to a different application",
        });
      }

      /*
       * FETCH FACEBOOK PROFILE
       */

      const profileUrl =
        `https://graph.facebook.com/${graphVersion}/me` +
        `?fields=id,name,email,picture.type(large)` +
        `&access_token=${encodeURIComponent(
          accessToken,
        )}`;

      const profileResponse =
        await fetch(
          profileUrl,
        );

      if (
        !profileResponse.ok
      ) {
        const profileText =
          await profileResponse.text();

        console.error(
          "FACEBOOK PROFILE ERROR:",
          profileText,
        );

        return res.status(401).json({
          success: false,
          message:
            "Unable to retrieve Facebook profile",
        });
      }

      const profile =
        await profileResponse.json();

      const facebookId =
        profile?.id;

      const facebookName =
        normalizeName(
          profile?.name ||
            "Facebook User",
        );

      const facebookEmail =
        String(
          profile?.email ||
            "",
        )
          .trim()
          .toLowerCase();

      const facebookImage =
        profile?.picture
          ?.data?.url ||
        "";

      if (!facebookId) {
        return res.status(401).json({
          success: false,
          message:
            "Facebook account ID was not provided",
        });
      }

      /*
       * Facebook may not return an email
       * depending on the account or permission.
       *
       * The current account flow requires
       * an email for the customer account.
       */

      if (!facebookEmail) {
        return res.status(400).json({
          success: false,
          message:
            "Facebook did not provide an email address. Please use another login method.",
        });
      }

      /*
       * FIND BY FACEBOOK ID
       */

      let user =
        await User.findOne({
          facebookId,
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

        user.isEmailVerified =
          true;

        return completeLogin(
          user,
          res,
          "Facebook login successful",
        );
      }

      /*
       * FIND BY EMAIL
       */

      user =
        await User.findOne({
          email:
            facebookEmail,
        });

      if (user) {
        /*
         * Do not silently attach Facebook
         * to another authentication provider.
         */

        if (
          user.authProvider !==
          "facebook"
        ) {
          return res.status(409).json({
            success: false,

            accountExists:
              true,

            requiresExistingLogin:
              true,

            message:
              "An account already exists with this email. Please log in using your existing login method.",
          });
        }

        if (
          !user.facebookId
        ) {
          user.facebookId =
            facebookId;

          user.isEmailVerified =
            true;

          await user.save();
        }

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
          "Facebook login successful",
        );
      }

      /*
       * NEW SOCIAL USER
       *
       * Do not create the account yet.
       *
       * First collect phone and verify
       * WhatsApp OTP.
       */

      const socialToken =
        createSocialPendingToken(
          {
            provider:
              "facebook",

            providerId:
              facebookId,

            email:
              facebookEmail,

            name:
              facebookName,

            profileImage:
              facebookImage,
          },
        );

      return res.status(200).json({
        success: true,

        requiresPhone:
          true,

        requiresOtp:
          true,

        provider:
          "facebook",

        socialToken,

        user: {
          name:
            facebookName,

          email:
            facebookEmail,

          profileImage:
            facebookImage,
        },

        message:
          "Facebook account verified. Please provide your mobile number and verify OTP to complete registration.",
      });
    } catch (error) {
      console.error(
        "FACEBOOK LOGIN ERROR:",
        error,
      );

      return res.status(401).json({
        success: false,
        message:
          "Facebook authentication failed",
        error:
          process.env.NODE_ENV ===
          "development"
            ? error.message
            : undefined,
      });
    }
  };
  /* =========================================================
   SOCIAL SEND OTP

   POST /api/auth/social/send-otp

   Body:
   {
     socialToken,
     phone
   }

   WhatsApp OTP is sent here.
========================================================= */

export const sendSocialOtp =
  async (
    req,
    res,
  ) => {
    try {
      const {
        socialToken,
        phone,
      } =
        req.body || {};

      if (!socialToken) {
        return res.status(400).json({
          success: false,
          message:
            "Social registration token is required",
        });
      }

      if (!phone) {
        return res.status(400).json({
          success: false,
          message:
            "Mobile number is required",
        });
      }

      let decoded;

      try {
        decoded =
          verifySocialPendingToken(
            socialToken,
          );
      } catch {
        return res.status(401).json({
          success: false,
          message:
            "Social registration session expired. Please login with Google/Facebook again.",
        });
      }

      if (
        !SOCIAL_PROVIDERS.includes(
          decoded.provider,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid social authentication provider",
        });
      }

      const normalizedPhone =
        normalizePhone(phone);

      if (
        !isValidPhone(
          normalizedPhone,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid 10-digit mobile number",
        });
      }

      const existingPhone =
        await User.findOne({
          phone:
            normalizedPhone,
        });

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message:
            "This mobile number is already registered. Please login using your existing account.",
        });
      }

      const challengeKey =
        hashChallengeKey(
          `${decoded.provider}:${decoded.providerId}:${normalizedPhone}`,
        );

      const result =
        await createOtpChallenge({
          phone:
            normalizedPhone,

          purpose:
            "social-registration",

          challengeKey,
        });

      return res.status(200).json({
        success: true,

        message:
          "OTP sent successfully to your WhatsApp number.",

        expiresIn:
          result.expiresIn,

        resendAfter:
          result.resendAfter,

        challengeId:
          result.challengeId,
      });
    } catch (error) {
      console.error(
        "SEND SOCIAL OTP ERROR:",
        error,
      );

      if (
        error?.code ===
        "OTP_RESEND_COOLDOWN"
      ) {
        return res.status(429).json({
          success: false,

          code:
            "OTP_RESEND_COOLDOWN",

          message:
            error.message,

          retryAfter:
            error.retryAfter,
        });
      }

      return res.status(500).json({
        success: false,

        message:
          error?.message ||
          "Unable to send OTP at this time",
      });
    }
  };

/* =========================================================
   COMPLETE SOCIAL REGISTRATION

   POST /api/auth/social/complete

   Body:
   {
     socialToken,
     phone,
     otp
   }
========================================================= */

export const completeSocialRegistration =
  async (
    req,
    res,
  ) => {
    try {
      const {
        socialToken,
        phone,
        otp,
      } =
        req.body || {};

      const normalizedPhone =
        normalizePhone(phone);

      const normalizedOtp =
        String(
          otp || "",
        ).trim();

      if (!socialToken) {
        return res.status(400).json({
          success: false,
          message:
            "Social registration token is required",
        });
      }

      if (
        !isValidPhone(
          normalizedPhone,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid Indian mobile number",
        });
      }

      if (
        !/^[0-9]{6}$/.test(
          normalizedOtp,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid 6-digit OTP",
        });
      }

      let socialData;

      try {
        socialData =
          verifySocialPendingToken(
            socialToken,
          );
      } catch {
        return res.status(401).json({
          success: false,
          message:
            "Social registration session expired. Please login with Google/Facebook again.",
        });
      }

      if (
        !SOCIAL_PROVIDERS.includes(
          socialData.provider,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid social login provider",
        });
      }

      const existingPhone =
        await User.findOne({
          phone:
            normalizedPhone,
        });

      if (existingPhone) {
        return res.status(409).json({
          success: false,
          message:
            "This mobile number is already registered. Please login using your existing account.",
        });
      }

      const challengeKey =
        hashChallengeKey(
          `${socialData.provider}:${socialData.providerId}:${normalizedPhone}`,
        );

      const verification =
        await verifyOtpChallenge({
          phone:
            normalizedPhone,

          purpose:
            "social-registration",

          challengeKey,

          otp:
            normalizedOtp,
        });

      if (
        !verification.success
      ) {
        const status =
          verification.code ===
          "OTP_MAX_ATTEMPTS"
            ? 429
            : 400;

        return res.status(
          status,
        ).json({
          success: false,

          code:
            verification.code,

          message:
            verification.message,
        });
      }

      /*
       * Re-check the social account immediately
       * before creating the account.
       */

      const existingSocial =
        socialData.provider ===
        "google"
          ? await User.findOne({
              googleId:
                socialData.providerId,
            })
          : await User.findOne({
              facebookId:
                socialData.providerId,
            });

      if (existingSocial) {
        if (
          !checkAccountStatus(
            existingSocial,
            res,
          )
        ) {
          return;
        }

        return completeLogin(
          existingSocial,
          res,
          `${
            socialData.provider ===
            "google"
              ? "Google"
              : "Facebook"
          } login successful`,
        );
      }

      /*
       * Re-check email because a customer may have
       * registered with the same email while the OTP
       * was being completed.
       */

      const existingEmail =
        await User.findOne({
          email:
            String(
              socialData.email ||
                "",
            )
              .trim()
              .toLowerCase(),
        });

      if (existingEmail) {
        return res.status(409).json({
          success: false,
          accountExists:
            true,
          requiresExistingLogin:
            true,
          message:
            "An account already exists with this email. Please log in using your existing login method.",
        });
      }

      const userData = {
        name:
          normalizeName(
            socialData.name ||
              "Customer",
          ),

        email:
          String(
            socialData.email ||
              "",
          )
            .trim()
            .toLowerCase(),

        phone:
          normalizedPhone,

        authProvider:
          socialData.provider,

        role:
          CUSTOMER_ROLE,

        profileImage:
          socialData.profileImage ||
          "",

        isActive:
          true,

        isBlocked:
          false,

        isEmailVerified:
          true,

        isPhoneVerified:
          true,
      };

      if (
        socialData.provider ===
        "google"
      ) {
        userData.googleId =
          socialData.providerId;
      }

      if (
        socialData.provider ===
        "facebook"
      ) {
        userData.facebookId =
          socialData.providerId;
      }

      const user =
        await User.create(
          userData,
        );

      return completeLogin(
        user,
        res,
        "Registration completed successfully",
      );
    } catch (error) {
      console.error(
        "COMPLETE SOCIAL REGISTRATION ERROR:",
        error,
      );

      if (
        error?.code ===
        11000
      ) {
        return res.status(409).json({
          success: false,
          message:
            "Email, phone number, or social account is already registered",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to complete social registration",
      });
    }
  };

/* =========================================================
   FORGOT PASSWORD

   POST /api/auth/forgot-password

   Body:
   {
     identifier
   }

   Identifier may be:
   - Email
   - Mobile number

   Response intentionally remains generic so that
   account existence is not exposed.
========================================================= */

export const forgotPassword =
  async (
    req,
    res,
  ) => {
    const genericResponse =
      () =>
        res.status(200).json({
          success: true,
          message:
            "If an account exists with these details, a password reset OTP has been sent to the registered WhatsApp number.",
        });

    try {
      const identifier =
        String(
          req.body?.identifier ??
            req.body?.email ??
            req.body?.phone ??
            "",
        ).trim();

      if (!identifier) {
        return genericResponse();
      }

      let user = null;

      if (
        identifier.includes("@")
      ) {
        const normalizedEmail =
          identifier
            .toLowerCase();

        if (
          !isValidEmail(
            normalizedEmail,
          )
        ) {
          return genericResponse();
        }

        user =
          await User.findOne({
            email:
              normalizedEmail,

            role:
              CUSTOMER_ROLE,
          });
      } else {
        const normalizedPhone =
          normalizePhone(
            identifier,
          );

        if (
          !isValidPhone(
            normalizedPhone,
          )
        ) {
          return genericResponse();
        }

        user =
          await User.findOne({
            phone:
              normalizedPhone,

            role:
              CUSTOMER_ROLE,
          });
      }

      if (!user) {
        return genericResponse();
      }

      if (
        user.isBlocked === true ||
        user.isActive === false
      ) {
        return genericResponse();
      }

      /*
       * Social-only accounts should continue
       * using their social provider.
       */

      if (
        SOCIAL_PROVIDERS.includes(
          user.authProvider,
        ) &&
        !user.password
      ) {
        return genericResponse();
      }

      if (
        !user.phone ||
        !isValidPhone(
          normalizePhone(
            user.phone,
          ),
        )
      ) {
        return genericResponse();
      }

      const normalizedPhone =
        normalizePhone(
          user.phone,
        );

      const challengeKey =
        hashChallengeKey(
          `forgot-password:${user._id.toString()}`,
        );

      try {
        await createOtpChallenge({
          phone:
            normalizedPhone,

          purpose:
            "forgot-password",

          challengeKey,

          userId:
            user._id,
        });
      } catch (error) {
        if (
          error?.code ===
          "OTP_RESEND_COOLDOWN"
        ) {
          /*
           * Keep response generic.
           * Do not reveal whether account exists.
           */
          return genericResponse();
        }

        throw error;
      }

      return genericResponse();
    } catch (error) {
      console.error(
        "FORGOT PASSWORD ERROR:",
        error,
      );

      /*
       * Do not reveal internal details
       * through this endpoint.
       */

      return res.status(200).json({
        success: true,
        message:
          "If an account exists with these details, a password reset OTP has been sent to the registered WhatsApp number.",
      });
    }
  };

/* =========================================================
   FORGOT PASSWORD - VERIFY OTP

   POST /api/auth/forgot-password/verify-otp

   Body:
   {
     identifier,
     otp
   }

   Returns a short-lived password reset token.
========================================================= */

export const verifyForgotPasswordOtp =
  async (
    req,
    res,
  ) => {
    try {
      const identifier =
        String(
          req.body?.identifier ??
            req.body?.email ??
            req.body?.phone ??
            "",
        ).trim();

      const otp =
        String(
          req.body?.otp ??
            "",
        )
          .replace(
            /\D/g,
            "",
          )
          .trim();

      if (!identifier) {
        return res.status(400).json({
          success: false,
          message:
            "Email or mobile number is required",
        });
      }

      if (
        otp.length !==
        OTP_LENGTH
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid 6-digit OTP",
        });
      }

      let normalizedEmail =
        "";

      let normalizedPhone =
        "";

      if (
        identifier.includes("@")
      ) {
        normalizedEmail =
          identifier
            .toLowerCase();

        if (
          !isValidEmail(
            normalizedEmail,
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please enter a valid email address",
          });
        }
      } else {
        normalizedPhone =
          normalizePhone(
            identifier,
          );

        if (
          !isValidPhone(
            normalizedPhone,
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please enter a valid 10-digit mobile number",
          });
        }
      }

      const query =
        normalizedEmail
          ? {
              email:
                normalizedEmail,

              role:
                CUSTOMER_ROLE,
            }
          : {
              phone:
                normalizedPhone,

              role:
                CUSTOMER_ROLE,
            };

      const user =
        await User.findOne(
          query,
        );

      if (!user) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid or expired OTP",
        });
      }

      if (
        user.isBlocked === true ||
        user.isActive === false
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid or expired OTP",
        });
      }

      if (
        SOCIAL_PROVIDERS.includes(
          user.authProvider,
        ) &&
        !user.password
      ) {
        return res.status(400).json({
          success: false,
          message:
            "This account uses social login. Please continue with Google or Facebook.",
        });
      }

      const registeredPhone =
        normalizePhone(
          user.phone,
        );

      if (
        !isValidPhone(
          registeredPhone,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid or expired OTP",
        });
      }

      const challengeKey =
        hashChallengeKey(
          `forgot-password:${user._id.toString()}`,
        );

      const verification =
        await verifyOtpChallenge({
          phone:
            registeredPhone,

          purpose:
            "forgot-password",

          challengeKey,

          otp,
        });

      if (
        !verification.success
      ) {
        const status =
          verification.code ===
          "OTP_MAX_ATTEMPTS"
            ? 429
            : 400;

        return res.status(
          status,
        ).json({
          success: false,

          code:
            verification.code,

          message:
            verification.message,
        });
      }

      const resetToken =
        createPasswordResetToken({
          userId:
            user._id,

          challengeId:
            verification.record
              ._id,
        });

      return res.status(200).json({
        success: true,

        message:
          "OTP verified successfully",

        resetToken,

        expiresIn:
          10 * 60,
      });
    } catch (error) {
      console.error(
        "VERIFY FORGOT PASSWORD OTP ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to verify OTP",
      });
    }
  };

/* =========================================================
   RESET PASSWORD

   POST /api/auth/reset-password

   Body:
   {
     resetToken,
     newPassword,
     confirmPassword
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
        newPassword,
        confirmPassword,
      } =
        req.body || {};

      if (!resetToken) {
        return res.status(400).json({
          success: false,
          message:
            "Password reset token is required",
        });
      }

      if (!newPassword) {
        return res.status(400).json({
          success: false,
          message:
            "New password is required",
        });
      }

      if (
        String(
          newPassword,
        ).length < 4
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must contain at least 4 characters",
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
            "Passwords do not match",
        });
      }

      let decoded;

      try {
        decoded =
          verifyPasswordResetToken(
            resetToken,
          );
      } catch (error) {
        return res.status(401).json({
          success: false,
          message:
            "Password reset session has expired. Please request a new OTP.",
        });
      }

      const user =
        await User.findById(
          decoded.userId,
        ).select(
          "+password",
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User account not found",
        });
      }

      if (
        user.isBlocked === true ||
        user.isActive === false
      ) {
        return res.status(403).json({
          success: false,
          message:
            "Account is not available",
        });
      }

      if (!user.password) {
        return res.status(400).json({
          success: false,
          message:
            "This account uses social login and does not have a password to reset.",
        });
      }

      /*
       * Verify that the OTP referenced by the
       * reset token was genuinely verified.
       */

      const collection =
        await getOtpCollection();

      const challenge =
        await collection.findOne({
          _id:
            new mongoose.Types.ObjectId(
              decoded.challengeId,
            ),

          userId:
            user._id,

          purpose:
            "forgot-password",

          verifiedAt: {
            $exists: true,
            $ne: null,
          },
        });

      if (!challenge) {
        return res.status(401).json({
          success: false,
          message:
            "Password reset verification is invalid or expired.",
        });
      }

      const samePassword =
        await bcrypt.compare(
          newPassword,
          user.password,
        );

      if (samePassword) {
        return res.status(400).json({
          success: false,
          message:
            "New password must be different from your current password",
        });
      }

      user.password =
        await bcrypt.hash(
          newPassword,
          12,
        );

      user.authProvider =
        "local";

      user.googleId =
        null;

      user.facebookId =
        null;

      await user.save();

      /*
       * Consume the reset challenge so that the
       * same OTP cannot be reused.
       */

      await collection.updateOne(
        {
          _id:
            challenge._id,
        },
        {
          $set: {
            resetUsedAt:
              new Date(),
          },
        },
      );

      return res.status(200).json({
        success: true,
        message:
          "Password reset successfully. You can now login with your new password.",
      });
    } catch (error) {
      console.error(
        "RESET PASSWORD ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to reset password",
      });
    }
  };
  /* =========================================================
   LOGOUT

   POST /api/auth/logout
========================================================= */

export const logoutUser =
  async (
    _req,
    res,
  ) => {
    const isProduction =
      process.env.NODE_ENV ===
      "production";

    res.clearCookie(
      "token",
      {
        httpOnly: true,

        secure:
          isProduction,

        sameSite:
          isProduction
            ? "none"
            : "lax",
      },
    );

    return res.status(200).json({
      success: true,

      message:
        "Logout successful",
    });
  };

/* =========================================================
   CURRENT USER / STAFF

   GET /api/auth/me
   GET /api/auth/staff/me
========================================================= */

export const getCurrentUser =
  async (
    req,
    res,
  ) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,

        message:
          "Not authenticated",
      });
    }

    return res.status(200).json({
      success: true,

      user:
        getUserResponse(
          req.user,
        ),
    });
  };

/* =========================================================
   UPDATE CUSTOMER PROFILE

   PUT /api/auth/profile
========================================================= */

export const updateProfile =
  async (
    req,
    res,
  ) => {
    try {
      const {
        name,
        phone,
      } =
        req.body;

      const user =
        await User.findById(
          req.user._id,
        );

      if (!user) {
        return res.status(404).json({
          success: false,

          message:
            "User not found",
        });
      }

      /*
       * NAME
       */

      if (
        name !== undefined
      ) {
        const normalizedName =
          normalizeName(name);

        if (
          normalizedName.length <
          2
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Name must contain at least 2 characters",
          });
        }

        if (
          normalizedName.length >
          80
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Name cannot exceed 80 characters",
          });
        }

        user.name =
          normalizedName;
      }

      /*
       * PHONE
       */

      if (
        phone !== undefined
      ) {
        const normalizedPhone =
          normalizePhone(
            phone,
          );

        if (
          !isValidPhone(
            normalizedPhone,
          )
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Please enter a valid 10-digit mobile number",
          });
        }

        const phoneExists =
          await User.findOne({
            phone:
              normalizedPhone,

            _id: {
              $ne:
                user._id,
            },
          });

        if (phoneExists) {
          return res.status(409).json({
            success: false,

            message:
              "Phone number is already registered",
          });
        }

        /*
         * If phone changes, phone must be
         * verified again.
         */

        if (
          user.phone !==
          normalizedPhone
        ) {
          user.isPhoneVerified =
            false;
        }

        user.phone =
          normalizedPhone;
      }

      /*
       * PROFILE IMAGE
       */

      if (req.file) {
        user.profileImage =
          `/uploads/users/${req.file.filename}`;
      }

      await user.save();

      return res.status(200).json({
        success: true,

        message:
          "Profile updated successfully",

        user:
          getUserResponse(user),
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
            "Phone number is already registered",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update profile",
      });
    }
  };

/* =========================================================
   UPDATE STAFF PROFILE

   Staff can update:
   - Name
   - Email

   Staff cannot update:
   - Role
   - Active status
   - Block status
   - Password

   PUT /api/auth/staff/profile
========================================================= */

export const updateStaffProfile =
  async (
    req,
    res,
  ) => {
    try {
      const {
        name,
        email,
      } =
        req.body || {};

      const user =
        await User.findById(
          req.user._id,
        );

      if (!user) {
        return res.status(404).json({
          success: false,

          message:
            "Staff account not found",
        });
      }

      if (
        !STAFF_ROLES.includes(
          user.role,
        )
      ) {
        return res.status(403).json({
          success: false,

          message:
            "Staff account access only",
        });
      }

      /*
       * NAME
       */

      if (
        name !== undefined
      ) {
        const normalizedName =
          normalizeName(name);

        if (
          normalizedName.length <
          2
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Name must contain at least 2 characters",
          });
        }

        if (
          normalizedName.length >
          80
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Name cannot exceed 80 characters",
          });
        }

        user.name =
          normalizedName;
      }

      /*
       * EMAIL
       */

      if (
        email !== undefined
      ) {
        const normalizedEmail =
          String(
            email,
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
              "Please enter a valid email address",
          });
        }

        const emailExists =
          await User.findOne({
            email:
              normalizedEmail,

            _id: {
              $ne:
                user._id,
            },
          });

        if (emailExists) {
          return res.status(409).json({
            success: false,

            message:
              "Email address is already registered",
          });
        }

        user.email =
          normalizedEmail;
      }

      await user.save();

      return res.status(200).json({
        success: true,

        message:
          "Staff profile updated successfully",

        user:
          getUserResponse(user),
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
            "Email address is already registered",
        });
      }

      return res.status(500).json({
        success: false,

        message:
          "Unable to update staff profile",
      });
    }
  };

/* =========================================================
   CHANGE PASSWORD

   PUT /api/auth/change-password

   Staff endpoint can also use this controller:

   PUT /api/auth/staff/change-password
========================================================= */

export const changePassword =
  async (
    req,
    res,
  ) => {
    try {
      const {
        currentPassword,
        newPassword,
        confirmPassword,
      } =
        req.body;

      /*
       * REQUIRED
       */

      if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
      ) {
        return res.status(400).json({
          success: false,

          message:
            "All password fields are required",
        });
      }

      /*
       * PASSWORD LENGTH
       */

      if (
        String(
          newPassword,
        ).length < 4
      ) {
        return res.status(400).json({
          success: false,

          message:
            "New password must contain at least 4 characters",
        });
      }

      /*
       * PASSWORD CONFIRMATION
       */

      if (
        newPassword !==
        confirmPassword
      ) {
        return res.status(400).json({
          success: false,

          message:
            "New passwords do not match",
        });
      }

      /*
       * USER
       */

      const user =
        await User.findById(
          req.user._id,
        ).select(
          "+password",
        );

      if (!user) {
        return res.status(404).json({
          success: false,

          message:
            "User not found",
        });
      }

      /*
       * ACCOUNT STATUS
       */

      if (
        user.isBlocked ===
        true
      ) {
        return res.status(403).json({
          success: false,

          message:
            "Your account has been blocked",
        });
      }

      if (
        user.isActive ===
        false
      ) {
        return res.status(403).json({
          success: false,

          message:
            "Your account is inactive",
        });
      }

      /*
       * CURRENT PASSWORD
       */

      if (!user.password) {
        return res.status(401).json({
          success: false,

          message:
            "Current password is incorrect",
        });
      }

      const isCurrentPasswordValid =
        await bcrypt.compare(
          currentPassword,
          user.password,
        );

      if (
        !isCurrentPasswordValid
      ) {
        return res.status(401).json({
          success: false,

          message:
            "Current password is incorrect",
        });
      }

      /*
       * PREVENT SAME PASSWORD
       */

      const isSamePassword =
        await bcrypt.compare(
          newPassword,
          user.password,
        );

      if (
        isSamePassword
      ) {
        return res.status(400).json({
          success: false,

          message:
            "New password must be different from your current password",
        });
      }

      /*
       * HASH NEW PASSWORD
       */

      user.password =
        await bcrypt.hash(
          newPassword,
          12,
        );

      /*
       * SAVE
       */

      await user.save();

      /*
       * RESPONSE
       */

      return res.status(200).json({
        success: true,

        message:
          "Password changed successfully",
      });
    } catch (error) {
      console.error(
        "CHANGE PASSWORD ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Unable to change password",
      });
    }
  };

/* =========================================================
   EXPORT SUMMARY

   Controllers exported from this file:

   adminLogin
   registerUser
   userLogin
   googleLogin
   facebookLogin
   sendSocialOtp
   completeSocialRegistration
   forgotPassword
   verifyForgotPasswordOtp
   resetPassword
   logoutUser
   getCurrentUser
   updateProfile
   updateStaffProfile
   changePassword
========================================================= */