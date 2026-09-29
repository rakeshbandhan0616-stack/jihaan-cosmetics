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

       Customer accounts require a phone number.

       Staff accounts can have a phone number optionally.

       Social registration:
       Google/Facebook → phone → WhatsApp OTP → account
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

       local    → Email/phone + password
       google   → Google authentication
       facebook → Facebook authentication

       IMPORTANT:

       A local account can also have googleId/facebookId linked
       to the same account.

       Example:

       authProvider: "local"
       googleId: "123456789"
       password: "hashed-password"

       This allows an existing local user to later sign in
       using Google without changing their original password
       authentication provider.
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

       Google's stable user ID.

       Never store:
       - Google client secret
       - OAuth access token
       - OAuth refresh token

       This field is only Google's user identifier.
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

       Facebook's stable user ID.

       Never store the Facebook app secret here.
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

       Google/Facebook-only users:
       - Password not required

       select:false prevents the password from being returned
       by normal queries.

       Login explicitly uses:
       .select("+password")
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

       For new social registrations:

       1. Google/Facebook login
       2. Collect phone
       3. Send WhatsApp OTP
       4. Verify OTP
       5. Create customer account
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
 * Check whether this user uses a social provider.
 */
userSchema.methods.isSocialAuth = function () {
  return ["google", "facebook"].includes(this.authProvider);
};

/**
 * Check whether the phone has been verified.
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

/**
 * Validate authentication-provider-specific fields.
 *
 * IMPORTANT:
 *
 * This is intentionally written WITHOUT `next`.
 *
 * This prevents:
 *
 * TypeError: next is not a function
 *
 * which was occurring during user.save() on Render.
 *
 * Existing local accounts may have Google/Facebook IDs linked
 * to them, so we DO NOT remove googleId/facebookId merely
 * because authProvider is "local".
 */
userSchema.pre("validate", function () {
  /* ---------------------------------------------------------
     GOOGLE AUTHENTICATION
  --------------------------------------------------------- */

  if (this.authProvider === "google" && !this.googleId) {
    throw new Error(
      "Google ID is required for Google authentication",
    );
  }

  /* ---------------------------------------------------------
     FACEBOOK AUTHENTICATION
  --------------------------------------------------------- */

  if (this.authProvider === "facebook" && !this.facebookId) {
    throw new Error(
      "Facebook ID is required for Facebook authentication",
    );
  }

  /* ---------------------------------------------------------
     LOCAL AUTHENTICATION
     
     A local account must have a password.

     Do NOT clear googleId/facebookId here.

     An existing local account can have:
     
     authProvider = "local"
     googleId = "..."
     facebookId = "..."
     
     This allows the user to use multiple login methods.
  --------------------------------------------------------- */

  if (this.authProvider === "local" && !this.password) {
    throw new Error(
      "Password is required for local authentication",
    );
  }
});

/* =========================================================
   INDEXES
========================================================= */

/**
 * Google ID
 *
 * Allows:
 *
 * User.findOne({ googleId })
 *
 * and prevents two accounts from being linked to the same
 * Google account.
 */
userSchema.index(
  { googleId: 1 },
  {
    unique: true,
    sparse: true,
    name: "unique_google_id",
  },
);

/**
 * Facebook ID
 *
 * Allows:
 *
 * User.findOne({ facebookId })
 *
 * and prevents duplicate Facebook account linking.
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