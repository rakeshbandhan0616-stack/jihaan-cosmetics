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

       Customer:
       - Phone required

       Staff:
       - Phone optional

       Customer can edit their phone number from profile.
    ========================================================= */

    phone: {
      type: String,

      required: function () {
        return this.role === "user";
      },

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

       local
       google
       facebook

       Existing local users can also have a Google/Facebook
       account linked to them.
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
      default: null,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },

    /* =========================================================
       FACEBOOK ACCOUNT
    ========================================================= */

    facebookId: {
      type: String,
      default: null,
      unique: true,
      sparse: true,
      trim: true,
      index: true,
    },

    /* =========================================================
       PASSWORD

       IMPORTANT:

       select:false means normal queries do not return the
       password.

       This is intentional for security.

       Do NOT check `this.password` inside the pre-validation
       middleware because existing users loaded using
       User.findById() do not contain the password field.
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

       Customer can update this field from profile.
    ========================================================= */

    profileImage: {
      type: String,
      default: "",
      trim: true,
    },

    /* =========================================================
       USER ROLE

       IMPORTANT:
       Role cannot be changed through customer profile update.
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

       These fields are controlled by the backend/admin.
       Customer profile update does not modify them.
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

       Controlled by authentication/verification flow.
    ========================================================= */

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    /* =========================================================
       PHONE VERIFICATION

       If a customer changes their phone number, the controller
       should set this to false and require verification again.
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

/**
 * Check whether this user is a customer.
 */
userSchema.methods.isCustomer = function () {
  return this.role === "user";
};

/**
 * Check whether this user is a staff member.
 */
userSchema.methods.isStaff = function () {
  return [
    "superadmin",
    "admin",
    "accounts",
    "logistics",
  ].includes(this.role);
};

/**
 * Check whether this user has administrative access.
 */
userSchema.methods.isAdmin = function () {
  return ["superadmin", "admin"].includes(this.role);
};

/**
 * Check whether this user is a superadmin.
 */
userSchema.methods.isSuperAdmin = function () {
  return this.role === "superadmin";
};

/**
 * Check whether this user is an Accounts employee.
 */
userSchema.methods.isAccounts = function () {
  return this.role === "accounts";
};

/**
 * Check whether this user is a Logistics employee.
 */
userSchema.methods.isLogistics = function () {
  return this.role === "logistics";
};

/* =========================================================
   AUTHENTICATION HELPERS
========================================================= */

/**
 * Check whether this user uses local authentication.
 */
userSchema.methods.isLocalAuth = function () {
  return this.authProvider === "local";
};

/**
 * Check whether this user uses Google authentication.
 */
userSchema.methods.isGoogleAuth = function () {
  return this.authProvider === "google";
};

/**
 * Check whether this user uses Facebook authentication.
 */
userSchema.methods.isFacebookAuth = function () {
  return this.authProvider === "facebook";
};

/**
 * Check whether this user uses social authentication.
 */
userSchema.methods.isSocialAuth = function () {
  return ["google", "facebook"].includes(this.authProvider);
};

/**
 * Check whether the phone is verified.
 */
userSchema.methods.isPhoneVerifiedAccount = function () {
  return this.isPhoneVerified === true;
};

/**
 * Check whether the account has completed the required
 * verification for its primary authentication provider.
 */
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

/*
 * IMPORTANT
 *
 * Do NOT use:
 *
 * userSchema.pre("validate", function (next) {})
 *
 * with next() here.
 *
 * Your previous Render error was:
 *
 * TypeError: next is not a function
 *
 * This middleware intentionally uses the synchronous style.
 *
 * Also:
 *
 * DO NOT validate this.password here.
 *
 * password has select:false, therefore an existing user loaded
 * using User.findById() will normally not contain password.
 *
 * Profile update:
 *
 * name
 * phone
 * profileImage
 *
 * must therefore be allowed to save without loading password.
 */

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
   * No password validation here.
   *
   * The schema-level `required` validator handles password
   * requirements during document creation/appropriate
   * validation.
   */
});

/* =========================================================
   INDEXES
========================================================= */

/*
 * Google ID
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