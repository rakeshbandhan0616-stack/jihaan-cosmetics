import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
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

   It is used only between:
   Social login
       ↓
   Mobile number
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

      if (!isPasswordValid) {
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

   Normal/local registration:

   name
   email
   phone
   password

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

   Local accounts:
   email/phone + password

   Social accounts cannot use this endpoint unless
   they have a local password.
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

      if (!isPasswordValid) {
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

   Expected body:

   {
     credential: "GOOGLE_ID_TOKEN"
   }

   New user:
   → returns requiresPhone: true
   → returns socialToken

   Existing user:
   → logs in directly
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

      /* -----------------------------------------------------
         FIND BY GOOGLE ID
      ----------------------------------------------------- */

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

      /* -----------------------------------------------------
         FIND BY EMAIL
      ----------------------------------------------------- */

      user =
        await User.findOne({
          email:
            googleEmail,
        });

      if (user) {
        /*
         * Do not silently attach a Google account to an
         * existing local/Facebook account.
         *
         * This prevents unintended account linking.
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

      /* -----------------------------------------------------
         NEW SOCIAL USER

         Do NOT create the account yet.

         First collect mobile number and verify OTP.
      ----------------------------------------------------- */

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

   Expected body:

   {
     accessToken: "FACEBOOK_ACCESS_TOKEN"
   }

   The backend verifies the Facebook token by calling
   Facebook Graph API.

   IMPORTANT:
   FACEBOOK_APP_SECRET must remain on backend.
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
        process.env.FACEBOOK_GRAPH_VERSION;

      if (!graphVersion) {
        return res.status(500).json({
          success: false,
          message:
            "FACEBOOK_GRAPH_VERSION is not configured",
        });
      }

      /* -----------------------------------------------------
         VERIFY ACCESS TOKEN

         app access token =
         APP_ID|APP_SECRET
      ----------------------------------------------------- */

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

      const debugData =
        await debugResponse.json();

      if (
        !debugResponse.ok ||
        !debugData?.data
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Unable to verify Facebook access token",
        });
      }

      const tokenData =
        debugData.data;

      if (
        tokenData.is_valid !==
        true
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid or expired Facebook access token",
        });
      }

      if (
        String(
          tokenData.app_id ||
            "",
        ) !==
        String(
          process.env
            .FACEBOOK_APP_ID,
        )
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Facebook token does not belong to this application",
        });
      }

      const facebookId =
        String(
          tokenData.user_id ||
            "",
        );

      if (!facebookId) {
        return res.status(401).json({
          success: false,
          message:
            "Facebook user ID was not provided",
        });
      }

      /* -----------------------------------------------------
         GET FACEBOOK PROFILE

         email + public_profile
      ----------------------------------------------------- */

      const profileUrl =
        `https://graph.facebook.com/${graphVersion}/${facebookId}` +
        `?fields=id,name,email,picture.type(large)` +
        `&access_token=${encodeURIComponent(
          accessToken,
        )}`;

      const profileResponse =
        await fetch(
          profileUrl,
        );

      const profileData =
        await profileResponse.json();

      if (
        !profileResponse.ok ||
        !profileData
      ) {
        return res.status(401).json({
          success: false,
          message:
            "Unable to retrieve Facebook profile",
        });
      }

      const facebookEmail =
        String(
          profileData.email ||
            "",
        )
          .trim()
          .toLowerCase();

      const facebookName =
        normalizeName(
          profileData.name ||
            "Facebook User",
        );

      const facebookImage =
        profileData?.picture
          ?.data?.url ||
        "";

      /*
       * The requested registration flow requires email
       * to come from Facebook.
       */

      if (!facebookEmail) {
        return res.status(400).json({
          success: false,

          requiresEmail:
            true,

          message:
            "Facebook did not provide an email address. Please allow email permission or provide your email address.",
        });
      }

      /* -----------------------------------------------------
         FIND BY FACEBOOK ID
      ----------------------------------------------------- */

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

        return completeLogin(
          user,
          res,
          "Facebook login successful",
        );
      }

      /* -----------------------------------------------------
         FIND BY EMAIL
      ----------------------------------------------------- */

      user =
        await User.findOne({
          email:
            facebookEmail,
        });

      if (user) {
        /*
         * Don't automatically link another provider to an
         * existing account.
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

      /* -----------------------------------------------------
         NEW FACEBOOK USER
      ----------------------------------------------------- */

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

      return res.status(500).json({
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

   IMPORTANT:

   This controller intentionally does NOT fake an OTP.

   You must connect your SMS/WhatsApp provider here.

   Recommended flow:

   social login
        ↓
   socialToken
        ↓
   phone
        ↓
   send OTP
        ↓
   store OTP/hash + expiry
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
      } catch (tokenError) {
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

      /*
       * OTP provider integration goes here.
       *
       * Do NOT accept the request as verified until the
       * actual provider confirms delivery/verification.
       */

      return res.status(501).json({
        success: false,

        code:
          "OTP_PROVIDER_NOT_CONFIGURED",

        message:
          "OTP service is not configured yet. Connect your SMS/WhatsApp OTP provider before enabling social registration.",
      });
    } catch (error) {
      console.error(
        "SEND SOCIAL OTP ERROR:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to send OTP",
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

   This function should only create the account after
   the OTP has been genuinely verified.

   Until an OTP provider is connected, it deliberately
   refuses to create an account.
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

      if (!otp) {
        return res.status(400).json({
          success: false,
          message:
            "OTP is required",
        });
      }

      let decoded;

      try {
        decoded =
          verifySocialPendingToken(
            socialToken,
          );
      } catch (tokenError) {
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

      /*
       * SECURITY:
       *
       * Never create an account merely because the frontend
       * sends "verified": true or any arbitrary OTP.
       *
       * Connect the actual OTP provider here.
       */

      return res.status(501).json({
        success: false,

        code:
          "OTP_PROVIDER_NOT_CONFIGURED",

        message:
          "OTP verification is not configured yet. Connect your SMS/WhatsApp OTP provider before completing registration.",
      });
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

      /* -----------------------------------------------------
         NAME
      ----------------------------------------------------- */

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

      /* -----------------------------------------------------
         PHONE
      ----------------------------------------------------- */

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
         * If phone is changed, require phone verification
         * again.
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

      /* -----------------------------------------------------
         PROFILE IMAGE
      ----------------------------------------------------- */

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

      /* -----------------------------------------------------
         NAME
      ----------------------------------------------------- */

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

      /* -----------------------------------------------------
         EMAIL
      ----------------------------------------------------- */

      if (
        email !== undefined
      ) {
        const normalizedEmail =
          String(
            email,
          )
            .trim()
            .toLowerCase();

        if (!normalizedEmail) {
          return res.status(400).json({
            success: false,
            message:
              "Email is required",
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

        const existingUser =
          await User.findOne({
            email:
              normalizedEmail,

            _id: {
              $ne:
                user._id,
            },
          });

        if (existingUser) {
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
          "Staff account updated successfully",

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

      if (
        error?.name ===
        "ValidationError"
      ) {
        const validationMessages =
          Object.values(
            error.errors || {},
          )
            .map(
              (item) =>
                item.message,
            )
            .filter(Boolean);

        return res.status(400).json({
          success: false,
          message:
            validationMessages.join(
              ", ",
            ) ||
            "Invalid staff account data",
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to update staff account",
      });
    }
  };

/* =========================================================
   CHANGE PASSWORD

   PUT /api/auth/change-password
   PUT /api/auth/staff/change-password

   Works for local-password accounts.

   Social-only accounts cannot use current-password
   authentication because they don't have a local password.
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

      if (
        !checkAccountStatus(
          user,
          res,
        )
      ) {
        return;
      }

      /*
       * Social accounts do not have a local password.
       */

      if (!user.password) {
        return res.status(400).json({
          success: false,

          code:
            "SOCIAL_ACCOUNT",

          message:
            "This account uses social login and does not have a current password. Please use the password setup/reset flow.",
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

      const isSamePassword =
        await bcrypt.compare(
          newPassword,
          user.password,
        );

      if (isSamePassword) {
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

      /*
       * Once a social user explicitly creates a local
       * password, they can use local authentication too.
       *
       * We intentionally do not change authProvider here.
       * The provider remains the original provider.
       */

      await user.save();

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