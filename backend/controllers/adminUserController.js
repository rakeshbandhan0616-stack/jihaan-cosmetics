import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import User from "../models/User.js";

/* =========================================================
   CONSTANTS
========================================================= */

const ALLOWED_ROLES = [
  "user",
  "admin",
  "superadmin",
  "accounts",
  "logistics",
];

/* =========================================================
   STAFF ROLES
========================================================= */

const STAFF_ROLES = [
  "admin",
  "superadmin",
  "accounts",
  "logistics",
];

/* =========================================================
   FORMAT USER RESPONSE
========================================================= */

const formatUser = (user) => {
  if (!user) return null;

  const userObject = user.toObject
    ? user.toObject()
    : { ...user };

  delete userObject.password;
  delete userObject.__v;

  return {
    ...userObject,

    role:
      String(userObject.role || "user")
        .trim()
        .toLowerCase(),

    isBlocked: Boolean(userObject.isBlocked),

    isActive:
      userObject.isActive === undefined
        ? !Boolean(userObject.isBlocked)
        : Boolean(userObject.isActive),
  };
};

/* =========================================================
   NORMALIZE ROLE
========================================================= */

const normalizeRole = (role) => {
  if (
    role === undefined ||
    role === null ||
    role === ""
  ) {
    return null;
  }

  const normalizedRole = String(role)
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");

  const roleMap = {
    user: "user",

    admin: "admin",

    superadmin: "superadmin",

    accounts: "accounts",

    logistics: "logistics",
  };

  return roleMap[normalizedRole] || null;
};

/* =========================================================
   CHECK MODEL FIELD
========================================================= */

const hasField = (document, fieldName) => {
  return Boolean(
    document?.schema?.path(fieldName),
  );
};

/* =========================================================
   GET ACTOR ROLE
========================================================= */

const getActorRole = (req) => {
  return normalizeRole(
    req.user?.role || req.auth?.role,
  );
};

/* =========================================================
   CHECK SUPERADMIN
========================================================= */

const isSuperAdmin = (req) => {
  return getActorRole(req) === "superadmin";
};

/* =========================================================
   CHECK MANAGEMENT ROLE
========================================================= */

const isManagementRole = (req) => {
  return [
    "superadmin",
    "admin",
  ].includes(getActorRole(req));
};

/* =========================================================
   GET ALL USERS
   GET /api/admin/users
========================================================= */

export const getAllUsersAdmin = async (
  req,
  res,
) => {
  try {
    const users = await User.find({})
      .select("-password -__v")
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: users.length,

      users: users.map((user) => ({
        ...user,

        role:
          normalizeRole(user.role) ||
          "user",

        isBlocked: Boolean(
          user.isBlocked,
        ),

        isActive:
          user.isActive === undefined
            ? !Boolean(user.isBlocked)
            : Boolean(user.isActive),
      })),
    });
  } catch (error) {
    console.error(
      "Get all users error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch users",
    });
  }
};

/* =========================================================
   GET SINGLE USER
   GET /api/admin/users/:id
========================================================= */

export const getAdminUserById = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id)
      .select("-password -__v");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    return res.status(200).json({
      success: true,
      user: formatUser(user),
    });
  } catch (error) {
    console.error(
      "Get admin user error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch user",
    });
  }
};

/* =========================================================
   UPDATE USER DETAILS
   PUT /api/admin/users/:id
========================================================= */

export const updateUserAdmin = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    const {
      name,
      fullName,
      email,
      phone,
      role,
      isActive,
    } = req.body || {};

    if (
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid user ID",
      });
    }

    const user = await User.findById(id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const updatedName = String(
      name ?? fullName ?? "",
    ).trim();

    const updatedEmail = String(
      email ?? "",
    )
      .trim()
      .toLowerCase();

    const updatedPhone = String(
      phone ?? "",
    ).trim();

    /* -----------------------------------------------------
       VALIDATE NAME
    ----------------------------------------------------- */

    if (!updatedName) {
      return res.status(400).json({
        success: false,
        message: "Name is required",
      });
    }

    /* -----------------------------------------------------
       VALIDATE EMAIL
    ----------------------------------------------------- */

    if (!updatedEmail) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    /* -----------------------------------------------------
       CHECK DUPLICATE EMAIL
    ----------------------------------------------------- */

    const emailOwner =
      await User.findOne({
        email: updatedEmail,
        _id: {
          $ne: id,
        },
      });

    if (emailOwner) {
      return res.status(409).json({
        success: false,
        message:
          "Email is already registered with another account",
      });
    }

    /* -----------------------------------------------------
       NORMALIZE ROLE
    ----------------------------------------------------- */

    let normalizedRole =
      normalizeRole(role);

    if (
      role !== undefined &&
      normalizedRole === null
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid user role. Allowed roles are user, admin, superadmin, accounts and logistics",
      });
    }

    if (!normalizedRole) {
      normalizedRole =
        normalizeRole(user.role) ||
        "user";
    }

    /* -----------------------------------------------------
       ACTOR INFORMATION
    ----------------------------------------------------- */

    const currentAdminId = String(
      req.user?._id ||
        req.user?.id ||
        "",
    );

    const actorRole =
      getActorRole(req);

    const isEditingOwnAccount =
      currentAdminId ===
      String(user._id);

    const existingRole =
      normalizeRole(user.role) ||
      "user";

    /* -----------------------------------------------------
       ROLE CHANGE PERMISSION

       Only superadmin can:
       - create/change superadmin
       - change admin roles
       - manage accounts/logistics staff roles

       Admin can manage normal users but cannot
       promote/demote staff roles.
    ----------------------------------------------------- */

    const isChangingRole =
      normalizedRole !== existingRole;

    if (
      isChangingRole &&
      !isSuperAdmin(req)
    ) {
      const staffRoleChange =
        STAFF_ROLES.includes(
          normalizedRole,
        ) ||
        STAFF_ROLES.includes(
          existingRole,
        );

      if (staffRoleChange) {
        return res.status(403).json({
          success: false,
          message:
            "Only a superadmin can change staff roles",
        });
      }
    }

    /* -----------------------------------------------------
       PREVENT SELF ROLE REMOVAL
    ----------------------------------------------------- */

    if (
      isEditingOwnAccount &&
      normalizedRole !== existingRole
    ) {
      return res.status(400).json({
        success: false,
        message:
          "You cannot change your own role",
      });
    }

    /* -----------------------------------------------------
       LAST SUPERADMIN PROTECTION
    ----------------------------------------------------- */

    if (
      existingRole === "superadmin" &&
      normalizedRole !== "superadmin"
    ) {
      const superadminCount =
        await User.countDocuments({
          role: "superadmin",
        });

      if (superadminCount <= 1) {
        return res.status(400).json({
          success: false,
          message:
            "At least one superadmin account must remain",
        });
      }
    }

    /* -----------------------------------------------------
       UPDATE NAME
    ----------------------------------------------------- */

    if (
      hasField(user, "name")
    ) {
      user.name = updatedName;
    }

    if (
      hasField(user, "fullName")
    ) {
      user.fullName = updatedName;
    }

    /* -----------------------------------------------------
       UPDATE EMAIL
    ----------------------------------------------------- */

    user.email = updatedEmail;

    /* -----------------------------------------------------
       UPDATE PHONE
    ----------------------------------------------------- */

    if (
      hasField(user, "phone")
    ) {
      user.phone = updatedPhone;
    }

    /* -----------------------------------------------------
       UPDATE ROLE
    ----------------------------------------------------- */

    user.role = normalizedRole;

    /* -----------------------------------------------------
       UPDATE ACTIVE STATUS
    ----------------------------------------------------- */

    if (
      isActive !== undefined &&
      hasField(user, "isActive")
    ) {
      user.isActive = Boolean(
        isActive,
      );
    }

    /* -----------------------------------------------------
       BLOCKED USER MUST REMAIN INACTIVE
    ----------------------------------------------------- */

    if (
      hasField(user, "isBlocked") &&
      user.isBlocked === true
    ) {
      user.isActive = false;
    }

    const savedUser =
      await user.save();

    return res.status(200).json({
      success: true,
      message:
        "User updated successfully",
      user: formatUser(savedUser),
    });
  } catch (error) {
    console.error(
      "Update user error:",
      error,
    );

    if (
      error.code === 11000
    ) {
      return res.status(409).json({
        success: false,
        message:
          "Email is already registered",
      });
    }

    if (
      error.name ===
      "ValidationError"
    ) {
      return res.status(400).json({
        success: false,
        message:
          error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update user",
    });
  }
};

/* =========================================================
   BLOCK OR UNBLOCK USER
   PUT /api/admin/users/:id/block
========================================================= */

export const toggleUserBlockAdmin =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const {
        isBlocked,
      } = req.body || {};

      if (
        !mongoose.Types.ObjectId.isValid(
          id,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user ID",
        });
      }

      if (
        typeof isBlocked !==
        "boolean"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "isBlocked must be true or false",
        });
      }

      const user =
        await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      const currentAdminId =
        String(
          req.user?._id ||
            req.user?.id ||
            "",
        );

      /* ---------------------------------------------------
         PREVENT SELF BLOCK
      --------------------------------------------------- */

      if (
        currentAdminId ===
          String(user._id) &&
        isBlocked === true
      ) {
        return res.status(400).json({
          success: false,
          message:
            "You cannot block your own account",
        });
      }

      const userRole =
        normalizeRole(
          user.role,
        ) || "user";

      /* ---------------------------------------------------
         LAST ACTIVE SUPERADMIN PROTECTION
      --------------------------------------------------- */

      if (
        userRole ===
          "superadmin" &&
        isBlocked === true
      ) {
        const activeSuperadminCount =
          await User.countDocuments({
            role: "superadmin",
            isBlocked: {
              $ne: true,
            },
            isActive: {
              $ne: false,
            },
          });

        if (
          activeSuperadminCount <=
          1
        ) {
          return res.status(400).json({
            success: false,
            message:
              "At least one active superadmin account must remain",
          });
        }
      }

      /* ---------------------------------------------------
         UPDATE BLOCK STATUS
      --------------------------------------------------- */

      if (
        hasField(
          user,
          "isBlocked",
        )
      ) {
        user.isBlocked =
          isBlocked;
      }

      if (
        hasField(
          user,
          "isActive",
        )
      ) {
        user.isActive =
          !isBlocked;
      }

      const savedUser =
        await user.save();

      return res.status(200).json({
        success: true,

        message: isBlocked
          ? "User blocked successfully"
          : "User unblocked successfully",

        user:
          formatUser(
            savedUser,
          ),
      });
    } catch (error) {
      console.error(
        "Toggle user block error:",
        error,
      );

      if (
        error.name ===
        "ValidationError"
      ) {
        return res.status(400).json({
          success: false,
          message:
            error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to update user block status",
      });
    }
  };

/* =========================================================
   RESET USER PASSWORD
   PUT /api/admin/users/:id/reset-password
========================================================= */

export const resetUserPasswordAdmin =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      const {
        password,
      } = req.body || {};

      if (
        !mongoose.Types.ObjectId.isValid(
          id,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid user ID",
        });
      }

      if (
        !password ||
        typeof password !==
          "string"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password is required",
        });
      }

      if (
        password.length < 8
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Password must contain at least 8 characters",
        });
      }

      const user =
        await User.findById(id);

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "User not found",
        });
      }

      const hashedPassword =
        await bcrypt.hash(
          password,
          12,
        );

      user.password =
        hashedPassword;

      /*
        This flag is used to prevent
        the User model from hashing
        an already hashed password
        a second time.
      */

      user.$locals =
        user.$locals || {};

      user.$locals.passwordAlreadyHashed =
        true;

      await user.save();

      return res.status(200).json({
        success: true,
        message:
          "Password reset successfully",
      });
    } catch (error) {
      console.error(
        "Reset user password error:",
        error,
      );

      if (
        error.name ===
        "ValidationError"
      ) {
        return res.status(400).json({
          success: false,
          message:
            error.message,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Failed to reset password",
      });
    }
  };