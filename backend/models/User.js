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

       Customer/user accounts require a phone number.

       Staff accounts can have a phone number optionally.

       For social registration:
       - phone is collected after Google/Facebook login
       - phone verification is completed through OTP
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

       local    → Normal email/phone + password registration
       google   → Google authentication
       facebook → Facebook authentication
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

       Stores Google's stable user identifier.

       This must NEVER contain the Google client secret.
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

       Stores Facebook's user identifier.

       This must NEVER contain the Facebook app secret.
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

       Local users:
       - Password required

       Google/Facebook users:
       - Password is not required

       This allows social accounts to be created without
       storing a local password.
    ========================================================= */

    password: {
      type: String,
      required: function () {
        return this.authProvider === "local";
      },
      minlength: [4, "Password must contain at least 4 characters"],
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

       Available roles:

       superadmin → Complete system access
       admin      → Administrative access
       accounts   → Read-only sales/inventory/order access
       logistics  → Order/tracking management
       user       → Normal customer account
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

       For Google/Facebook:
       Email can be considered verified only after the
       backend verifies the provider response/token.

       For local registration:
       This remains false until your email verification
       flow marks it true.
    ========================================================= */

    isEmailVerified: {
      type: Boolean,
      default: false,
    },

    /* =========================================================
       PHONE VERIFICATION

       Important for the new registration flow.

       New Google/Facebook registration:

       1. Login with Google/Facebook
       2. Get email/name from provider
       3. Ask for mobile number
       4. Send OTP
       5. Verify OTP
       6. Create/activate customer account
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
 * Check whether the account uses local authentication.
 */
userSchema.methods.isLocalAuth = function () {
  return this.authProvider === "local";
};

/**
 * Check whether the account uses Google authentication.
 */
userSchema.methods.isGoogleAuth = function () {
  return this.authProvider === "google";
};

/**
 * Check whether the account uses Facebook authentication.
 */
userSchema.methods.isFacebookAuth = function () {
  return this.authProvider === "facebook";
};

/**
 * Check whether the account uses social authentication.
 */
userSchema.methods.isSocialAuth = function () {
  return ["google", "facebook"].includes(this.authProvider);
};

/**
 * Check whether the customer has completed phone verification.
 */
userSchema.methods.isPhoneVerifiedAccount = function () {
  return this.isPhoneVerified === true;
};

/**
 * Check whether the account has completed the required
 * verification for its authentication provider.
 */
userSchema.methods.isVerifiedAccount = function () {
  if (this.authProvider === "google") {
    return this.isEmailVerified === true && this.isPhoneVerified === true;
  }

  if (this.authProvider === "facebook") {
    return this.isPhoneVerified === true;
  }

  return this.isEmailVerified === true;
};

/* =========================================================
   VALIDATION HELPERS
========================================================= */

/**
 * Make sure Google accounts have a Google ID.
 */
userSchema.pre("validate", function (next) {
  if (this.authProvider === "google" && !this.googleId) {
    return next(
      new Error("Google ID is required for Google authentication"),
    );
  }

  if (this.authProvider === "facebook" && !this.facebookId) {
    return next(
      new Error("Facebook ID is required for Facebook authentication"),
    );
  }

  if (this.authProvider === "local") {
    if (this.googleId) {
      this.googleId = null;
    }

    if (this.facebookId) {
      this.facebookId = null;
    }
  }

  next();
});

/* =========================================================
   INDEXES

   email:
   - unique

   phone:
   - unique + sparse
   - staff users may not have phone

   googleId:
   - unique + sparse
   - only Google accounts contain this field

   facebookId:
   - unique + sparse
   - only Facebook accounts contain this field
========================================================= */

userSchema.index(
  { googleId: 1 },
  {
    unique: true,
    sparse: true,
    name: "unique_google_id",
  },
);

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