import mongoose from "mongoose";

const USER_ROLES = [
  "superadmin",
  "admin",
  "accounts",
  "logistics",
  "user",
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
       PASSWORD
    ========================================================= */

    password: {
      type: String,
      required: [true, "Password is required"],
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
    ========================================================= */

    isEmailVerified: {
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
   INDEXES

   Do not manually add email/phone indexes here.

   unique: true and sparse: true above already create
   the required indexes.
========================================================= */

const User =
  mongoose.models.User ||
  mongoose.model("User", userSchema);

export default User;