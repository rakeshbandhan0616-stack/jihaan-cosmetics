import express from "express";

import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  createNotification,
  getAllNotificationsAdmin,
  updateNotification,
  deleteNotification,
} from "../controllers/notificationController.js";

import {
  protect,
  userOnly,
  adminOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   CUSTOMER NOTIFICATIONS
========================================================= */

router.get(
  "/",
  protect,
  userOnly,
  getUserNotifications,
);

router.get(
  "/unread-count",
  protect,
  userOnly,
  getUnreadNotificationCount,
);

router.patch(
  "/:id/read",
  protect,
  userOnly,
  markNotificationAsRead,
);

router.patch(
  "/read-all",
  protect,
  userOnly,
  markAllNotificationsAsRead,
);

/* =========================================================
   ADMIN / SUPERADMIN NOTIFICATIONS
========================================================= */

router.post(
  "/admin",
  protect,
  adminOnly,
  createNotification,
);

router.get(
  "/admin",
  protect,
  adminOnly,
  getAllNotificationsAdmin,
);

router.put(
  "/admin/:id",
  protect,
  adminOnly,
  updateNotification,
);

router.delete(
  "/admin/:id",
  protect,
  adminOnly,
  deleteNotification,
);

export default router;