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

const userSchema = new mongoose.Schema(
  {
    /* =========================================================
       BASIC INFORMATION
    ========================================================= */

    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must contain at least 2 characters"],
      maxlength: [80, "Name cannot exceed 80 characters"],
    },

    email: {
      type: String,
      required: [true, "Email is required"],
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
    ========================================================= */

    phone: {
      type: String,

      required: function () {
        return this.role === "user";
      },

      /*
       * sparse:true is important.
       *
       * Staff accounts do not need a phone number, so multiple
       * staff documents can have no phone value.
       */
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
       * IMPORTANT:
       *
       * Do NOT use unique:true here.
       * The unique sparse index is defined below.
       *
       * This prevents multiple index definitions from being
       * generated for googleId.
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
       * Same approach as googleId.
       */
      default: undefined,

      trim: true,
    },

    /* =========================================================
       PASSWORD
    ========================================================= */

    password: {
      type: String,

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
    ========================================================= */

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    /* =========================================================
       PHONE VERIFICATION
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
  return ["superadmin", "admin"].includes(this.role);
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
  return ["google", "facebook"].includes(
    this.authProvider,
  );
};

userSchema.methods.isPhoneVerifiedAccount = function () {
  return this.isPhoneVerified === true;
};

userSchema.methods.isVerifiedAccount = function () {
  if (this.authProvider === "google") {
    return (
      this.isEmailVerified === true &&
      this.isPhoneVerified === true
    );
  }

  if (this.authProvider === "facebook") {
    return this.isPhoneVerified === true;
  }

  return this.isEmailVerified === true;
};

/* =========================================================
   VALIDATION
========================================================= */

userSchema.pre("validate", function () {
  /* ---------------------------------------------------------
     GOOGLE ACCOUNT
  --------------------------------------------------------- */

  if (
    this.authProvider === "google" &&
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
    this.authProvider === "facebook" &&
    !this.facebookId
  ) {
    throw new Error(
      "Facebook ID is required for Facebook authentication",
    );
  }

  /*
   * Password validation is intentionally not performed here.
   *
   * password has select:false.
   *
   * Existing users loaded without password should still be
   * allowed to update profile information.
   */
});

/* =========================================================
   INDEXES
========================================================= */

/*
 * Email
 *
 * The `unique:true` declaration on the email field creates
 * the unique email index.
 */

/*
 * Phone
 *
 * The `unique:true + sparse:true` declaration on the phone
 * field creates the unique sparse phone index.
 */

/*
 * Google ID
 *
 * IMPORTANT:
 *
 * This is the only Google ID index definition.
 *
 * sparse:true means documents without googleId do not
 * conflict with each other.
 */
userSchema.index(
  { googleId: 1 },
  {
    unique: true,
    sparse: true,
    name: "unique_google_id",
  },
);

/*
 * Facebook ID
 *
 * Same approach as Google ID.
 */
userSchema.index(
  { facebookId: 1 },
  {
    unique: true,
    sparse: true,
    name: "unique_facebook_id",
  },
);

/* =========================================================
   MODEL
========================================================= */

const User =
  mongoose.models.User ||
  mongoose.model("User", userSchema);

export default User;