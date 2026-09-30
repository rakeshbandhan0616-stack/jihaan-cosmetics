import mongoose from "mongoose";

const USER_ROLES = [
  "superadmin",
  "admin",
  "accounts",
  "logistics",
  "user",
];

const AUTH_PROVIDERS = [
  "local",
  "google",
  "facebook",
];

/* =========================================================
   USER SCHEMA
========================================================= */

const userSchema = new mongoose.Schema(
  {
    /* =========================================================
       BASIC INFORMATION
    ========================================================= */

    name: {
      type: String,

      required: [
        true,
        "Name is required",
      ],

      trim: true,

      minlength: [
        2,
        "Name must contain at least 2 characters",
      ],

      maxlength: [
        80,
        "Name cannot exceed 80 characters",
      ],
    },

    email: {
      type: String,

      required: [
        true,
        "Email is required",
      ],

      unique: true,

      lowercase: true,

      trim: true,

      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/,

        "Please enter a valid email address",
      ],
    },

    /* =========================================================
       PHONE
       
       IMPORTANT:
       Phone is OPTIONAL now.

       Local registration:
       - Phone can be provided.
       - Email OTP verifies registration.

       Google:
       - Phone is NOT required.
       - No WhatsApp OTP.

       Facebook:
       - Phone is NOT required.
       - No WhatsApp OTP.
    ========================================================= */

    phone: {
      type: String,

      required: false,

      default: null,

      unique: true,

      sparse: true,

      trim: true,

      match: [
        /^[6-9][0-9]{9}$/,

        "Phone number must contain exactly 10 digits",
      ],
    },

    /* =========================================================
       AUTHENTICATION PROVIDER
    ========================================================= */

    authProvider: {
      type: String,

      enum: {
        values: AUTH_PROVIDERS,

        message:
          "Invalid authentication provider. Allowed providers: local, google, facebook",
      },

      default: "local",

      required: true,

      lowercase: true,

      trim: true,
    },

    /* =========================================================
       GOOGLE ACCOUNT
    ========================================================= */

    googleId: {
      type: String,

      /*
       * Do not use unique:true here.
       *
       * The unique sparse index is defined below.
       */

      default: undefined,

      trim: true,
    },

    /* =========================================================
       FACEBOOK ACCOUNT
    ========================================================= */

    facebookId: {
      type: String,

      /*
       * Do not use unique:true here.
       *
       * The unique sparse index is defined below.
       */

      default: undefined,

      trim: true,
    },

    /* =========================================================
       PASSWORD
    ========================================================= */

    password: {
      type: String,

      /*
       * Password is required only for local accounts.
       *
       * Google/Facebook accounts can exist without a password.
       */

      required: function () {
        return this.authProvider === "local";
      },

      minlength: [
        4,
        "Password must contain at least 4 characters",
      ],

      select: false,
    },

    /* =========================================================
       PROFILE IMAGE
    ========================================================= */

    profileImage: {
      type: String,

      default: "",

      trim: true,
    },

    /* =========================================================
       USER ROLE
    ========================================================= */

    role: {
      type: String,

      enum: {
        values: USER_ROLES,

        message:
          "Invalid user role. Allowed roles: superadmin, admin, accounts, logistics, user",
      },

      default: "user",

      required: true,

      lowercase: true,

      trim: true,
    },

    /* =========================================================
       ACCOUNT STATUS
    ========================================================= */

    isActive: {
      type: Boolean,

      default: true,
    },

    isBlocked: {
      type: Boolean,

      default: false,
    },

    /* =========================================================
       EMAIL VERIFICATION
       
       Local registration:
       false initially
       true after email OTP verification

       Google:
       true because Google provides verified email

       Facebook:
       true when Facebook account email is received
    ========================================================= */

    isEmailVerified: {
      type: Boolean,

      default: false,
    },

    /* =========================================================
       PHONE VERIFICATION
       
       Kept for future phone verification if needed.
       
       It is NOT required for:
       - Google login
       - Facebook login
       - Email OTP registration
    ========================================================= */

    isPhoneVerified: {
      type: Boolean,

      default: false,
    },

    /* =========================================================
       LOGIN INFORMATION
    ========================================================= */

    lastLoginAt: {
      type: Date,

      default: null,
    },
  },

  {
    timestamps: true,
  },
);

/* =========================================================
   ROLE HELPERS
========================================================= */

userSchema.methods.isCustomer = function () {
  return this.role === "user";
};

userSchema.methods.isStaff = function () {
  return [
    "superadmin",
    "admin",
    "accounts",
    "logistics",
  ].includes(this.role);
};

userSchema.methods.isAdmin = function () {
  return [
    "superadmin",
    "admin",
  ].includes(this.role);
};

userSchema.methods.isSuperAdmin = function () {
  return this.role === "superadmin";
};

userSchema.methods.isAccounts = function () {
  return this.role === "accounts";
};

userSchema.methods.isLogistics = function () {
  return this.role === "logistics";
};

/* =========================================================
   AUTHENTICATION HELPERS
========================================================= */

userSchema.methods.isLocalAuth = function () {
  return this.authProvider === "local";
};

userSchema.methods.isGoogleAuth = function () {
  return this.authProvider === "google";
};

userSchema.methods.isFacebookAuth = function () {
  return this.authProvider === "facebook";
};

userSchema.methods.isSocialAuth = function () {
  return [
    "google",
    "facebook",
  ].includes(
    this.authProvider,
  );
};

/* =========================================================
   PHONE VERIFICATION HELPER
========================================================= */

userSchema.methods.isPhoneVerifiedAccount =
  function () {
    return this.isPhoneVerified === true;
  };

/* =========================================================
   ACCOUNT VERIFICATION HELPER
       
   IMPORTANT:
       
   The new authentication flow does NOT require
   WhatsApp/phone OTP for Google or Facebook.

   Verification is based on email verification.
========================================================= */

userSchema.methods.isVerifiedAccount =
  function () {
    /*
     * Google account
     *
     * Google provides a verified email.
     * Phone verification is NOT required.
     */

    if (
      this.authProvider ===
      "google"
    ) {
      return (
        this.isEmailVerified ===
        true
      );
    }

    /*
     * Facebook account
     *
     * Phone verification is NOT required.
     */

    if (
      this.authProvider ===
      "facebook"
    ) {
      return (
        this.isEmailVerified ===
        true
      );
    }

    /*
     * Local account
     *
     * Registration is completed only after
     * email OTP verification.
     */

    return (
      this.isEmailVerified ===
      true
    );
  };

/* =========================================================
   VALIDATION
========================================================= */

userSchema.pre(
  "validate",
  function () {
    /* ---------------------------------------------------------
       GOOGLE ACCOUNT
    --------------------------------------------------------- */

    if (
      this.authProvider ===
        "google" &&
      !this.googleId
    ) {
      throw new Error(
        "Google ID is required for Google authentication",
      );
    }

    /* ---------------------------------------------------------
       FACEBOOK ACCOUNT
    --------------------------------------------------------- */

    if (
      this.authProvider ===
        "facebook" &&
      !this.facebookId
    ) {
      throw new Error(
        "Facebook ID is required for Facebook authentication",
      );
    }

    /*
     * Phone is intentionally NOT validated as required here.
     *
     * Google/Facebook users can have:
     *
     * phone: null
     *
     * and can still login normally.
     *
     * Local users also complete registration using
     * email OTP instead of WhatsApp OTP.
     */
  },
);

/* =========================================================
   INDEXES
========================================================= */

/*
 * EMAIL
 *
 * `unique:true` on the email field creates the
 * unique email index.
 */

/*
 * PHONE
 *
 * `unique:true + sparse:true`
 *
 * allows multiple documents with no phone value
 * while preventing duplicate actual phone numbers.
 */

/* =========================================================
   GOOGLE ID INDEX
========================================================= */

userSchema.index(
  {
    googleId: 1,
  },
  {
    unique: true,

    sparse: true,

    name:
      "unique_google_id",
  },
);

/* =========================================================
   FACEBOOK ID INDEX
========================================================= */

userSchema.index(
  {
    facebookId: 1,
  },
  {
    unique: true,

    sparse: true,

    name:
      "unique_facebook_id",
  },
);

/* =========================================================
   MODEL
========================================================= */

const User =
  mongoose.models.User ||
  mongoose.model(
    "User",
    userSchema,
  );

export default User;