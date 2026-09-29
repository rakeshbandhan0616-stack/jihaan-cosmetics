import User from "../models/User.js";

/**
 * GET /api/admin/account/profile
 * Get currently logged-in admin/superadmin profile
 */
export const getAdminProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findById(req.user._id).select(
      "-password -refreshToken",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found",
      });
    }

    if (!["admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Admin profile fetched successfully",

      user: {
        _id: user._id,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role,
        isActive: user.isActive,

        createdAt: user.createdAt,
        updatedAt: user.updatedAt,

        // Last successful login information
        lastLoginAt: user.lastLoginAt || null,
        lastLoginIp: user.lastLoginIp || "",
      },
    });
  } catch (error) {
    console.error("Get admin profile error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin profile",
    });
  }
};

/**
 * PUT /api/admin/account/profile
 * Update currently logged-in admin/superadmin profile
 */
export const updateAdminProfile = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Admin account not found",
      });
    }

    if (!["admin", "superadmin"].includes(user.role)) {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    const {
      name,
      email,
      phone,
    } = req.body;

    // -----------------------------------------
    // Validate name
    // -----------------------------------------

    if (name !== undefined) {
      const cleanedName = String(name).trim();

      if (!cleanedName) {
        return res.status(400).json({
          success: false,
          message: "Name is required",
        });
      }

      if (cleanedName.length < 2) {
        return res.status(400).json({
          success: false,
          message:
            "Name must contain at least 2 characters",
        });
      }

      user.name = cleanedName;
    }

    // -----------------------------------------
    // Validate email
    // -----------------------------------------

    if (email !== undefined) {
      const cleanedEmail = String(email)
        .trim()
        .toLowerCase();

      if (!cleanedEmail) {
        return res.status(400).json({
          success: false,
          message: "Email is required",
        });
      }

      const emailRegex =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailRegex.test(cleanedEmail)) {
        return res.status(400).json({
          success: false,
          message:
            "Please enter a valid email address",
        });
      }

      // Check whether another account already
      // uses this email.
      const existingUser = await User.findOne({
        email: cleanedEmail,
        _id: { $ne: user._id },
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          message:
            "This email address is already in use",
        });
      }

      user.email = cleanedEmail;
    }

    // -----------------------------------------
    // Phone
    // -----------------------------------------

    if (phone !== undefined) {
      user.phone = String(phone).trim();
    }

    // -----------------------------------------
    // Never allow profile update to change role
    // -----------------------------------------

    /*
     * Role is intentionally NOT taken from req.body.
     *
     * Therefore an admin cannot change their own
     * role through this endpoint.
     */

    await user.save();

    return res.status(200).json({
      success: true,
      message:
        "Admin profile updated successfully",

      user: {
        _id: user._id,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        role: user.role,
        isActive: user.isActive,

        createdAt: user.createdAt,
        updatedAt: user.updatedAt,

        // Keep login information available
        // after profile update.
        lastLoginAt: user.lastLoginAt || null,
        lastLoginIp: user.lastLoginIp || "",
      },
    });
  } catch (error) {
    console.error(
      "Update admin profile error:",
      error,
    );

    // MongoDB duplicate-key protection
    if (error?.code === 11000) {
      return res.status(409).json({
        success: false,
        message:
          "Email address is already in use",
      });
    }

    return res.status(500).json({
      success: false,
      message:
        "Failed to update admin profile",
    });
  }
};