import mongoose from "mongoose";
import HeroBanner from "../models/HeroBanner.js";
import cloudinary from "../config/cloudinary.js";

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Parse boolean values safely.
 */
const parseBoolean = (
  value,
  defaultValue = true
) => {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return defaultValue;
  }

  if (typeof value === "boolean") {
    return value;
  }

  return String(value).toLowerCase() === "true";
};

/**
 * Validate banner type.
 */
const validateBannerType = (type) => {
  return ["image", "video"].includes(type);
};

/**
 * Upload image/video buffer to Cloudinary.
 *
 * heroBannerUpload uses memoryStorage(),
 * so multer provides file.buffer.
 */
const uploadHeroFileToCloudinary = (
  file,
  folder = "jihaan-cosmetics/hero-banners"
) => {
  return new Promise((resolve, reject) => {
    if (!file?.buffer) {
      resolve("");
      return;
    }

    const isVideo =
      file.mimetype?.startsWith("video/");

    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder,

          resource_type: isVideo
            ? "video"
            : "image",
        },

        (error, result) => {
          if (error) {
            reject(error);
            return;
          }

          if (!result?.secure_url) {
            reject(
              new Error(
                "Cloudinary did not return a file URL."
              )
            );

            return;
          }

          resolve({
            url: result.secure_url,

            publicId:
              result.public_id,

            resourceType:
              result.resource_type ||
              (isVideo
                ? "video"
                : "image"),
          });
        }
      );

    uploadStream.end(file.buffer);
  });
};

/**
 * Extract Cloudinary public ID from
 * a stored Cloudinary URL.
 *
 * Old local URLs such as:
 *
 * /uploads/hero-banners/...
 *
 * are ignored safely.
 */
const getCloudinaryResourceInfoFromUrl = (
  fileUrl
) => {
  if (
    !fileUrl ||
    typeof fileUrl !== "string" ||
    !fileUrl.includes(
      "res.cloudinary.com"
    )
  ) {
    return null;
  }

  try {
    const parsedUrl =
      new URL(fileUrl);

    const uploadIndex =
      parsedUrl.pathname.indexOf(
        "/upload/"
      );

    if (uploadIndex === -1) {
      return null;
    }

    let publicIdPath =
      parsedUrl.pathname.slice(
        uploadIndex +
          "/upload/".length
      );

    const pathParts =
      publicIdPath.split("/");

    /**
     * Remove Cloudinary transformation
     * parameters.
     */
    while (
      pathParts.length > 0 &&
      (
        pathParts[0].startsWith("w_") ||
        pathParts[0].startsWith("h_") ||
        pathParts[0].startsWith("c_") ||
        pathParts[0].startsWith("q_") ||
        pathParts[0].startsWith("f_") ||
        pathParts[0].startsWith("dpr_") ||
        pathParts[0].startsWith("ar_") ||
        pathParts[0].startsWith("g_") ||
        pathParts[0].startsWith("e_") ||
        pathParts[0].startsWith("fl_")
      )
    ) {
      pathParts.shift();
    }

    publicIdPath =
      pathParts.join("/");

    /**
     * Remove Cloudinary version.
     *
     * Example:
     * v123456789/folder/banner.jpg
     */
    if (
      /^v\d+$/.test(
        publicIdPath.split("/")[0]
      )
    ) {
      publicIdPath =
        publicIdPath
          .split("/")
          .slice(1)
          .join("/");
    }

    /**
     * Remove extension.
     */
    publicIdPath =
      publicIdPath.replace(
        /\.[^/.]+$/,
        ""
      );

    if (!publicIdPath) {
      return null;
    }

    return {
      publicId:
        publicIdPath,

      resourceType:
        parsedUrl.pathname.startsWith(
          "/video/"
        )
          ? "video"
          : "image",
    };
  } catch (error) {
    console.error(
      "HERO CLOUDINARY URL PARSE ERROR:",
      error.message
    );

    return null;
  }
};

/**
 * Delete one Cloudinary asset.
 */
const deleteCloudinaryAsset = async (
  fileUrl
) => {
  const resourceInfo =
    getCloudinaryResourceInfoFromUrl(
      fileUrl
    );

  /**
   * Ignore old local URLs.
   */
  if (!resourceInfo) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(
      resourceInfo.publicId,
      {
        resource_type:
          resourceInfo.resourceType,

        invalidate: true,
      }
    );
  } catch (error) {
    console.error(
      "HERO CLOUDINARY DELETE ERROR:",
      resourceInfo.publicId,
      error.message
    );
  }
};

/**
 * Delete multiple Cloudinary assets.
 */
const deleteCloudinaryAssets = async (
  fileUrls = []
) => {
  const validUrls =
    fileUrls.filter(Boolean);

  if (
    validUrls.length === 0
  ) {
    return;
  }

  await Promise.all(
    validUrls.map((fileUrl) =>
      deleteCloudinaryAsset(
        fileUrl
      )
    )
  );
};

/**
 * Get active hero banners - public
 */
export const getActiveHeroBanners =
  async (req, res) => {
    try {
      const banners =
        await HeroBanner.find({
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
      console.error(
        "Get active hero banners error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch active hero banners",
        error: error.message,
      });
    }
  };

/**
 * Get all hero banners - admin
 */
export const getAllHeroBanners =
  async (req, res) => {
    try {
      const banners =
        await HeroBanner.find().sort({
          displayOrder: 1,
          createdAt: -1,
        });

      return res.status(200).json({
        success: true,
        count: banners.length,
        banners,
      });
    } catch (error) {
      console.error(
        "Get all hero banners error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch hero banners",
        error: error.message,
      });
    }
  };

/**
 * Get one hero banner
 */
export const getHeroBannerById =
  async (req, res) => {
    try {
      const { id } = req.params;

      if (!isValidObjectId(id)) {
        return res.status(400).json({
          success: false,
          message:
            "Invalid hero banner ID",
        });
      }

      const banner =
        await HeroBanner.findById(id);

      if (!banner) {
        return res.status(404).json({
          success: false,
          message:
            "Hero banner not found",
        });
      }

      return res.status(200).json({
        success: true,
        banner,
      });
    } catch (error) {
      console.error(
        "Get hero banner error:",
        error
      );

      return res.status(500).json({
        success: false,
        message:
          "Failed to fetch hero banner",
        error: error.message,
      });
    }
  };
  // ============================================================
// CREATE HERO BANNER
// ============================================================
export const createHeroBanner = async (req, res) => {
  const uploadedCloudinaryAssets = [];

  try {
    const {
      title = "",
      description = "",
      category = "General",
      type,
      alt = "",
      productId = null,
      productSlug = "",
      buttonText = "Shop Now",
      isActive = true,
      displayOrder = 0,
    } = req.body;

    // --------------------------------------------------------
    // Validate banner type
    // --------------------------------------------------------
    if (!type) {
      return res.status(400).json({
        message: "Banner type is required.",
      });
    }

    if (!["image", "video"].includes(type)) {
      return res.status(400).json({
        message: "Invalid banner type. Use image or video.",
      });
    }

    // --------------------------------------------------------
    // Files
    // --------------------------------------------------------
    const desktopFile = req.files?.desktopSrc?.[0];
    const mobileFile = req.files?.mobileSrc?.[0];

    // Desktop is required for new banner
    if (!desktopFile) {
      return res.status(400).json({
        message: "Desktop banner file is required.",
      });
    }

    // --------------------------------------------------------
    // Validate desktop file according to banner type
    // --------------------------------------------------------
    if (type === "image") {
      if (!desktopFile.mimetype?.startsWith("image/")) {
        return res.status(400).json({
          message: "Desktop banner must be an image.",
        });
      }

      if (
        mobileFile &&
        !mobileFile.mimetype?.startsWith("image/")
      ) {
        return res.status(400).json({
          message: "Mobile banner must be an image.",
        });
      }
    }

    if (type === "video") {
      if (!desktopFile.mimetype?.startsWith("video/")) {
        return res.status(400).json({
          message: "Desktop banner must be a video.",
        });
      }

      if (
        mobileFile &&
        !mobileFile.mimetype?.startsWith("video/")
      ) {
        return res.status(400).json({
          message: "Mobile banner must be a video.",
        });
      }
    }

    // --------------------------------------------------------
    // Validate productId
    // --------------------------------------------------------
    let finalProductId = null;

    if (productId) {
      if (!isValidObjectId(productId)) {
        return res.status(400).json({
          message: "Invalid productId.",
        });
      }

      finalProductId = productId;
    }

    // --------------------------------------------------------
    // Upload desktop file to Cloudinary
    // --------------------------------------------------------
    const desktopUpload = await uploadHeroFileToCloudinary(
      desktopFile
    );

    if (!desktopUpload?.url) {
      return res.status(500).json({
        message: "Failed to upload desktop banner.",
      });
    }

    uploadedCloudinaryAssets.push(desktopUpload);

    // --------------------------------------------------------
    // Upload mobile file if provided
    // --------------------------------------------------------
    let mobileUpload = null;

    if (mobileFile) {
      mobileUpload = await uploadHeroFileToCloudinary(
        mobileFile
      );

      if (!mobileUpload?.url) {
        throw new Error("Failed to upload mobile banner.");
      }

      uploadedCloudinaryAssets.push(mobileUpload);
    }

    // --------------------------------------------------------
    // Create database document
    // --------------------------------------------------------
    const heroBanner = await HeroBanner.create({
      title: String(title).trim(),
      description: String(description).trim(),
      category: String(category).trim() || "General",

      type,

      desktopSrc: desktopUpload.url,

      mobileSrc: mobileUpload?.url || "",

      alt: String(alt).trim(),

      productId: finalProductId,

      productSlug: String(productSlug).trim(),

      buttonText:
        String(buttonText).trim() || "Shop Now",

      isActive: parseBoolean(isActive, true),

      displayOrder: Number(displayOrder) || 0,
    });

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------
    return res.status(201).json({
      message: "Hero banner created successfully.",
      heroBanner,
    });
  } catch (error) {
    // --------------------------------------------------------
    // Cleanup newly uploaded Cloudinary assets if DB fails
    // --------------------------------------------------------
    await deleteCloudinaryAssets(
      uploadedCloudinaryAssets
    );

    console.error(
      "Create hero banner error:",
      error
    );

    return res.status(500).json({
      message:
        error?.message ||
        "Failed to create hero banner.",
    });
  }
};


// ============================================================
// UPDATE HERO BANNER
// ============================================================
export const updateHeroBanner = async (req, res) => {
  const uploadedCloudinaryAssets = [];

  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // Validate ID
    // --------------------------------------------------------
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid hero banner ID.",
      });
    }

    // --------------------------------------------------------
    // Find existing banner
    // --------------------------------------------------------
    const heroBanner = await HeroBanner.findById(id);

    if (!heroBanner) {
      return res.status(404).json({
        message: "Hero banner not found.",
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

    // --------------------------------------------------------
    // Determine final type
    // --------------------------------------------------------
    const finalType =
      type !== undefined
        ? String(type).trim()
        : heroBanner.type;

    if (!["image", "video"].includes(finalType)) {
      return res.status(400).json({
        message:
          "Invalid banner type. Use image or video.",
      });
    }

    // --------------------------------------------------------
    // Files
    // --------------------------------------------------------
    const desktopFile =
      req.files?.desktopSrc?.[0];

    const mobileFile =
      req.files?.mobileSrc?.[0];

    // --------------------------------------------------------
    // Validate uploaded files against final type
    // --------------------------------------------------------
    if (desktopFile) {
      if (
        finalType === "image" &&
        !desktopFile.mimetype?.startsWith("image/")
      ) {
        return res.status(400).json({
          message: "Desktop banner must be an image.",
        });
      }

      if (
        finalType === "video" &&
        !desktopFile.mimetype?.startsWith("video/")
      ) {
        return res.status(400).json({
          message: "Desktop banner must be a video.",
        });
      }
    }

    if (mobileFile) {
      if (
        finalType === "image" &&
        !mobileFile.mimetype?.startsWith("image/")
      ) {
        return res.status(400).json({
          message: "Mobile banner must be an image.",
        });
      }

      if (
        finalType === "video" &&
        !mobileFile.mimetype?.startsWith("video/")
      ) {
        return res.status(400).json({
          message: "Mobile banner must be a video.",
        });
      }
    }

    // --------------------------------------------------------
    // Validate productId
    // --------------------------------------------------------
    let finalProductId = heroBanner.productId;

    if (productId !== undefined) {
      if (
        productId === null ||
        productId === ""
      ) {
        finalProductId = null;
      } else {
        if (!isValidObjectId(productId)) {
          return res.status(400).json({
            message: "Invalid productId.",
          });
        }

        finalProductId = productId;
      }
    }

    // --------------------------------------------------------
    // Keep old Cloudinary references
    // --------------------------------------------------------
    const oldDesktopSrc =
      heroBanner.desktopSrc;

    const oldMobileSrc =
      heroBanner.mobileSrc;

    // --------------------------------------------------------
    // Upload new desktop banner if supplied
    // --------------------------------------------------------
    let newDesktopUpload = null;

    if (desktopFile) {
      newDesktopUpload =
        await uploadHeroFileToCloudinary(
          desktopFile
        );

      if (!newDesktopUpload?.url) {
        throw new Error(
          "Failed to upload desktop banner."
        );
      }

      uploadedCloudinaryAssets.push(
        newDesktopUpload
      );
    }

    // --------------------------------------------------------
    // Upload new mobile banner if supplied
    // --------------------------------------------------------
    let newMobileUpload = null;

    if (mobileFile) {
      newMobileUpload =
        await uploadHeroFileToCloudinary(
          mobileFile
        );

      if (!newMobileUpload?.url) {
        throw new Error(
          "Failed to upload mobile banner."
        );
      }

      uploadedCloudinaryAssets.push(
        newMobileUpload
      );
    }

    // --------------------------------------------------------
    // Update fields
    // --------------------------------------------------------
    if (title !== undefined) {
      heroBanner.title = String(title).trim();
    }

    if (description !== undefined) {
      heroBanner.description =
        String(description).trim();
    }

    if (category !== undefined) {
      heroBanner.category =
        String(category).trim() || "General";
    }

    heroBanner.type = finalType;

    if (alt !== undefined) {
      heroBanner.alt =
        String(alt).trim();
    }

    if (productId !== undefined) {
      heroBanner.productId =
        finalProductId;
    }

    if (productSlug !== undefined) {
      heroBanner.productSlug =
        String(productSlug).trim();
    }

    if (buttonText !== undefined) {
      heroBanner.buttonText =
        String(buttonText).trim() ||
        "Shop Now";
    }

    if (isActive !== undefined) {
      heroBanner.isActive =
        parseBoolean(
          isActive,
          heroBanner.isActive
        );
    }

    if (displayOrder !== undefined) {
      heroBanner.displayOrder =
        Number(displayOrder) || 0;
    }

    // --------------------------------------------------------
    // Replace desktop URL only when new file uploaded
    // --------------------------------------------------------
    if (newDesktopUpload?.url) {
      heroBanner.desktopSrc =
        newDesktopUpload.url;
    }

    // --------------------------------------------------------
    // Replace mobile URL only when new file uploaded
    // --------------------------------------------------------
    if (newMobileUpload?.url) {
      heroBanner.mobileSrc =
        newMobileUpload.url;
    }

    // --------------------------------------------------------
    // Save updated banner
    // --------------------------------------------------------
    await heroBanner.save();

    // --------------------------------------------------------
    // Delete old Cloudinary assets AFTER successful DB save
    // --------------------------------------------------------
    if (newDesktopUpload?.url) {
      const oldDesktopInfo =
        getCloudinaryResourceInfoFromUrl(
          oldDesktopSrc
        );

      await deleteCloudinaryAsset(
        oldDesktopInfo
      );
    }

    if (newMobileUpload?.url) {
      const oldMobileInfo =
        getCloudinaryResourceInfoFromUrl(
          oldMobileSrc
        );

      await deleteCloudinaryAsset(
        oldMobileInfo
      );
    }

    // --------------------------------------------------------
    // Response
    // --------------------------------------------------------
    return res.status(200).json({
      message:
        "Hero banner updated successfully.",
      heroBanner,
    });
  } catch (error) {
    // --------------------------------------------------------
    // If update fails, remove newly uploaded assets
    // --------------------------------------------------------
    await deleteCloudinaryAssets(
      uploadedCloudinaryAssets
    );

    console.error(
      "Update hero banner error:",
      error
    );

    return res.status(500).json({
      message:
        error?.message ||
        "Failed to update hero banner.",
    });
  }
};
// ============================================================
// DELETE HERO BANNER
// ============================================================
export const deleteHeroBanner = async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // Validate ID
    // --------------------------------------------------------
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid hero banner ID.",
      });
    }

    // --------------------------------------------------------
    // Find banner first
    // --------------------------------------------------------
    const heroBanner = await HeroBanner.findById(id);

    if (!heroBanner) {
      return res.status(404).json({
        message: "Hero banner not found.",
      });
    }

    // --------------------------------------------------------
    // Keep Cloudinary URLs before deleting MongoDB document
    // --------------------------------------------------------
    const desktopInfo =
      getCloudinaryResourceInfoFromUrl(
        heroBanner.desktopSrc
      );

    const mobileInfo =
      getCloudinaryResourceInfoFromUrl(
        heroBanner.mobileSrc
      );

    // --------------------------------------------------------
    // Delete MongoDB document
    // --------------------------------------------------------
    await HeroBanner.findByIdAndDelete(id);

    // --------------------------------------------------------
    // Delete desktop asset from Cloudinary
    // --------------------------------------------------------
    await deleteCloudinaryAsset(
      desktopInfo
    );

    // --------------------------------------------------------
    // Delete mobile asset from Cloudinary
    // --------------------------------------------------------
    await deleteCloudinaryAsset(
      mobileInfo
    );

    return res.status(200).json({
      message:
        "Hero banner deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete hero banner error:",
      error
    );

    return res.status(500).json({
      message:
        error?.message ||
        "Failed to delete hero banner.",
    });
  }
};


// ============================================================
// TOGGLE HERO BANNER
// ============================================================
export const toggleHeroBanner = async (req, res) => {
  try {
    const { id } = req.params;

    // --------------------------------------------------------
    // Validate ID
    // --------------------------------------------------------
    if (!isValidObjectId(id)) {
      return res.status(400).json({
        message: "Invalid hero banner ID.",
      });
    }

    // --------------------------------------------------------
    // Find banner
    // --------------------------------------------------------
    const heroBanner = await HeroBanner.findById(id);

    if (!heroBanner) {
      return res.status(404).json({
        message: "Hero banner not found.",
      });
    }

    // --------------------------------------------------------
    // Toggle active status
    // --------------------------------------------------------
    heroBanner.isActive =
      !heroBanner.isActive;

    await heroBanner.save();

    return res.status(200).json({
      message: heroBanner.isActive
        ? "Hero banner activated successfully."
        : "Hero banner deactivated successfully.",

      heroBanner,
    });
  } catch (error) {
    console.error(
      "Toggle hero banner error:",
      error
    );

    return res.status(500).json({
      message:
        error?.message ||
        "Failed to toggle hero banner.",
    });
  }
};