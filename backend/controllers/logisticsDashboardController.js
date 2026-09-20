import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import Order from "../models/Order.js";
import User from "../models/User.js";

/* =========================================================
   CONSTANTS
========================================================= */

const ORDER_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
];

/* =========================================================
   GET LOGISTICS OVERVIEW
   GET /api/logistics-dashboard/overview

   READ ONLY
========================================================= */

export const getLogisticsOverview =
  async (req, res) => {
    try {
      const [
        totalOrders,
        pendingOrders,
        processingOrders,
        shippedOrders,
        outForDeliveryOrders,
        deliveredOrders,
        cancelledOrders,
        returnOrders,
      ] = await Promise.all([
        /* TOTAL ORDERS */
        Order.countDocuments(),

        /* PENDING */
        Order.countDocuments({
          orderStatus: {
            $in: [
              "PLACED",
              "CONFIRMED",
            ],
          },
        }),

        /* PROCESSING */
        Order.countDocuments({
          orderStatus: "PROCESSING",
        }),

        /* SHIPPED */
        Order.countDocuments({
          orderStatus: "SHIPPED",
        }),

        /* OUT FOR DELIVERY */
        Order.countDocuments({
          orderStatus:
            "OUT_FOR_DELIVERY",
        }),

        /* DELIVERED */
        Order.countDocuments({
          orderStatus: "DELIVERED",
        }),

        /* CANCELLED */
        Order.countDocuments({
          orderStatus: "CANCELLED",
        }),

        /* RETURNS */
        Order.countDocuments({
          orderStatus: {
            $in: [
              "RETURN_REQUESTED",
              "RETURNED",
            ],
          },
        }),
      ]);

      return res.status(200).json({
        success: true,

        overview: {
          totalOrders,

          pendingOrders,

          processingOrders,

          shippedOrders,

          outForDeliveryOrders,

          deliveredOrders,

          cancelledOrders,

          returnOrders,
        },
      });
    } catch (error) {
      console.error(
        "Logistics overview error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch logistics overview",
      });
    }
  };

/* =========================================================
   GET LOGISTICS ORDERS
   GET /api/logistics-dashboard/orders

   READ ONLY
========================================================= */

export const getLogisticsOrders =
  async (req, res) => {
    try {
      const {
        status,
        search,
        page = 1,
        limit = 20,
      } = req.query || {};

      /* =====================================================
         PAGINATION
      ===================================================== */

      const currentPage = Math.max(
        1,
        Number(page) || 1,
      );

      const perPage = Math.min(
        100,
        Math.max(
          1,
          Number(limit) || 20,
        ),
      );

      /* =====================================================
         FILTER
      ===================================================== */

      const filter = {};

      /* STATUS FILTER */

      if (
        status &&
        ORDER_STATUSES.includes(
          String(status),
        )
      ) {
        filter.orderStatus =
          String(status);
      }

      /* =====================================================
         SEARCH
      ===================================================== */

      if (search) {
        const searchValue =
          String(search).trim();

        if (searchValue) {
          filter.$or = [
            {
              orderNumber: {
                $regex:
                  searchValue,
                $options: "i",
              },
            },

            {
              trackingId: {
                $regex:
                  searchValue,
                $options: "i",
              },
            },

            {
              courierName: {
                $regex:
                  searchValue,
                $options: "i",
              },
            },

            {
              "shippingAddress.fullName":
                {
                  $regex:
                    searchValue,
                  $options: "i",
                },
            },

            {
              "shippingAddress.phone":
                {
                  $regex:
                    searchValue,
                  $options: "i",
                },
            },

            {
              currentLocation: {
                $regex:
                  searchValue,
                $options: "i",
              },
            },
          ];
        }
      }

      /* =====================================================
         SKIP
      ===================================================== */

      const skip =
        (currentPage - 1) *
        perPage;

      /* =====================================================
         QUERY
      ===================================================== */

      const [
        orders,
        total,
      ] = await Promise.all([
        Order.find(filter)
          .populate(
            "user",
            "name email phone",
          )
          .sort({
            createdAt: -1,
          })
          .skip(skip)
          .limit(perPage)
          .lean(),

        Order.countDocuments(
          filter,
        ),
      ]);

      /* =====================================================
         RESPONSE
      ===================================================== */

      return res.status(200).json({
        success: true,

        pagination: {
          page: currentPage,
          limit: perPage,
          total,

          totalPages:
            Math.ceil(
              total / perPage,
            ),
        },

        orders,
      });
    } catch (error) {
      console.error(
        "Logistics orders error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch logistics orders",
      });
    }
  };

/* =========================================================
   GET SINGLE LOGISTICS ORDER
   GET /api/logistics-dashboard/orders/:id

   READ ONLY
========================================================= */

export const getLogisticsOrderById =
  async (req, res) => {
    try {
      const { id } =
        req.params;

      /* =====================================================
         VALIDATE ID
      ===================================================== */

      if (
        !mongoose.Types.ObjectId.isValid(
          id,
        )
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid order ID",
        });
      }

      /* =====================================================
         GET ORDER
      ===================================================== */

      const order =
        await Order.findById(id)
          .populate(
            "user",
            "name email phone",
          )
          .populate(
            "cancelledBy",
            "name email role",
          )
          .populate(
            "orderStatusHistory.updatedBy",
            "name email role",
          )
          .populate(
            "trackingHistory.updatedBy",
            "name email role",
          )
          .lean();

      /* =====================================================
         NOT FOUND
      ===================================================== */

      if (!order) {
        return res.status(404).json({
          success: false,
          message:
            "Order not found",
        });
      }

      /* =====================================================
         RESPONSE
      ===================================================== */

      return res.status(200).json({
        success: true,
        order,
      });
    } catch (error) {
      console.error(
        "Logistics order details error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch logistics order",
      });
    }
  };

/* =========================================================
   GET SHIPMENTS
   GET /api/logistics-dashboard/shipments

   ACTIVE SHIPMENTS

   SHIPPED
   OUT_FOR_DELIVERY
========================================================= */

export const getLogisticsShipments =
  async (req, res) => {
    try {
      const {
        status,
        page = 1,
        limit = 20,
      } = req.query || {};

      /* =====================================================
         PAGINATION
      ===================================================== */

      const currentPage = Math.max(
        1,
        Number(page) || 1,
      );

      const perPage = Math.min(
        100,
        Math.max(
          1,
          Number(limit) || 20,
        ),
      );

      /* =====================================================
         DEFAULT ACTIVE SHIPMENT FILTER
      ===================================================== */

      const filter = {
        orderStatus: {
          $in: [
            "SHIPPED",
            "OUT_FOR_DELIVERY",
          ],
        },
      };

      /* =====================================================
         STATUS FILTER
      ===================================================== */

      if (
        status &&
        [
          "SHIPPED",
          "OUT_FOR_DELIVERY",
        ].includes(
          String(status),
        )
      ) {
        filter.orderStatus =
          String(status);
      }

      /* =====================================================
         PAGINATION SKIP
      ===================================================== */

      const skip =
        (currentPage - 1) *
        perPage;

      /* =====================================================
         QUERY
      ===================================================== */

      const [
        shipments,
        total,
      ] = await Promise.all([
        Order.find(filter)
          .populate(
            "user",
            "name email phone",
          )
          .sort({
            expectedDeliveryAt: 1,
            createdAt: -1,
          })
          .skip(skip)
          .limit(perPage)
          .lean(),

        Order.countDocuments(
          filter,
        ),
      ]);

      /* =====================================================
         RESPONSE
      ===================================================== */

      return res.status(200).json({
        success: true,

        pagination: {
          page: currentPage,
          limit: perPage,
          total,

          totalPages:
            Math.ceil(
              total / perPage,
            ),
        },

        shipments,
      });
    } catch (error) {
      console.error(
        "Logistics shipments error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch shipments",
      });
    }
  };

/* =========================================================
   EXPECTED DELIVERIES
   GET /api/logistics-dashboard/deliveries

   DEFAULT = NEXT 30 DAYS
========================================================= */

export const getExpectedDeliveries =
  async (req, res) => {
    try {
      const {
        days = 30,
      } = req.query || {};

      /* =====================================================
         DAYS
      ===================================================== */

      const numberOfDays = Math.min(
        30,
        Math.max(
          1,
          Number(days) || 30,
        ),
      );

      /* =====================================================
         DATE RANGE
      ===================================================== */

      const now = new Date();

      const futureDate =
        new Date();

      futureDate.setDate(
        futureDate.getDate() +
          numberOfDays,
      );

      /* =====================================================
         QUERY
      ===================================================== */

      const orders =
        await Order.find({
          orderStatus: {
            $in: [
              "SHIPPED",
              "OUT_FOR_DELIVERY",
            ],
          },

          expectedDeliveryAt: {
            $gte: now,
            $lte: futureDate,
          },
        })
          .populate(
            "user",
            "name email phone",
          )
          .sort({
            expectedDeliveryAt: 1,
          })
          .lean();

      /* =====================================================
         RESPONSE
      ===================================================== */

      return res.status(200).json({
        success: true,

        days: numberOfDays,

        count: orders.length,

        deliveries: orders,
      });
    } catch (error) {
      console.error(
        "Expected deliveries error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch expected deliveries",
      });
    }
  };

/* =========================================================
   GET LOGISTICS ACCOUNT
   GET /api/logistics-dashboard/account

   CURRENT LOGGED-IN LOGISTICS USER
========================================================= */

export const getLogisticsAccount =
  async (req, res) => {
    try {
      /* =====================================================
         FIND USER
      ===================================================== */

      const user =
        await User.findById(
          req.user._id,
        ).select(
          "_id name email phone profileImage role isActive isBlocked isEmailVerified createdAt updatedAt lastLoginAt",
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message:
            "Logistics account not found",
        });
      }

      /* =====================================================
         RESPONSE
      ===================================================== */

      return res.status(200).json({
        success: true,

        user: {
          id: user._id,
          _id: user._id,

          name:
            user.name || "",

          email:
            user.email || "",

          phone:
            user.phone || "",

          profileImage:
            user.profileImage || "",

          role:
            user.role,

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
  };

/* =========================================================
   UPDATE LOGISTICS ACCOUNT
   PUT /api/logistics-dashboard/account/profile

   ALLOWED:
   - NAME
   - EMAIL
   - PHONE

   NOT ALLOWED:
   - ROLE
   - PASSWORD
   - ACTIVE STATUS
   - BLOCK STATUS
========================================================= */

export const updateLogisticsAccount =
  async (req, res) => {
    try {
      const {
        name,
        email,
        phone,
      } = req.body || {};

      /* =====================================================
         FIND USER
      ===================================================== */

      const user =
        await User.findById(
          req.user._id,
        );

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

        if (
          normalizedName.length < 2
        ) {
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

        /* ================================================
           CHECK DUPLICATE EMAIL
        ================================================= */

        const emailExists =
          await User.findOne({
            email:
              normalizedEmail,

            _id: {
              $ne: user._id,
            },
          }).select("_id");

        if (emailExists) {
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

        /* ================================================
           VALIDATE PHONE
        ================================================= */

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

        /* ================================================
           UPDATE PHONE
        ================================================= */

        if (normalizedPhone) {
          const phoneExists =
            await User.findOne({
              phone:
                normalizedPhone,

              _id: {
                $ne: user._id,
              },
            }).select("_id");

          if (phoneExists) {
            return res.status(409).json({
              success: false,
              message:
                "This phone number is already registered",
            });
          }

          user.phone =
            normalizedPhone;
        } else {
          user.phone =
            undefined;
        }
      }

      /* =====================================================
         SAVE
      ===================================================== */

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

          name:
            user.name || "",

          email:
            user.email || "",

          phone:
            user.phone || "",

          profileImage:
            user.profileImage || "",

          role:
            user.role,

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

      if (
        error?.code === 11000
      ) {
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
  };

/* =========================================================
   CHANGE LOGISTICS PASSWORD
   PUT /api/logistics-dashboard/account/password

   BODY:

   {
     currentPassword: "...",
     newPassword: "...",
     confirmPassword: "..."
   }
========================================================= */

export const changeLogisticsPassword =
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
         CONFIRM PASSWORD
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

      const user =
        await User.findById(
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
         PASSWORD EXISTS
      ===================================================== */

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

      /* =====================================================
         SAVE
      ===================================================== */

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
  };