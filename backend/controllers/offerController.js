import mongoose from "mongoose";
import Offer from "../models/Offer.js";
import Product from "../models/Product.js";
import cloudinary from "../config/cloudinary.js";

/**
 * Validate MongoDB ObjectId
 */
const isValidObjectId = (id) => {
  return mongoose.Types.ObjectId.isValid(id);
};

/**
 * Convert products into an array
 *
 * FormData can send:
 * products=productId
 *
 * or:
 * products=productId1
 * products=productId2
 */
const normalizeProducts = (products) => {
  if (products === undefined || products === null) {
    return [];
  }

  if (Array.isArray(products)) {
    return products.filter(Boolean);
  }

  return [products].filter(Boolean);
};

/**
 * Validate product IDs
 */
const validateProductIds = (productIds = []) => {
  if (!Array.isArray(productIds) || productIds.length === 0) {
    return {
      valid: false,
      message: "At least one product must be selected",
    };
  }

  const invalidProductId = productIds.find(
    (productId) => !isValidObjectId(productId)
  );

  if (invalidProductId) {
    return {
      valid: false,
      message: `Invalid product ID: ${invalidProductId}`,
    };
  }

  return {
    valid: true,
  };
};

/**
 * Upload an image buffer to Cloudinary.
 *
 * offerUpload.js uses multer.memoryStorage(),
 * so uploaded files contain `buffer`.
 */
const uploadImageToCloudinary = (
  file,
  folder = "jihaan-cosmetics/offers"
) => {
  return new Promise((resolve, reject) => {
    if (!file?.buffer) {
      resolve("");
      return;
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "image",
      },
      (error, result) => {
        if (error) {
          reject(error);
          return;
        }

        if (!result?.secure_url) {
          reject(
            new Error(
              "Cloudinary did not return an image URL."
            )
          );
          return;
        }

        resolve({
          url: result.secure_url,
          publicId: result.public_id,
          resourceType: result.resource_type || "image",
        });
      }
    );

    uploadStream.end(file.buffer);
  });
};

/**
 * Extract Cloudinary resource information from a stored URL.
 *
 * Old local URLs such as:
 * /uploads/offers/offer-123.jpg
 *
 * are ignored safely.
 */
const getCloudinaryResourceInfoFromUrl = (imageUrl) => {
  if (
    !imageUrl ||
    typeof imageUrl !== "string" ||
    !imageUrl.includes("res.cloudinary.com")
  ) {
    return null;
  }

  try {
    const parsedUrl = new URL(imageUrl);

    const uploadIndex =
      parsedUrl.pathname.indexOf("/upload/");

    if (uploadIndex === -1) {
      return null;
    }

    let publicIdPath = parsedUrl.pathname.slice(
      uploadIndex + "/upload/".length
    );

    const pathParts = publicIdPath.split("/");

    /**
     * Remove Cloudinary transformation segments.
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

    publicIdPath = pathParts.join("/");

    /**
     * Remove version segment.
     *
     * Example:
     * v123456789/folder/image.jpg
     */
    if (/^v\d+$/.test(publicIdPath.split("/")[0])) {
      publicIdPath = publicIdPath
        .split("/")
        .slice(1)
        .join("/");
    }

    /**
     * Cloudinary public_id normally does not include
     * the file extension.
     */
    publicIdPath = publicIdPath.replace(
      /\.[^/.]+$/,
      ""
    );

    if (!publicIdPath) {
      return null;
    }

    return {
      publicId: publicIdPath,
      resourceType: parsedUrl.pathname.startsWith("/video/")
        ? "video"
        : "image",
    };
  } catch (error) {
    console.error(
      "CLOUDINARY URL PARSE ERROR:",
      error
    );

    return null;
  }
};

/**
 * Delete a Cloudinary asset.
 *
 * Old local /uploads URLs are ignored safely.
 */
const deleteCloudinaryAsset = async (imageUrl) => {
  const resourceInfo =
    getCloudinaryResourceInfoFromUrl(imageUrl);

  if (!resourceInfo) {
    return;
  }

  try {
    await cloudinary.uploader.destroy(
      resourceInfo.publicId,
      {
        resource_type: resourceInfo.resourceType,
        invalidate: true,
      }
    );
  } catch (error) {
    console.error(
      "CLOUDINARY DELETE ERROR:",
      resourceInfo.publicId,
      error.message
    );
  }
};

/**
 * Delete multiple Cloudinary assets.
 */
const deleteCloudinaryAssets = async (
  imageUrls = []
) => {
  const validUrls = imageUrls.filter(Boolean);

  if (validUrls.length === 0) {
    return;
  }

  await Promise.all(
    validUrls.map((imageUrl) =>
      deleteCloudinaryAsset(imageUrl)
    )
  );
};

/**
 * Get all active offers
 * Public API
 */
export const getOffers = async (req, res) => {
  try {
    const offers = await Offer.find({
      active: true,
    })
      .populate("products")
      .sort({
        sortOrder: 1,
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (error) {
    console.error(
      "GET OFFERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch offers",
      error: error.message,
    });
  }
};

/**
 * Get all offers
 * Admin API
 */
export const getAllOffers = async (req, res) => {
  try {
    const offers = await Offer.find()
      .populate("products")
      .sort({
        sortOrder: 1,
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: offers.length,
      offers,
    });
  } catch (error) {
    console.error(
      "GET ALL OFFERS ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch all offers",
      error: error.message,
    });
  }
};

/**
 * Get offer by ID
 */
export const getOfferById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer ID",
      });
    }

    const offer = await Offer.findById(id)
      .populate("products")
      .lean();

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    return res.status(200).json({
      success: true,
      offer,
    });
  } catch (error) {
    console.error(
      "GET OFFER BY ID ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch offer",
      error: error.message,
    });
  }
};
/**
 * Create offer
 */
export const createOffer = async (req, res) => {
  let uploadedImage = null;
  let uploadedDemoImage = null;

  try {
    console.log("CREATE OFFER BODY:", req.body);
    console.log("CREATE OFFER FILES:", {
      image: req.files?.image?.length || 0,
      demoImage: req.files?.demoImage?.length || 0,
    });

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Offer data is required",
      });
    }

    const products = normalizeProducts(req.body.products);

    const {
      name,
      brand,
      category,
      rating,
      reviews,
      oldPrice,
      price,
      discount,
      prepaidPrice,
      active,
      sortOrder,
    } = req.body;

    const productValidation = validateProductIds(products);

    if (!productValidation.valid) {
      return res.status(400).json({
        success: false,
        message: productValidation.message,
      });
    }

    const existingProducts = await Product.find({
      _id: { $in: products },
    }).select("_id");

    if (existingProducts.length !== products.length) {
      return res.status(404).json({
        success: false,
        message: "One or more selected products were not found",
      });
    }

    const numericOldPrice = Number(oldPrice);
    const numericPrice = Number(price);
    const numericPrepaidPrice = Number(prepaidPrice || 0);

    if (!Number.isFinite(numericOldPrice) || numericOldPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid old price",
      });
    }

    if (!Number.isFinite(numericPrice) || numericPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid offer price",
      });
    }

    if (numericPrice > numericOldPrice) {
      return res.status(400).json({
        success: false,
        message:
          "Offer price cannot be greater than the old price",
      });
    }

    if (
      numericPrepaidPrice < 0 ||
      numericPrepaidPrice > numericPrice
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Prepaid price cannot be greater than the offer price",
      });
    }

    const imageFile = req.files?.image?.[0];
    const demoImageFile = req.files?.demoImage?.[0];

    if (!imageFile) {
      return res.status(400).json({
        success: false,
        message: "Offer image is required",
      });
    }

    /**
     * Upload main offer image to Cloudinary.
     */
    uploadedImage = await uploadImageToCloudinary(imageFile);

    /**
     * Upload demo image if provided.
     */
    if (demoImageFile) {
      uploadedDemoImage =
        await uploadImageToCloudinary(demoImageFile);
    }

    const offer = await Offer.create({
      products,

      name,

      brand,

      category,

      rating: Number(rating || 0),

      reviews: Number(reviews || 0),

      oldPrice: numericOldPrice,

      price: numericPrice,

      discount,

      prepaidPrice: numericPrepaidPrice,

      image: uploadedImage.url,

      demoImage: uploadedDemoImage?.url || "",

      active:
        active === undefined
          ? true
          : active === "true" || active === true,

      sortOrder: Number(sortOrder || 0),
    });

    const populatedOffer = await Offer.findById(offer._id)
      .populate("products")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Offer created successfully",
      offer: populatedOffer,
    });
  } catch (error) {
    console.error("CREATE OFFER ERROR:", error);

    /**
     * If MongoDB creation fails after Cloudinary upload,
     * remove newly uploaded images.
     */
    await deleteCloudinaryAssets([
      uploadedImage?.url,
      uploadedDemoImage?.url,
    ]);

    return res.status(400).json({
      success: false,
      message: "Failed to create offer",
      error: error.message,
      validationErrors: error.errors || null,
    });
  }
};

/**
 * Update offer
 */
export const updateOffer = async (req, res) => {
  let uploadedImage = null;
  let uploadedDemoImage = null;

  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer ID",
      });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Update data is required",
      });
    }

    const currentOffer = await Offer.findById(id);

    if (!currentOffer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    const updateData = {
      ...req.body,
    };

    /**
     * Normalize and validate selected products.
     */
    if (updateData.products !== undefined) {
      const products = normalizeProducts(updateData.products);

      const productValidation =
        validateProductIds(products);

      if (!productValidation.valid) {
        return res.status(400).json({
          success: false,
          message: productValidation.message,
        });
      }

      const existingProducts = await Product.find({
        _id: { $in: products },
      }).select("_id");

      if (existingProducts.length !== products.length) {
        return res.status(404).json({
          success: false,
          message:
            "One or more selected products were not found",
        });
      }

      updateData.products = products;
    }

    /**
     * Validate final prices.
     */
    const finalOldPrice =
      updateData.oldPrice !== undefined
        ? Number(updateData.oldPrice)
        : currentOffer.oldPrice;

    const finalPrice =
      updateData.price !== undefined
        ? Number(updateData.price)
        : currentOffer.price;

    const finalPrepaidPrice =
      updateData.prepaidPrice !== undefined
        ? Number(updateData.prepaidPrice)
        : currentOffer.prepaidPrice;

    if (!Number.isFinite(finalOldPrice) || finalOldPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid old price",
      });
    }

    if (!Number.isFinite(finalPrice) || finalPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid offer price",
      });
    }

    if (finalPrice > finalOldPrice) {
      return res.status(400).json({
        success: false,
        message:
          "Offer price cannot be greater than the old price",
      });
    }

    if (
      !Number.isFinite(finalPrepaidPrice) ||
      finalPrepaidPrice < 0 ||
      finalPrepaidPrice > finalPrice
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Prepaid price cannot be greater than the offer price",
      });
    }

    /**
     * Convert numeric FormData values.
     */
    if (updateData.rating !== undefined) {
      updateData.rating = Number(updateData.rating);
    }

    if (updateData.reviews !== undefined) {
      updateData.reviews = Number(updateData.reviews);
    }

    if (updateData.oldPrice !== undefined) {
      updateData.oldPrice = finalOldPrice;
    }

    if (updateData.price !== undefined) {
      updateData.price = finalPrice;
    }

    if (updateData.prepaidPrice !== undefined) {
      updateData.prepaidPrice = finalPrepaidPrice;
    }

    if (updateData.sortOrder !== undefined) {
      updateData.sortOrder = Number(updateData.sortOrder);
    }

    if (updateData.active !== undefined) {
      updateData.active =
        updateData.active === true ||
        updateData.active === "true";
    }

    /**
     * Replace image only when a new image
     * has actually been uploaded.
     */
    const imageFile = req.files?.image?.[0];
    const demoImageFile = req.files?.demoImage?.[0];

    if (imageFile) {
      uploadedImage =
        await uploadImageToCloudinary(imageFile);

      updateData.image = uploadedImage.url;
    }

    if (demoImageFile) {
      uploadedDemoImage =
        await uploadImageToCloudinary(demoImageFile);

      updateData.demoImage = uploadedDemoImage.url;
    }

    const offer = await Offer.findByIdAndUpdate(
      id,
      {
        $set: updateData,
      },
      {
        new: true,
        runValidators: true,
        context: "query",
      }
    )
      .populate("products")
      .lean();

    if (!offer) {
      await deleteCloudinaryAssets([
        uploadedImage?.url,
        uploadedDemoImage?.url,
      ]);

      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    /**
     * Delete old images only after
     * MongoDB update succeeds.
     */
    const oldImagesToDelete = [];

    if (uploadedImage?.url && currentOffer.image) {
      oldImagesToDelete.push(currentOffer.image);
    }

    if (
      uploadedDemoImage?.url &&
      currentOffer.demoImage
    ) {
      oldImagesToDelete.push(
        currentOffer.demoImage
      );
    }

    await deleteCloudinaryAssets(
      oldImagesToDelete
    );

    return res.status(200).json({
      success: true,
      message: "Offer updated successfully",
      offer,
    });
  } catch (error) {
    console.error("UPDATE OFFER ERROR:", error);

    /**
     * Remove newly uploaded replacement images
     * if the update fails.
     */
    await deleteCloudinaryAssets([
      uploadedImage?.url,
      uploadedDemoImage?.url,
    ]);

    return res.status(400).json({
      success: false,
      message: "Failed to update offer",
      error: error.message,
      validationErrors: error.errors || null,
    });
  }
};
/**
 * Delete offer
 */
export const deleteOffer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer ID",
      });
    }

    /**
     * Find the offer first so we still have
     * the Cloudinary image URLs.
     */
    const offer = await Offer.findById(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    /**
     * Delete the MongoDB offer.
     */
    await Offer.findByIdAndDelete(id);

    /**
     * Delete associated Cloudinary images.
     *
     * If the offer contains an old local
     * /uploads/offers/... URL, the helper
     * safely ignores it.
     */
    await deleteCloudinaryAssets([
      offer.image,
      offer.demoImage,
    ]);

    return res.status(200).json({
      success: true,
      message: "Offer deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE OFFER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete offer",
      error: error.message,
    });
  }
};

/**
 * Toggle offer active status
 */
export const toggleOffer = async (req, res) => {
  try {
    const { id } = req.params;

    if (!isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid offer ID",
      });
    }

    const offer = await Offer.findById(id);

    if (!offer) {
      return res.status(404).json({
        success: false,
        message: "Offer not found",
      });
    }

    /**
     * Toggle active status.
     */
    offer.active = !offer.active;

    await offer.save();

    /**
     * Return the updated populated offer.
     */
    const updatedOffer = await Offer.findById(
      offer._id
    )
      .populate("products")
      .lean();

    return res.status(200).json({
      success: true,
      message: `Offer ${
        offer.active
          ? "activated"
          : "deactivated"
      } successfully`,
      offer: updatedOffer,
    });
  } catch (error) {
    console.error(
      "TOGGLE OFFER ERROR:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update offer status",
      error: error.message,
    });
  }
};