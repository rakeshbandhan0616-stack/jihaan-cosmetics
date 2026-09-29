import mongoose from "mongoose";
import Notification from "../models/Notification.js";

/* =========================================================
   USER - GET NOTIFICATIONS
   ========================================================= */

export const getUserNotifications = async (req, res) => {
  try {
    const userId = req.user._id;

    const notifications = await Notification.find({
      isActive: true,
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();

    const formattedNotifications = notifications.map(
      (notification) => ({
        _id: notification._id,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        createdAt: notification.createdAt,
        isRead: notification.readBy.some(
          (id) => String(id) === String(userId),
        ),
      }),
    );

    res.status(200).json({
      success: true,
      notifications: formattedNotifications,
    });
  } catch (error) {
    console.error(
      "Get user notifications error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Unable to load notifications",
    });
  }
};

/* =========================================================
   USER - UNREAD COUNT
   ========================================================= */

export const getUnreadNotificationCount = async (
  req,
  res,
) => {
  try {
    const userId = req.user._id;

    const count = await Notification.countDocuments({
      isActive: true,
      readBy: {
        $ne: userId,
      },
    });

    res.status(200).json({
      success: true,
      count,
    });
  } catch (error) {
    console.error(
      "Unread notification count error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Unable to get notification count",
    });
  }
};

/* =========================================================
   USER - MARK ONE AS READ
   ========================================================= */

export const markNotificationAsRead = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification =
      await Notification.findOneAndUpdate(
        {
          _id: id,
          isActive: true,
        },
        {
          $addToSet: {
            readBy: req.user._id,
          },
        },
        {
          new: true,
        },
      );

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error(
      "Mark notification read error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Unable to mark notification as read",
    });
  }
};

/* =========================================================
   USER - MARK ALL AS READ
   ========================================================= */

export const markAllNotificationsAsRead = async (
  req,
  res,
) => {
  try {
    await Notification.updateMany(
      {
        isActive: true,
        readBy: {
          $ne: req.user._id,
        },
      },
      {
        $addToSet: {
          readBy: req.user._id,
        },
      },
    );

    res.status(200).json({
      success: true,
      message: "All notifications marked as read",
    });
  } catch (error) {
    console.error(
      "Mark all notifications read error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Unable to mark notifications as read",
    });
  }
};

/* =========================================================
   ADMIN - CREATE
   ========================================================= */

export const createNotification = async (
  req,
  res,
) => {
  try {
    const {
      title,
      message,
      link = "",
      isActive = true,
    } = req.body;

    if (!title?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notification title is required",
      });
    }

    if (!message?.trim()) {
      return res.status(400).json({
        success: false,
        message: "Notification message is required",
      });
    }

    const notification =
      await Notification.create({
        title: title.trim(),
        message: message.trim(),
        link: String(link || "").trim(),
        isActive: Boolean(isActive),
        createdBy: req.user._id,
      });

    res.status(201).json({
      success: true,
      message: "Notification created successfully",
      notification,
    });
  } catch (error) {
    console.error(
      "Create notification error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Unable to create notification",
    });
  }
};

/* =========================================================
   ADMIN - GET ALL
   ========================================================= */

export const getAllNotificationsAdmin = async (
  _req,
  res,
) => {
  try {
    const notifications =
      await Notification.find()
        .populate(
          "createdBy",
          "name email role",
        )
        .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.error(
      "Get admin notifications error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Unable to load notifications",
    });
  }
};

/* =========================================================
   ADMIN - UPDATE
   ========================================================= */

export const updateNotification = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const {
      title,
      message,
      link,
      isActive,
    } = req.body;

    const notification =
      await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    if (title !== undefined) {
      notification.title = String(title).trim();
    }

    if (message !== undefined) {
      notification.message =
        String(message).trim();
    }

    if (link !== undefined) {
      notification.link =
        String(link || "").trim();
    }

    if (isActive !== undefined) {
      notification.isActive =
        Boolean(isActive);
    }

    await notification.save();

    res.status(200).json({
      success: true,
      message: "Notification updated successfully",
      notification,
    });
  } catch (error) {
    console.error(
      "Update notification error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Unable to update notification",
    });
  }
};

/* =========================================================
   ADMIN - DELETE
   ========================================================= */

export const deleteNotification = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid notification ID",
      });
    }

    const notification =
      await Notification.findByIdAndDelete(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: "Notification not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Notification deleted successfully",
    });
  } catch (error) {
    console.error(
      "Delete notification error:",
      error,
    );

    res.status(500).json({
      success: false,
      message: "Unable to delete notification",
    });
  }
};