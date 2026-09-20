import mongoose from "mongoose";
import fs from "fs";
import path from "path";

import HeroBanner from "../models/HeroBanner.js";

const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

const getUploadedFileUrl = (req, file) => {
  if (!file) {
    return "";
  }

  const relativePath = path
    .relative(process.cwd(), file.path)
    .replaceAll("\\", "/");

  return `${req.protocol}://${req.get("host")}/${relativePath}`;
};

const deleteUploadedFileFromUrl = (fileUrl) => {
  try {
    if (!fileUrl) {
      return;
    }

    const parsedUrl = new URL(fileUrl);
    const relativePath = parsedUrl.pathname.replace(/^\/+/, "");

    const filePath = path.join(process.cwd(), relativePath);

    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.error("Delete uploaded hero file error:", error.message);
  }
};

const parseBoolean = (value, defaultValue = true) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return value === "true";
};

const validateBannerType = (type) => {
  return ["image", "video"].includes(type);
};

// Get active hero banners - public
export const getActiveHeroBanners = async (req, res) => {
  try {
    const banners = await HeroBanner.find({
      isActive: true,
    }).sort({
      displayOrder: 1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: banners.length,
      banners,
    });
  } catch (error) {
    console.error("Get active hero banners error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch active hero banners",
      error: error.message,
    });
  }
};

// Get all hero banners - admin
export const getAllHeroBanners = async (req, res) => {
  try {
    const banners = await HeroBanner.find().sort({
      displayOrder: 1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: banners.length,
      banners,
    });
  } catch (error) {
    console.error("Get all hero banners error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch hero banners",
      error: error.message,
    });
  }
};

// Get one hero banner
export const getHeroBannerById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hero banner ID",
      });
    }

    const banner = await HeroBanner.findById(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Hero banner not found",
      });
    }

    return res.status(200).json({
      success: true,
      banner,
    });
  } catch (error) {
    console.error("Get hero banner error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch hero banner",
      error: error.message,
    });
  }
};

// Create hero banner
export const createHeroBanner = async (req, res) => {
  try {
    const {
      title,
      description,
      category,
      type,
      alt,
      productId,
      productSlug,
      buttonText,
      isActive,
      displayOrder,
    } = req.body;

    const desktopFile = req.files?.desktopSrc?.[0];
    const mobileFile = req.files?.mobileSrc?.[0];

    if (!type || !desktopFile) {
      return res.status(400).json({
        success: false,
        message: "Banner type and desktop media file are required",
      });
    }

    if (!validateBannerType(type)) {
      return res.status(400).json({
        success: false,
        message: "Banner type must be image or video",
      });
    }

    if (type === "image" && !desktopFile.mimetype.startsWith("image/")) {
      return res.status(400).json({
        success: false,
        message: "Desktop file must be an image",
      });
    }

    if (type === "video" && !desktopFile.mimetype.startsWith("video/")) {
      return res.status(400).json({
        success: false,
        message: "Desktop file must be a video",
      });
    }

    if (mobileFile) {
      if (type === "image" && !mobileFile.mimetype.startsWith("image/")) {
        return res.status(400).json({
          success: false,
          message: "Mobile file must be an image",
        });
      }

      if (type === "video" && !mobileFile.mimetype.startsWith("video/")) {
        return res.status(400).json({
          success: false,
          message: "Mobile file must be a video",
        });
      }
    }

    let validProductId = null;

    if (productId) {
      if (!isValidObjectId(productId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid productId",
        });
      }

      validProductId = productId;
    }

    const desktopSrc = getUploadedFileUrl(req, desktopFile);
    const mobileSrc = getUploadedFileUrl(req, mobileFile);

    const banner = await HeroBanner.create({
      title: title || "",
      description: description || "",
      category: category || "General",
      type,
      desktopSrc,
      mobileSrc,
      alt: alt || "",
      productId: validProductId,
      productSlug: productSlug || "",
      buttonText: buttonText || "Shop Now",
      isActive: parseBoolean(isActive, true),
      displayOrder: Number(displayOrder) || 0,
    });

    return res.status(201).json({
      success: true,
      message: "Hero banner created successfully",
      banner,
    });
  } catch (error) {
    console.error("Create hero banner error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create hero banner",
      error: error.message,
    });
  }
};

// Update hero banner
export const updateHeroBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hero banner ID",
      });
    }

    const banner = await HeroBanner.findById(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Hero banner not found",
      });
    }

    const {
      title,
      description,
      category,
      type,
      alt,
      productId,
      productSlug,
      buttonText,
      isActive,
      displayOrder,
    } = req.body;

    if (type !== undefined && !validateBannerType(type)) {
      return res.status(400).json({
        success: false,
        message: "Banner type must be image or video",
      });
    }

    const nextType = type || banner.type;

    const desktopFile = req.files?.desktopSrc?.[0];
    const mobileFile = req.files?.mobileSrc?.[0];

    if (desktopFile) {
      if (
        nextType === "image" &&
        !desktopFile.mimetype.startsWith("image/")
      ) {
        return res.status(400).json({
          success: false,
          message: "Desktop file must be an image",
        });
      }

      if (
        nextType === "video" &&
        !desktopFile.mimetype.startsWith("video/")
      ) {
        return res.status(400).json({
          success: false,
          message: "Desktop file must be a video",
        });
      }
    }

    if (mobileFile) {
      if (
        nextType === "image" &&
        !mobileFile.mimetype.startsWith("image/")
      ) {
        return res.status(400).json({
          success: false,
          message: "Mobile file must be an image",
        });
      }

      if (
        nextType === "video" &&
        !mobileFile.mimetype.startsWith("video/")
      ) {
        return res.status(400).json({
          success: false,
          message: "Mobile file must be a video",
        });
      }
    }

    if (productId !== undefined) {
      if (productId && !isValidObjectId(productId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid productId",
        });
      }

      banner.productId = productId || null;
    }

    if (title !== undefined) banner.title = title;
    if (description !== undefined) banner.description = description;
    if (category !== undefined) banner.category = category;
    if (type !== undefined) banner.type = type;
    if (alt !== undefined) banner.alt = alt;
    if (productSlug !== undefined) banner.productSlug = productSlug;
    if (buttonText !== undefined) banner.buttonText = buttonText;

    if (isActive !== undefined) {
      banner.isActive = parseBoolean(isActive, banner.isActive);
    }

    if (displayOrder !== undefined) {
      banner.displayOrder = Number(displayOrder) || 0;
    }

    if (desktopFile) {
      const oldDesktopSrc = banner.desktopSrc;
      banner.desktopSrc = getUploadedFileUrl(req, desktopFile);

      deleteUploadedFileFromUrl(oldDesktopSrc);
    }

    if (mobileFile) {
      const oldMobileSrc = banner.mobileSrc;
      banner.mobileSrc = getUploadedFileUrl(req, mobileFile);

      deleteUploadedFileFromUrl(oldMobileSrc);
    }

    await banner.save();

    return res.status(200).json({
      success: true,
      message: "Hero banner updated successfully",
      banner,
    });
  } catch (error) {
    console.error("Update hero banner error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update hero banner",
      error: error.message,
    });
  }
};

// Delete hero banner
export const deleteHeroBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hero banner ID",
      });
    }

    const banner = await HeroBanner.findById(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Hero banner not found",
      });
    }

    deleteUploadedFileFromUrl(banner.desktopSrc);
    deleteUploadedFileFromUrl(banner.mobileSrc);

    await HeroBanner.findByIdAndDelete(id);

    return res.status(200).json({
      success: true,
      message: "Hero banner deleted successfully",
    });
  } catch (error) {
    console.error("Delete hero banner error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete hero banner",
      error: error.message,
    });
  }
};

// Toggle hero banner
export const toggleHeroBanner = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid hero banner ID",
      });
    }

    const banner = await HeroBanner.findById(id);

    if (!banner) {
      return res.status(404).json({
        success: false,
        message: "Hero banner not found",
      });
    }

    banner.isActive = !banner.isActive;

    await banner.save();

    return res.status(200).json({
      success: true,
      message: `Hero banner ${
        banner.isActive ? "activated" : "deactivated"
      } successfully`,
      banner,
    });
  } catch (error) {
    console.error("Toggle hero banner error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to update banner status",
      error: error.message,
    });
  }
};