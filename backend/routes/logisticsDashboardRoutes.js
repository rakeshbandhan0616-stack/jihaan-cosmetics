import express from "express";
import bcrypt from "bcryptjs";

import User from "../models/User.js";

import {
  getLogisticsOverview,
  getLogisticsOrders,
  getLogisticsOrderById,
  getLogisticsShipments,
  getExpectedDeliveries,
} from "../controllers/logisticsDashboardController.js";

import {
  protect,
  logisticsOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   LOGISTICS DASHBOARD
========================================================= */

router.use(protect);
router.use(logisticsOnly);

/* =========================================================
   OVERVIEW
========================================================= */

/**
 * GET
 * /api/logistics-dashboard/overview
 *
 * Logistics dashboard overview
 *
 * READ ONLY
 */
router.get(
  "/overview",
  getLogisticsOverview,
);

/* =========================================================
   ALL LOGISTICS ORDERS
========================================================= */

/**
 * GET
 * /api/logistics-dashboard/orders
 *
 * Query:
 * ?page=1
 * ?limit=20
 * ?status=SHIPPED
 * ?search=order123
 *
 * READ ONLY
 */
router.get(
  "/orders",
  getLogisticsOrders,
);

/* =========================================================
   SINGLE ORDER
========================================================= */

/**
 * GET
 * /api/logistics-dashboard/orders/:id
 *
 * READ ONLY
 */
router.get(
  "/orders/:id",
  getLogisticsOrderById,
);

/* =========================================================
   SHIPMENTS
========================================================= */

/**
 * GET
 * /api/logistics-dashboard/shipments
 *
 * Returns:
 * - CONFIRMED
 * - PROCESSING
 * - SHIPPED
 * - OUT_FOR_DELIVERY
 * - DELIVERED
 */
router.get(
  "/shipments",
  getLogisticsShipments,
);

/* =========================================================
   EXPECTED DELIVERIES
========================================================= */

/**
 * GET
 * /api/logistics-dashboard/deliveries
 *
 * Query:
 * ?days=7
 * ?days=30
 */
router.get(
  "/deliveries",
  getExpectedDeliveries,
);

/* =========================================================
   LOGISTICS ACCOUNT
========================================================= */

/**
 * GET
 * /api/logistics-dashboard/account
 *
 * Returns the currently logged-in logistics user's
 * account information.
 *
 * IMPORTANT:
 * - Only the logged-in logistics account is returned.
 * - Password is never returned.
 */
router.get(
  "/account",
  async (req, res) => {
    try {
      const user = await User.findById(
        req.user._id,
      ).select(
        "_id name email phone profileImage role isActive isBlocked isEmailVerified createdAt updatedAt lastLoginAt",
      );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Logistics account not found",
        });
      }

      return res.status(200).json({
        success: true,
        user: {
          id: user._id,
          _id: user._id,
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          profileImage:
            user.profileImage || "",
          role: user.role,
          isActive:
            user.isActive !== false,
          isBlocked:
            user.isBlocked === true,
          isEmailVerified:
            user.isEmailVerified === true,
          createdAt:
            user.createdAt || null,
          updatedAt:
            user.updatedAt || null,
          lastLoginAt:
            user.lastLoginAt || null,
        },
      });
    } catch (error) {
      console.error(
        "Get logistics account error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch logistics account",
      });
    }
  },
);

/* =========================================================
   UPDATE LOGISTICS ACCOUNT PROFILE
========================================================= */

/**
 * PUT
 * /api/logistics-dashboard/account/profile
 *
 * Body:
 *
 * {
 *   "name": "Tushar Bisane",
 *   "email": "logistics@jihaancosmetics.com",
 *   "phone": "9876543210"
 * }
 *
 * Allowed:
 * - Name
 * - Email
 * - Phone
 *
 * Not allowed:
 * - Role
 * - isActive
 * - isBlocked
 * - Password
 */
router.put(
  "/account/profile",
  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
      } = req.body || {};

      const user = await User.findById(
        req.user._id,
      ).select("+password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "Logistics account not found",
        });
      }

      /* =====================================================
         NAME
      ===================================================== */

      if (name !== undefined) {
        const normalizedName =
          String(name).trim();

        if (normalizedName.length < 2) {
          return res.status(400).json({
            success: false,
            message:
              "Name must contain at least 2 characters",
          });
        }

        user.name =
          normalizedName;
      }

      /* =====================================================
         EMAIL
      ===================================================== */

      if (email !== undefined) {
        const normalizedEmail =
          String(email)
            .trim()
            .toLowerCase();

        if (!normalizedEmail) {
          return res.status(400).json({
            success: false,
            message:
              "Email address is required",
          });
        }

        const emailRegex =
          /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (
          !emailRegex.test(
            normalizedEmail,
          )
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please enter a valid email address",
          });
        }

        const existingUser =
          await User.findOne({
            email:
              normalizedEmail,
            _id: {
              $ne: user._id,
            },
          }).select("_id");

        if (existingUser) {
          return res.status(409).json({
            success: false,
            message:
              "This email address is already registered",
          });
        }

        user.email =
          normalizedEmail;
      }

      /* =====================================================
         PHONE
      ===================================================== */

      if (phone !== undefined) {
        const normalizedPhone =
          String(phone)
            .replace(/\D/g, "")
            .trim();

        if (
          normalizedPhone &&
          normalizedPhone.length !== 10
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Please enter a valid 10-digit mobile number",
          });
        }

        if (normalizedPhone) {
          const existingPhone =
            await User.findOne({
              phone:
                normalizedPhone,
              _id: {
                $ne: user._id,
              },
            }).select("_id");

          if (existingPhone) {
            return res.status(409).json({
              success: false,
              message:
                "This phone number is already registered",
            });
          }

          user.phone =
            normalizedPhone;
        } else {
          user.phone = undefined;
        }
      }

      await user.save();

      /* =====================================================
         RESPONSE
      ===================================================== */

      return res.status(200).json({
        success: true,
        message:
          "Account updated successfully",

        user: {
          id: user._id,
          _id: user._id,
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
          profileImage:
            user.profileImage || "",
          role: user.role,
          isActive:
            user.isActive !== false,
          isBlocked:
            user.isBlocked === true,
          isEmailVerified:
            user.isEmailVerified === true,
          createdAt:
            user.createdAt || null,
          updatedAt:
            user.updatedAt || null,
          lastLoginAt:
            user.lastLoginAt || null,
        },
      });
    } catch (error) {
      console.error(
        "Update logistics account error:",
        error,
      );

      /* =====================================================
         DUPLICATE KEY
      ===================================================== */

      if (error?.code === 11000) {
        const duplicateField =
          Object.keys(
            error.keyPattern || {},
          )[0];

        if (
          duplicateField ===
          "email"
        ) {
          return res.status(409).json({
            success: false,
            message:
              "This email address is already registered",
          });
        }

        if (
          duplicateField ===
          "phone"
        ) {
          return res.status(409).json({
            success: false,
            message:
              "This phone number is already registered",
          });
        }
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to update logistics account",
      });
    }
  },
);

/* =========================================================
   CHANGE LOGISTICS ACCOUNT PASSWORD
========================================================= */

/**
 * PUT
 * /api/logistics-dashboard/account/password
 *
 * Body:
 *
 * {
 *   "currentPassword": "OldPassword@123",
 *   "newPassword": "NewPassword@123",
 *   "confirmPassword": "NewPassword@123"
 * }
 *
 * Password is never returned.
 */
router.put(
  "/account/password",
  async (req, res) => {
    try {
      const {
        currentPassword,
        newPassword,
        confirmPassword,
      } = req.body || {};

      /* =====================================================
         REQUIRED FIELDS
      ===================================================== */

      if (
        !currentPassword ||
        !newPassword ||
        !confirmPassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Current password, new password and confirm password are required",
        });
      }

      /* =====================================================
         PASSWORD LENGTH
      ===================================================== */

      if (
        String(newPassword).length < 8
      ) {
        return res.status(400).json({
          success: false,
          message:
            "New password must contain at least 8 characters",
        });
      }

      /* =====================================================
         PASSWORD MATCH
      ===================================================== */

      if (
        newPassword !==
        confirmPassword
      ) {
        return res.status(400).json({
          success: false,
          message:
            "New passwords do not match",
        });
      }

      /* =====================================================
         FIND USER WITH PASSWORD
      ===================================================== */

      const user = await User.findById(
        req.user._id,
      ).select("+password");

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "Logistics account not found",
        });
      }

      if (!user.password) {
        return res.status(400).json({
          success: false,
          message:
            "Password is not configured for this account",
        });
      }

      /* =====================================================
         VERIFY CURRENT PASSWORD
      ===================================================== */

      const currentPasswordValid =
        await bcrypt.compare(
          currentPassword,
          user.password,
        );

      if (!currentPasswordValid) {
        return res.status(401).json({
          success: false,
          message:
            "Current password is incorrect",
        });
      }

      /* =====================================================
         PREVENT SAME PASSWORD
      ===================================================== */

      const samePassword =
        await bcrypt.compare(
          newPassword,
          user.password,
        );

      if (samePassword) {
        return res.status(400).json({
          success: false,
          message:
            "New password must be different from current password",
        });
      }

      /* =====================================================
         HASH NEW PASSWORD
      ===================================================== */

      user.password =
        await bcrypt.hash(
          newPassword,
          12,
        );

      await user.save();

      /* =====================================================
         RESPONSE
      ===================================================== */

      return res.status(200).json({
        success: true,
        message:
          "Password changed successfully",
      });
    } catch (error) {
      console.error(
        "Change logistics password error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to change password",
      });
    }
  },
);

/* =========================================================
   EXPORT
========================================================= */

export default router;