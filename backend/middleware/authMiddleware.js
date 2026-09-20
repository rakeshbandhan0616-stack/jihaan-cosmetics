import jwt from "jsonwebtoken";
import User from "../models/User.js";

/* =========================================================
   ROLE CONSTANTS
========================================================= */

export const USER_ROLES = {
  SUPERADMIN: "superadmin",
  ADMIN: "admin",
  ACCOUNTS: "accounts",
  LOGISTICS: "logistics",
  USER: "user",
};

/* =========================================================
   GET TOKEN FROM COOKIE OR AUTHORIZATION HEADER
========================================================= */

const getTokenFromRequest = (req) => {
  const cookies = req.cookies || {};

  // Support commonly used cookie names
  const cookieToken =
    cookies.token ||
    cookies.authToken ||
    cookies.accessToken ||
    cookies.jwt;

  if (cookieToken) {
    return cookieToken;
  }

  const authorizationHeader = req.headers.authorization;

  if (
    typeof authorizationHeader === "string" &&
    authorizationHeader.startsWith("Bearer ")
  ) {
    return authorizationHeader.substring(7).trim();
  }

  return null;
};

/* =========================================================
   NORMALIZE USER ROLE
========================================================= */

export const normalizeRole = (role) => {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
};

/* =========================================================
   GET USER ID FROM JWT PAYLOAD
========================================================= */

const getUserIdFromToken = (decoded) => {
  return (
    decoded?.id ||
    decoded?._id ||
    decoded?.userId ||
    decoded?.sub ||
    null
  );
};

/* =========================================================
   CHECK WHETHER USER HAS ONE OF THE PROVIDED ROLES
========================================================= */

const hasAllowedRole = (req, allowedRoles = []) => {
  if (!req.user) {
    return false;
  }

  const currentRole = normalizeRole(req.user.role);

  const normalizedAllowedRoles = allowedRoles.map((role) =>
    normalizeRole(role),
  );

  return normalizedAllowedRoles.includes(currentRole);
};

/* =========================================================
   GENERIC ROLE MIDDLEWARE
========================================================= */

/**
 * Usage:
 *
 * router.use(
 *   protect,
 *   allowRoles("superadmin", "admin")
 * );
 *
 * or:
 *
 * router.use(
 *   protect,
 *   allowRoles("accounts")
 * );
 */

export const allowRoles = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    if (allowedRoles.length === 0) {
      return res.status(403).json({
        success: false,
        message: "No roles have been configured for this route",
      });
    }

    const currentRole = normalizeRole(req.user.role);

    const normalizedAllowedRoles = allowedRoles.map((role) =>
      normalizeRole(role),
    );

    if (!normalizedAllowedRoles.includes(currentRole)) {
      return res.status(403).json({
        success: false,
        message: "You do not have permission to access this resource",
        role: req.user.role || null,
      });
    }

    if (req.user.isBlocked === true) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked",
      });
    }

    if (req.user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    next();
  };
};

/* =========================================================
   PROTECT AUTHENTICATED ROUTES
========================================================= */

export const protect = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing in the .env file");

      return res.status(500).json({
        success: false,
        message: "Server authentication configuration is missing",
      });
    }

    const token = getTokenFromRequest(req);

    if (!token) {
      console.warn("Authentication failed: token was not provided");

      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      console.error(
        "JWT verification error:",
        tokenError instanceof Error
          ? tokenError.message
          : tokenError,
      );

      return res.status(401).json({
        success: false,
        message: "Invalid or expired token",
      });
    }

    const userId = getUserIdFromToken(decoded);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    const user = await User.findById(userId).select("-password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "User account was not found",
      });
    }

    if (user.isBlocked === true) {
      return res.status(403).json({
        success: false,
        message: "Your account has been blocked",
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your account is inactive",
      });
    }

    // Always load the current role from the database.
    // This prevents an old JWT from retaining access after
    // an administrator changes the user's role.
    req.user = user;
    req.auth = decoded;

    next();
  } catch (error) {
    console.error("Authentication middleware error:", error);

    return res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

/* =========================================================
   ALLOW ONLY NORMAL CUSTOMERS
========================================================= */

export const userOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }

  const role = normalizeRole(req.user.role);

  if (role !== USER_ROLES.USER && role !== "customer") {
    return res.status(403).json({
      success: false,
      message: "User access only",
    });
  }

  next();
};

/* =========================================================
   ALLOW ADMIN + SUPERADMIN
========================================================= */

export const adminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }

  const role = normalizeRole(req.user.role);

  const allowedAdminRoles = [
    USER_ROLES.ADMIN,
    USER_ROLES.SUPERADMIN,
  ];

  if (!allowedAdminRoles.includes(role)) {
    console.error("Admin authorization failed:", {
      userId: req.user._id,
      email: req.user.email,
      role: req.user.role,
      isActive: req.user.isActive,
      isBlocked: req.user.isBlocked,
    });

    return res.status(403).json({
      success: false,
      message: "Admin access only",
      role: req.user.role || null,
    });
  }

  if (req.user.isBlocked === true) {
    return res.status(403).json({
      success: false,
      message: "Your admin account has been blocked",
    });
  }

  if (req.user.isActive === false) {
    return res.status(403).json({
      success: false,
      message: "Your admin account is inactive",
    });
  }

  next();
};

/* =========================================================
   ALLOW ONLY SUPERADMIN
========================================================= */

export const superAdminOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }

  const role = normalizeRole(req.user.role);

  if (role !== USER_ROLES.SUPERADMIN) {
    return res.status(403).json({
      success: false,
      message: "Super Admin access required",
    });
  }

  if (req.user.isBlocked === true) {
    return res.status(403).json({
      success: false,
      message: "Your super admin account has been blocked",
    });
  }

  if (req.user.isActive === false) {
    return res.status(403).json({
      success: false,
      message: "Your super admin account is inactive",
    });
  }

  next();
};

/* =========================================================
   ACCOUNTS ONLY
========================================================= */

/**
 * Accounts users are READ ONLY.
 *
 * They can access:
 * - Sales
 * - Inventory
 * - Orders
 * - Customer/order details
 * - Tracking information
 *
 * They cannot:
 * - Change order status
 * - Change payment status
 * - Change tracking
 * - Cancel orders
 * - Manage products
 * - Manage users
 */

export const accountsOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }

  const role = normalizeRole(req.user.role);

  if (role !== USER_ROLES.ACCOUNTS) {
    return res.status(403).json({
      success: false,
      message: "Accounts access only",
      role: req.user.role || null,
    });
  }

  if (req.user.isBlocked === true) {
    return res.status(403).json({
      success: false,
      message: "Your Accounts account has been blocked",
    });
  }

  if (req.user.isActive === false) {
    return res.status(403).json({
      success: false,
      message: "Your Accounts account is inactive",
    });
  }

  next();
};

/* =========================================================
   LOGISTICS ONLY
========================================================= */

/**
 * Logistics users can manage order logistics:
 *
 * - View orders
 * - Update order status
 * - Update tracking
 * - Update courier
 * - Update location
 * - Update expected delivery
 * - Cancel orders
 *
 * They cannot:
 * - Change payment status
 * - Manage users
 * - Manage products
 * - Manage categories
 * - Manage offers
 * - Access Accounts administration
 */

export const logisticsOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }

  const role = normalizeRole(req.user.role);

  if (role !== USER_ROLES.LOGISTICS) {
    return res.status(403).json({
      success: false,
      message: "Logistics access only",
      role: req.user.role || null,
    });
  }

  if (req.user.isBlocked === true) {
    return res.status(403).json({
      success: false,
      message: "Your Logistics account has been blocked",
    });
  }

  if (req.user.isActive === false) {
    return res.status(403).json({
      success: false,
      message: "Your Logistics account is inactive",
    });
  }

  next();
};

/* =========================================================
   ALL STAFF
========================================================= */

/**
 * Allows:
 * - superadmin
 * - admin
 * - accounts
 * - logistics
 *
 * Does NOT allow normal customers.
 */

export const staffOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }

  const allowedRoles = [
    USER_ROLES.SUPERADMIN,
    USER_ROLES.ADMIN,
    USER_ROLES.ACCOUNTS,
    USER_ROLES.LOGISTICS,
  ];

  const role = normalizeRole(req.user.role);

  if (!allowedRoles.includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Staff access only",
      role: req.user.role || null,
    });
  }

  if (req.user.isBlocked === true) {
    return res.status(403).json({
      success: false,
      message: "Your staff account has been blocked",
    });
  }

  if (req.user.isActive === false) {
    return res.status(403).json({
      success: false,
      message: "Your staff account is inactive",
    });
  }

  next();
};

/* =========================================================
   MANAGEMENT ONLY
========================================================= */

/**
 * Allows:
 * - superadmin
 * - admin
 *
 * Does NOT allow:
 * - accounts
 * - logistics
 * - user
 */

export const managementOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }

  const role = normalizeRole(req.user.role);

  if (
    role !== USER_ROLES.SUPERADMIN &&
    role !== USER_ROLES.ADMIN
  ) {
    return res.status(403).json({
      success: false,
      message: "Management access only",
      role: req.user.role || null,
    });
  }

  if (req.user.isBlocked === true) {
    return res.status(403).json({
      success: false,
      message: "Your management account has been blocked",
    });
  }

  if (req.user.isActive === false) {
    return res.status(403).json({
      success: false,
      message: "Your management account is inactive",
    });
  }

  next();
};

/* =========================================================
   ADMIN ORDER VIEW ACCESS
========================================================= */

/**
 * Allows staff members to VIEW administrative orders:
 *
 * - superadmin
 * - admin
 * - accounts
 * - logistics
 *
 * This middleware should only be used for GET routes.
 *
 * Do NOT use it for update/delete routes.
 */

export const orderViewOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }

  const allowedRoles = [
    USER_ROLES.SUPERADMIN,
    USER_ROLES.ADMIN,
    USER_ROLES.ACCOUNTS,
    USER_ROLES.LOGISTICS,
  ];

  const role = normalizeRole(req.user.role);

  if (!allowedRoles.includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Order viewing access denied",
      role: req.user.role || null,
    });
  }

  if (req.user.isBlocked === true) {
    return res.status(403).json({
      success: false,
      message: "Your account has been blocked",
    });
  }

  if (req.user.isActive === false) {
    return res.status(403).json({
      success: false,
      message: "Your account is inactive",
    });
  }

  next();
};

/* =========================================================
   ORDER MANAGEMENT ACCESS
========================================================= */

/**
 * Allows:
 * - superadmin
 * - admin
 * - logistics
 *
 * Used for:
 * - Order status updates
 * - Tracking updates
 * - Cancellation
 *
 * Accounts are intentionally excluded.
 */

export const orderManagementOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }

  const allowedRoles = [
    USER_ROLES.SUPERADMIN,
    USER_ROLES.ADMIN,
    USER_ROLES.LOGISTICS,
  ];

  const role = normalizeRole(req.user.role);

  if (!allowedRoles.includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Order management access denied",
      role: req.user.role || null,
    });
  }

  if (req.user.isBlocked === true) {
    return res.status(403).json({
      success: false,
      message: "Your account has been blocked",
    });
  }

  if (req.user.isActive === false) {
    return res.status(403).json({
      success: false,
      message: "Your account is inactive",
    });
  }

  next();
};

/* =========================================================
   PAYMENT MANAGEMENT ACCESS
========================================================= */

/**
 * Payment updates are restricted to:
 *
 * - superadmin
 * - admin
 *
 * Accounts cannot modify payment status.
 * Logistics cannot modify payment status.
 */

export const paymentManagementOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }

  const role = normalizeRole(req.user.role);

  if (
    role !== USER_ROLES.SUPERADMIN &&
    role !== USER_ROLES.ADMIN
  ) {
    return res.status(403).json({
      success: false,
      message: "Payment management access denied",
      role: req.user.role || null,
    });
  }

  if (req.user.isBlocked === true) {
    return res.status(403).json({
      success: false,
      message: "Your account has been blocked",
    });
  }

  if (req.user.isActive === false) {
    return res.status(403).json({
      success: false,
      message: "Your account is inactive",
    });
  }

  next();
};

/* =========================================================
   ALLOW AUTHENTICATED USERS
========================================================= */

export const authenticatedOnly = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: "Please login first",
    });
  }

  next();
};

/* =========================================================
   LEGACY SUPERADMIN MIDDLEWARE
========================================================= */

/**
 * Kept for compatibility with existing routes.
 *
 * This middleware performs authentication itself and allows
 * ONLY superadmin.
 *
 * New routes should preferably use:
 *
 * protect,
 * superAdminOnly
 *
 * instead.
 */

export const requireSuperAdmin = async (req, res, next) => {
  try {
    if (!process.env.JWT_SECRET) {
      return res.status(500).json({
        success: false,
        message: "Server authentication configuration is missing",
      });
    }

    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Authorization token is required",
      });
    }

    let decoded;

    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (tokenError) {
      console.error(
        "Superadmin JWT verification error:",
        tokenError instanceof Error
          ? tokenError.message
          : tokenError,
      );

      return res.status(401).json({
        success: false,
        message: "Invalid or expired admin token",
      });
    }

    const userId = getUserIdFromToken(decoded);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Invalid authentication token",
      });
    }

    const admin = await User.findById(userId).select("-password");

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: "Admin account was not found",
      });
    }

    if (admin.isBlocked === true) {
      return res.status(403).json({
        success: false,
        message: "Your admin account has been blocked",
      });
    }

    if (admin.isActive === false) {
      return res.status(403).json({
        success: false,
        message: "Your admin account is inactive",
      });
    }

    if (normalizeRole(admin.role) !== USER_ROLES.SUPERADMIN) {
      return res.status(403).json({
        success: false,
        message: "Super Admin access required",
      });
    }

    req.user = admin;
    req.admin = admin;
    req.auth = decoded;

    next();
  } catch (error) {
    console.error(
      "Superadmin authentication error:",
      error,
    );

    return res.status(401).json({
      success: false,
      message: "Invalid or expired admin token",
    });
  }
};

/* =========================================================
   EXPORT ROLE CHECK HELPER
========================================================= */

/**
 * Optional helper for controllers.
 *
 * Example:
 *
 * if (!hasAllowedRole(req, ["admin", "superadmin"])) {
 *   ...
 * }
 *
 * It is exported in case controllers need a lightweight
 * role check without another middleware.
 */

export { hasAllowedRole };