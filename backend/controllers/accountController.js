import bcrypt from "bcryptjs";
import User from "../models/User.js";

/**
 * Format user data before sending it to frontend
 */
const getUserResponse = (user) => {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    profileImage: user.profileImage || "",
    role: user.role,
    isActive: user.isActive,
    isEmailVerified: user.isEmailVerified,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
};

/**
 * Normalize Indian phone number
 */
const normalizePhone = (phone) => {
  let normalizedPhone = String(phone || "").replace(/\D/g, "");

  if (
    normalizedPhone.startsWith("91") &&
    normalizedPhone.length === 12
  ) {
    normalizedPhone = normalizedPhone.slice(2);
  }

  return normalizedPhone;
};

/**
 * Validate Indian phone number
 */
const isValidPhone = (phone) => {
  return /^[6-9][0-9]{9}$/.test(phone);
};

/**
 * GET CURRENT USER ACCOUNT
 * GET /api/account/me
 */
export const getAccount = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Please login first",
      });
    }

    return res.status(200).json({
      success: true,
      user: getUserResponse(req.user),
    });
  } catch (error) {
    console.error("Get account error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to load account information",
    });
  }
};

/**
 * UPDATE USER PROFILE
 * PUT /api/account/profile
 */
export const updateAccountProfile = async (req, res) => {
  try {
    const { name, phone } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    if (name !== undefined) {
      const normalizedName = String(name).trim();

      if (normalizedName.length < 2) {
        return res.status(400).json({
          success: false,
          message: "Name must contain at least 2 characters",
        });
      }

      if (normalizedName.length > 80) {
        return res.status(400).json({
          success: false,
          message: "Name cannot exceed 80 characters",
        });
      }

      user.name = normalizedName;
    }

    if (phone !== undefined) {
      const normalizedPhone = normalizePhone(phone);

      if (!isValidPhone(normalizedPhone)) {
        return res.status(400).json({
          success: false,
          message: "Please enter a valid 10-digit mobile number",
        });
      }

      const existingPhoneUser = await User.findOne({
        phone: normalizedPhone,
        _id: { $ne: user._id },
      });

      if (existingPhoneUser) {
        return res.status(409).json({
          success: false,
          message: "This phone number is already registered",
        });
      }

      user.phone = normalizedPhone;
    }

    if (req.file) {
      user.profileImage = `/uploads/users/${req.file.filename}`;
    }

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      user: getUserResponse(user),
    });
  } catch (error) {
    console.error("Update account profile error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "Email or phone number is already registered",
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to update profile",
    });
  }
};

/**
 * CHANGE PASSWORD
 * PUT /api/account/change-password
 */
export const updatePassword = async (req, res) => {
  try {
    const {
      currentPassword,
      newPassword,
      confirmPassword,
    } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All password fields are required",
      });
    }

    if (String(newPassword).length < 4) {
      return res.status(400).json({
        success: false,
        message: "New password must contain at least 4 characters",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match",
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      return res.status(401).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    user.password = await bcrypt.hash(newPassword, 12);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Change password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to change password",
    });
  }
};

/**
 * LOGOUT USER
 * POST /api/account/logout
 */
export const logoutAccount = async (_req, res) => {
  try {
    const isProduction = process.env.NODE_ENV === "production";

    res.clearCookie("token", {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? "none" : "lax",
    });

    return res.status(200).json({
      success: true,
      message: "Logout successful",
    });
  } catch (error) {
    console.error("Logout error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to logout",
    });
  }
};