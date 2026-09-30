import mongoose from "mongoose";
import Product from "../models/Product.js";
import cloudinary from "../config/cloudinary.js";

const parseBoolean = (value, defaultValue = false) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  if (typeof value === "boolean") {
    return value;
  }
  return String(value).toLowerCase() === "true";
};

const parseNumber = (value, defaultValue = 0) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : defaultValue;
};

const parseArray = (value) => {
  if (value === undefined || value === null || value === "") {
    return [];
  }

  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean);
  }

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => String(item).trim())
        .filter(Boolean);
    }
  } catch {
  }

  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

const parseObject = (value, defaultValue = {}) => {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  if (typeof value === "object") {
    return value;
  }

  try {
    const parsed = JSON.parse(value);
    if (parsed && typeof parsed === "object") {
      return parsed;
    }
  } catch {
    return defaultValue;
  }

  return defaultValue;
};

const createSlug = (name) => {
  return String(name)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

const createUniqueSlug = async (name, currentId = null) => {
  const baseSlug = createSlug(name) || `product-${Date.now()}`;

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const query = {
      slug,
    };

    if (currentId) {
      query._id = {
        $ne: currentId,
      };
    }

    const existingProduct = await Product.findOne(query);

    if (!existingProduct) {
      return slug;
    }

    slug = `${baseSlug}-${counter}`;
    counter += 1;
  }
};

const calculatePrice = (
  oldPrice,
  discountType,
  discountValue
) => {
  if (discountType === "flat") {
    return Math.max(0, oldPrice - discountValue);
  }

  if (discountType === "percentage") {
    return Math.max(
      0,
      oldPrice - (oldPrice * discountValue) / 100
    );
  }

  return oldPrice;
};

const getUploadedFile = (files, fieldName) => {
  if (!files || !Array.isArray(files[fieldName])) {
    return null;
  }

  return files[fieldName][0] || null;
};

const uploadBufferToCloudinary = (
  buffer,
  { folder, resourceType = "image" } = {}
) => {
  return new Promise((resolve, reject) => {
    if (!buffer) {
      return reject(
        new Error("Upload buffer is missing.")
      );
    }

    const uploadStream =
      cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: resourceType,
          type: "upload",
          ...(resourceType === "image"
            ? {
                quality: "auto",
                fetch_format: "auto",
              }
            : {}),
        },
        (error, result) => {
          if (error) {
            return reject(error);
          }

          if (!result?.secure_url) {
            return reject(
              new Error(
                "Cloudinary did not return a secure URL."
              )
            );
          }

          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            resourceType: result.resource_type,
          });
        }
      );

    uploadStream.end(buffer);
  });
};

const uploadProductImage = async (
  file,
  fieldName
) => {
  if (!file?.buffer) {
    return "";
  }

  const uploaded =
    await uploadBufferToCloudinary(
      file.buffer,
      {
        folder:
          `jihaan-cosmetics/products/${fieldName}`,
        resourceType: "image",
      }
    );

  return uploaded.url;
};

const uploadProductVideo = async (file) => {
  if (!file?.buffer) {
    return "";
  }

  const uploaded =
    await uploadBufferToCloudinary(
      file.buffer,
      {
        folder:
          "jihaan-cosmetics/products/videos",
        resourceType: "video",
      }
    );

  return uploaded.url;
};

const getUploadedImages = async (files) => {
  if (!files || !Array.isArray(files.images)) {
    return [];
  }

  const uploadedImages =
    await Promise.all(
      files.images.map((file) =>
        uploadProductImage(file, "images")
      )
    );

  return uploadedImages.filter(Boolean);
};

const getUploadedImage = async (
  files,
  fieldName
) => {
  const file = getUploadedFile(
    files,
    fieldName
  );

  if (!file) {
    return "";
  }

  return uploadProductImage(
    file,
    fieldName
  );
};

const getUploadedVideo = async (files) => {
  const file = getUploadedFile(
    files,
    "video"
  );

  if (!file) {
    return "";
  }

  return uploadProductVideo(file);
};

const getCloudinaryResourceInfoFromUrl = (
  url
) => {
  if (!url || typeof url !== "string") {
    return null;
  }

  try {
    const parsedUrl = new URL(url);

    if (
      !parsedUrl.hostname.includes(
        "res.cloudinary.com"
      )
    ) {
      return null;
    }

    const parts = parsedUrl.pathname
      .split("/")
      .filter(Boolean);

    const uploadIndex =
      parts.indexOf("upload");

    if (uploadIndex < 1) {
      return null;
    }

    const resourceType =
      parts[uploadIndex - 1];

    if (
      resourceType !== "image" &&
      resourceType !== "video" &&
      resourceType !== "raw"
    ) {
      return null;
    }

    const afterUpload =
      parts.slice(uploadIndex + 1);

    if (afterUpload.length === 0) {
      return null;
    }

    const versionIndex =
      afterUpload.findIndex(
        (part) => /^v\d+$/.test(part)
      );

    if (versionIndex === -1) {
      return null;
    }

    const publicIdParts =
      afterUpload.slice(
        versionIndex + 1
      );

    if (publicIdParts.length === 0) {
      return null;
    }

    const lastIndex =
      publicIdParts.length - 1;

    publicIdParts[lastIndex] =
      publicIdParts[lastIndex].replace(
        /\.[^.]+$/,
        ""
      );

    return {
      publicId:
        publicIdParts.join("/"),
      resourceType,
    };
  } catch {
    return null;
  }
};

const deleteCloudinaryAsset = async (
  url
) => {
  const info =
    getCloudinaryResourceInfoFromUrl(
      url
    );

  if (!info) {
    return;
  }

  try {
    const result =
      await cloudinary.uploader.destroy(
        info.publicId,
        {
          resource_type:
            info.resourceType,
          type: "upload",
          invalidate: true,
        }
      );

    if (
      result?.result &&
      !["ok", "not found"].includes(
        result.result
      )
    ) {
      console.warn(
        `Cloudinary deletion returned "${result.result}" for ${info.publicId}`
      );
    }
  } catch (error) {
    console.error(
      "Cloudinary asset deletion failed:",
      info.publicId,
      error?.message || error
    );
  }
};

const deleteCloudinaryAssets = async (
  urls = []
) => {
  const uniqueUrls = [
    ...new Set(
      (Array.isArray(urls)
        ? urls
        : [urls]
      ).filter(Boolean)
    ),
  ];

  await Promise.all(
    uniqueUrls.map((url) =>
      deleteCloudinaryAsset(url)
    )
  );
};

const normalizeDiscountType = (
  value
) => {
  const allowedTypes = [
    "none",
    "flat",
    "percentage",
  ];

  return allowedTypes.includes(value)
    ? value
    : "none";
};

const normalizeOffer = (
  value = {}
) => {
  const offer = parseObject(
    value,
    {}
  );

  const discountType =
    normalizeDiscountType(
      offer.discountType
    );

  let discountValue =
    parseNumber(
      offer.discountValue
    );

  if (discountValue < 0) {
    discountValue = 0;
  }

  if (
    discountType ===
      "percentage" &&
    discountValue > 100
  ) {
    discountValue = 100;
  }

  return {
    enabled: parseBoolean(
      offer.enabled,
      false
    ),
    title: String(
      offer.title || ""
    ).trim(),
    description: String(
      offer.description || ""
    ).trim(),
    badge: String(
      offer.badge || ""
    ).trim(),
    discountType,
    discountValue,
    startDate:
      offer.startDate || null,
    endDate:
      offer.endDate || null,
    active: parseBoolean(
      offer.active,
      true
    ),
  };
};

const validateOffer = (
  offer
) => {
  if (!offer.enabled) {
    return null;
  }

  if (
    ![
      "none",
      "flat",
      "percentage",
    ].includes(
      offer.discountType
    )
  ) {
    return "Invalid offer discount type.";
  }

  if (
    offer.discountValue < 0
  ) {
    return "Offer discount value cannot be negative.";
  }

  if (
    offer.discountType ===
      "percentage" &&
    offer.discountValue > 100
  ) {
    return "Offer percentage discount cannot exceed 100.";
  }

  if (
    offer.startDate &&
    offer.endDate &&
    new Date(
      offer.startDate
    ) >
      new Date(
        offer.endDate
      )
  ) {
    return "Offer start date cannot be after the end date.";
  }

  return null;
};

const getProductType = (
  isNewArrival,
  isBestseller
) => {
  if (isNewArrival) {
    return "new-arrival";
  }

  if (isBestseller) {
    return "bestseller";
  }

  return "regular";
};

const calculateProductRating = (
  reviewList = []
) => {
  if (
    !Array.isArray(
      reviewList
    ) ||
    reviewList.length === 0
  ) {
    return {
      rating: 0,
      reviews: 0,
    };
  }

  const totalRating =
    reviewList.reduce(
      (sum, review) =>
        sum +
        Number(
          review.rating || 0
        ),
      0
    );

  return {
    rating: Number(
      (
        totalRating /
        reviewList.length
      ).toFixed(1)
    ),
    reviews:
      reviewList.length,
  };
};

export const getProducts = async (
  req,
  res
) => {
  try {
    const {
      category,
      subcategory,
      brand,
      search,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      sort = "newest",
    } = req.query;

    const query = {
      active: true,
    };

    if (
      category &&
      String(category).trim()
    ) {
      query.category = {
        $regex:
          `^${String(
            category
          ).trim()}$`,
        $options: "i",
      };
    }

    if (
      subcategory &&
      String(subcategory).trim()
    ) {
      query.subcategory = {
        $regex:
          `^${String(
            subcategory
          ).trim()}$`,
        $options: "i",
      };
    }

    if (
      brand &&
      String(brand).trim()
    ) {
      query.brand = {
        $regex:
          `^${String(
            brand
          ).trim()}$`,
        $options: "i",
      };
    }

    if (
      search &&
      String(search).trim()
    ) {
      const searchRegex = {
        $regex:
          String(search).trim(),
        $options: "i",
      };

      query.$or = [
        { name: searchRegex },
        { brand: searchRegex },
        { category: searchRegex },
        {
          subcategory:
            searchRegex,
        },
        {
          description:
            searchRegex,
        },
        { tags: searchRegex },
      ];
    }

    const priceFilter = {};

    if (
      minPrice !== undefined &&
      minPrice !== ""
    ) {
      const minimumPrice =
        Number(minPrice);

      if (
        Number.isFinite(
          minimumPrice
        ) &&
        minimumPrice >= 0
      ) {
        priceFilter.$gte =
          minimumPrice;
      }
    }

    if (
      maxPrice !== undefined &&
      maxPrice !== ""
    ) {
      const maximumPrice =
        Number(maxPrice);

      if (
        Number.isFinite(
          maximumPrice
        ) &&
        maximumPrice >= 0
      ) {
        priceFilter.$lte =
          maximumPrice;
      }
    }

    if (
      Object.keys(
        priceFilter
      ).length > 0
    ) {
      query.price =
        priceFilter;
    }

    if (
      minRating !== undefined &&
      minRating !== ""
    ) {
      const minimumRating =
        Number(minRating);

      if (
        Number.isFinite(
          minimumRating
        ) &&
        minimumRating >= 0 &&
        minimumRating <= 5
      ) {
        query.rating = {
          $gte: minimumRating,
        };
      }
    }

    if (
      String(inStock)
        .toLowerCase() ===
      "true"
    ) {
      query.stock = {
        $gt: 0,
      };
    }

    let sortOption = {
      createdAt: -1,
    };

    switch (
      String(sort).toLowerCase()
    ) {
      case "oldest":
        sortOption = {
          createdAt: 1,
        };
        break;

      case "price-low":
        sortOption = {
          price: 1,
          createdAt: -1,
        };
        break;

      case "price-high":
        sortOption = {
          price: -1,
          createdAt: -1,
        };
        break;

      case "rating":
        sortOption = {
          rating: -1,
          reviews: -1,
          createdAt: -1,
        };
        break;

      case "popular":
        sortOption = {
          reviews: -1,
          rating: -1,
          createdAt: -1,
        };
        break;

      case "newest":
      default:
        sortOption = {
          createdAt: -1,
        };
        break;
    }

    const products =
      await Product.find(query)
        .sort(sortOption)
        .lean();

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error(
      "Get products error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to fetch products.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};

export const getAllProducts =
  async (
    req,
    res
  ) => {
    try {
      const products =
        await Product.find({})
          .sort({
            createdAt: -1,
          })
          .lean();

      return res
        .status(200)
        .json({
          success: true,
          count:
            products.length,
          products,
        });
    } catch (error) {
      console.error(
        "Get all products error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to fetch products.",
          error:
            process.env.NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        });
    }
  };

export const getNewArrivals =
  async (
    req,
    res
  ) => {
    try {
      const products =
        await Product.find({
          active: true,
          isNewArrival:
            true,
        })
          .sort({
            createdAt: -1,
          })
          .lean();

      return res
        .status(200)
        .json({
          success: true,
          count:
            products.length,
          products,
        });
    } catch (error) {
      console.error(
        "Get new arrivals error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to fetch new arrivals.",
          error:
            process.env.NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        });
    }
  };

export const getBestsellers =
  async (
    req,
    res
  ) => {
    try {
      const products =
        await Product.find({
          active: true,
          isBestseller:
            true,
        })
          .sort({
            reviews: -1,
            rating: -1,
            createdAt: -1,
          })
          .lean();

      return res
        .status(200)
        .json({
          success: true,
          count:
            products.length,
          products,
        });
    } catch (error) {
      console.error(
        "Get bestsellers error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to fetch bestsellers.",
          error:
            process.env.NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        });
    }
  };

export const getProductBySlug =
  async (
    req,
    res
  ) => {
    try {
      const { slug } =
        req.params;

      if (!slug) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Product slug is required.",
          });
      }

      const product =
        await Product.findOne({
          slug,
          active: true,
        }).lean();

      if (!product) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Product not found.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          product,
        });
    } catch (error) {
      console.error(
        "Get product by slug error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to fetch product.",
          error:
            process.env.NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        });
    }
  };

export const getProductById =
  async (
    req,
    res
  ) => {
    try {
      const { id } =
        req.params;

      if (
        !mongoose.Types.ObjectId.isValid(
          id
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid product ID.",
          });
      }

      const product =
        await Product.findOne({
          _id: id,
          active: true,
        }).lean();

      if (!product) {
        return res
          .status(404)
          .json({
            success: false,
            message:
              "Product not found.",
          });
      }

      return res
        .status(200)
        .json({
          success: true,
          product,
        });
    } catch (error) {
      console.error(
        "Get product by ID error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Failed to fetch product.",
          error:
            process.env.NODE_ENV ===
            "development"
              ? error.message
              : undefined,
        });
    }
  };
  export const getProductReviews = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findById(id)
      .select("reviewList rating reviews")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const reviewList = Array.isArray(product.reviewList)
      ? product.reviewList
      : [];

    return res.status(200).json({
      success: true,
      reviews: reviewList,
      rating: Number(product.rating || 0),
      reviewCount: Number(
        product.reviews || reviewList.length || 0
      ),
    });
  } catch (error) {
    console.error("Get product reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product reviews.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

export const addProductReview = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const {
      name,
      rating,
      comment,
    } = req.body;

    const reviewerName = String(name || "").trim();
    const reviewComment = String(comment || "").trim();
    const reviewRating = Number(rating);

    if (!reviewerName) {
      return res.status(400).json({
        success: false,
        message: "Reviewer name is required.",
      });
    }

    if (!reviewComment) {
      return res.status(400).json({
        success: false,
        message: "Review comment is required.",
      });
    }

    if (
      !Number.isFinite(reviewRating) ||
      reviewRating < 1 ||
      reviewRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5.",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    if (!Array.isArray(product.reviewList)) {
      product.reviewList = [];
    }

    product.reviewList.push({
      name: reviewerName,
      rating: reviewRating,
      comment: reviewComment,
      createdAt: new Date(),
    });

    const ratingData = calculateProductRating(
      product.reviewList
    );

    product.rating = ratingData.rating;
    product.reviews = ratingData.reviews;

    await product.save();

    return res.status(201).json({
      success: true,
      message: "Review added successfully.",
      review:
        product.reviewList[
          product.reviewList.length - 1
        ],
      rating: product.rating,
      reviewCount: product.reviews,
    });
  } catch (error) {
    console.error("Add product review error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to add product review.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

export const deleteProductReview = async (req, res) => {
  try {
    const {
      id,
      reviewId,
    } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(reviewId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid review ID.",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    if (!Array.isArray(product.reviewList)) {
      product.reviewList = [];
    }

    const reviewIndex = product.reviewList.findIndex(
      (review) =>
        String(review._id) === String(reviewId)
    );

    if (reviewIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Review not found.",
      });
    }

    product.reviewList.splice(reviewIndex, 1);

    const ratingData = calculateProductRating(
      product.reviewList
    );

    product.rating = ratingData.rating;
    product.reviews = ratingData.reviews;

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully.",
      rating: product.rating,
      reviewCount: product.reviews,
    });
  } catch (error) {
    console.error(
      "Delete product review error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete product review.",
      error:
        process.env.NODE_ENV === "development"
          ? error.message
          : undefined,
    });
  }
};

export const createProduct = async (req, res) => {
  try {
    console.log("Product body:", req.body);
    console.log("Product files:", req.files);

    const name = String(req.body.name || "").trim();
    const brand = String(req.body.brand || "").trim();
    const category = String(req.body.category || "").trim();
    const subcategory = String(
      req.body.subcategory || ""
    ).trim();

    const description = String(
      req.body.description || ""
    ).trim();

    const howToUse = String(
      req.body.howToUse || ""
    ).trim();

    const ingredients = String(
      req.body.ingredients || ""
    ).trim();

    const additionalDetails = String(
      req.body.additionalDetails || ""
    ).trim();

    const benefits = String(
      req.body.benefits || ""
    ).trim();

    const composition = String(
      req.body.composition || ""
    ).trim();

    const youtubeVideoUrl = String(
      req.body.youtubeVideoUrl || ""
    ).trim();

    const oldPrice = parseNumber(
      req.body.oldPrice
    );

    const discountType = normalizeDiscountType(
      req.body.discountType || "none"
    );

    const discountValue = parseNumber(
      req.body.discountValue
    );

    const stock = parseNumber(
      req.body.stock
    );

    const active = parseBoolean(
      req.body.active,
      true
    );

    const isNewArrival = parseBoolean(
      req.body.isNewArrival,
      false
    );

    const isBestseller = parseBoolean(
      req.body.isBestseller,
      false
    );

    const newArrivalSortOrder = parseNumber(
      req.body.newArrivalSortOrder,
      0
    );

    const bestSellerSortOrder = parseNumber(
      req.body.bestSellerSortOrder,
      0
    );

    const tags = parseArray(req.body.tags);
    const shades = parseArray(req.body.shades);

    const offer = normalizeOffer(
      req.body.offer
    );

    const offerError = validateOffer(offer);

    if (!name) {
      return res.status(400).json({
        success: false,
        message: "Product name is required.",
      });
    }

    if (!brand) {
      return res.status(400).json({
        success: false,
        message: "Brand is required.",
      });
    }

    if (!category) {
      return res.status(400).json({
        success: false,
        message: "Category is required.",
      });
    }

    if (oldPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Original price cannot be negative.",
      });
    }

    if (discountValue < 0) {
      return res.status(400).json({
        success: false,
        message: "Discount value cannot be negative.",
      });
    }

    if (
      discountType === "percentage" &&
      discountValue > 100
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Percentage discount cannot exceed 100.",
      });
    }

    if (stock < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock cannot be negative.",
      });
    }

    if (
      newArrivalSortOrder < 0 ||
      bestSellerSortOrder < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Sort order cannot be negative.",
      });
    }

    if (offerError) {
      return res.status(400).json({
        success: false,
        message: offerError,
      });
    }

    const images = await getUploadedImages(
      req.files
    );

    if (images.length === 0) {
      return res.status(400).json({
        success: false,
        message:
          "At least one product image is required.",
      });
    }

    const hoverImage = await getUploadedImage(
      req.files,
      "hoverImage"
    );

    const beforeImage = await getUploadedImage(
      req.files,
      "beforeImage"
    );

    const afterImage = await getUploadedImage(
      req.files,
      "afterImage"
    );

    const video = await getUploadedVideo(
      req.files
    );

    const price = calculatePrice(
      oldPrice,
      discountType,
      discountValue
    );

    const slug = await createUniqueSlug(name);

    const productType = getProductType(
      isNewArrival,
      isBestseller
    );

    const product = await Product.create({
      name,
      slug,
      brand,
      category,
      subcategory,
      description,
      howToUse,
      ingredients,
      additionalDetails,
      benefits,
      composition,
      tags,
      price,
      oldPrice,
      discountType,
      discountValue,
      images,
      hoverImage,
      beforeImage,
      afterImage,
      video,
      youtubeVideoUrl,
      shades,
      active,
      stock,
      isNewArrival,
      newArrivalSortOrder,
      isBestseller,
      bestSellerSortOrder,
      productType,
      offer,
      rating: 0,
      reviews: 0,
      reviewList: [],
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error(
      "Create product error:",
      error
    );

    return res.status(400).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};
export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found.",
      });
    }

    const removedImages = parseArray(
      req.body.removedImages
    );

    const removeHoverImage = parseBoolean(
      req.body.removeHoverImage,
      false
    );

    const removeBeforeImage = parseBoolean(
      req.body.removeBeforeImage,
      false
    );

    const removeAfterImage = parseBoolean(
      req.body.removeAfterImage,
      false
    );

    const removeVideo = parseBoolean(
      req.body.removeVideo,
      false
    );

    const cloudinaryAssetsToDelete = [];

    if (removedImages.length > 0) {
      cloudinaryAssetsToDelete.push(
        ...removedImages
      );
    }

    if (
      removeHoverImage &&
      product.hoverImage
    ) {
      cloudinaryAssetsToDelete.push(
        product.hoverImage
      );
    }

    if (
      removeBeforeImage &&
      product.beforeImage
    ) {
      cloudinaryAssetsToDelete.push(
        product.beforeImage
      );
    }

    if (
      removeAfterImage &&
      product.afterImage
    ) {
      cloudinaryAssetsToDelete.push(
        product.afterImage
      );
    }

    if (
      removeVideo &&
      product.video
    ) {
      cloudinaryAssetsToDelete.push(
        product.video
      );
    }

    const remainingImages =
      Array.isArray(product.images)
        ? product.images.filter(
            (image) =>
              !removedImages.includes(image)
          )
        : [];

    if (req.body.name !== undefined) {
      product.name = String(
        req.body.name
      ).trim();
    }

    if (req.body.brand !== undefined) {
      product.brand = String(
        req.body.brand
      ).trim();
    }

    if (req.body.category !== undefined) {
      product.category = String(
        req.body.category
      ).trim();
    }

    if (
      req.body.subcategory !== undefined
    ) {
      product.subcategory = String(
        req.body.subcategory
      ).trim();
    }

    if (
      req.body.description !== undefined
    ) {
      product.description = String(
        req.body.description
      ).trim();
    }

    if (
      req.body.howToUse !== undefined
    ) {
      product.howToUse = String(
        req.body.howToUse
      ).trim();
    }

    if (
      req.body.ingredients !== undefined
    ) {
      product.ingredients = String(
        req.body.ingredients
      ).trim();
    }

    if (
      req.body.additionalDetails !==
      undefined
    ) {
      product.additionalDetails =
        String(
          req.body.additionalDetails
        ).trim();
    }

    if (
      req.body.benefits !== undefined
    ) {
      product.benefits = String(
        req.body.benefits
      ).trim();
    }

    if (
      req.body.composition !== undefined
    ) {
      product.composition = String(
        req.body.composition
      ).trim();
    }

    if (
      req.body.youtubeVideoUrl !==
      undefined
    ) {
      product.youtubeVideoUrl =
        String(
          req.body.youtubeVideoUrl
        ).trim();
    }

    if (req.body.tags !== undefined) {
      product.tags = parseArray(
        req.body.tags
      );
    }

    if (req.body.shades !== undefined) {
      product.shades = parseArray(
        req.body.shades
      );
    }

    if (req.body.active !== undefined) {
      product.active = parseBoolean(
        req.body.active,
        product.active
      );
    }

    if (req.body.stock !== undefined) {
      const stock = parseNumber(
        req.body.stock,
        product.stock
      );

      if (stock < 0) {
        return res.status(400).json({
          success: false,
          message:
            "Stock cannot be negative.",
        });
      }

      product.stock = stock;
    }

    if (
      req.body.isNewArrival !== undefined
    ) {
      product.isNewArrival =
        parseBoolean(
          req.body.isNewArrival,
          product.isNewArrival
        );
    }

    if (
      req.body.isBestseller !== undefined
    ) {
      product.isBestseller =
        parseBoolean(
          req.body.isBestseller,
          product.isBestseller
        );
    }

    if (
      req.body.newArrivalSortOrder !==
      undefined
    ) {
      product.newArrivalSortOrder =
        parseNumber(
          req.body.newArrivalSortOrder,
          product.newArrivalSortOrder
        );
    }

    if (
      req.body.bestSellerSortOrder !==
      undefined
    ) {
      product.bestSellerSortOrder =
        parseNumber(
          req.body.bestSellerSortOrder,
          product.bestSellerSortOrder
        );
    }

    if (
      req.body.discountType !==
      undefined
    ) {
      product.discountType =
        normalizeDiscountType(
          req.body.discountType
        );
    }

    if (
      req.body.discountValue !==
      undefined
    ) {
      product.discountValue =
        parseNumber(
          req.body.discountValue,
          product.discountValue
        );
    }

    if (
      req.body.oldPrice !== undefined
    ) {
      product.oldPrice = parseNumber(
        req.body.oldPrice,
        product.oldPrice
      );
    }

    product.price = calculatePrice(
      product.oldPrice,
      product.discountType,
      product.discountValue
    );

    product.productType = getProductType(
      product.isNewArrival,
      product.isBestseller
    );

    if (req.body.offer !== undefined) {
      const offer = normalizeOffer(
        req.body.offer
      );

      const offerError =
        validateOffer(offer);

      if (offerError) {
        return res.status(400).json({
          success: false,
          message: offerError,
        });
      }

      product.offer = offer;
    }

    const newImages =
      await getUploadedImages(
        req.files
      );

    const newHoverImage =
      await getUploadedImage(
        req.files,
        "hoverImage"
      );

    const newBeforeImage =
      await getUploadedImage(
        req.files,
        "beforeImage"
      );

    const newAfterImage =
      await getUploadedImage(
        req.files,
        "afterImage"
      );

    const newVideo =
      await getUploadedVideo(
        req.files
      );

    if (newImages.length > 0) {
      product.images = [
        ...remainingImages,
        ...newImages,
      ];
    } else {
      product.images = remainingImages;
    }

    if (newHoverImage) {
      product.hoverImage =
        newHoverImage;
    } else if (removeHoverImage) {
      product.hoverImage = "";
    }

    if (newBeforeImage) {
      product.beforeImage =
        newBeforeImage;
    } else if (removeBeforeImage) {
      product.beforeImage = "";
    }

    if (newAfterImage) {
      product.afterImage =
        newAfterImage;
    } else if (removeAfterImage) {
      product.afterImage = "";
    }

    if (newVideo) {
      product.video = newVideo;
    } else if (removeVideo) {
      product.video = "";
    }

    if (
      !Array.isArray(product.images) ||
      product.images.length === 0
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product must have at least one image.",
      });
    }

    await product.save();

    await deleteCloudinaryAssets(
      cloudinaryAssetsToDelete
    );

    return res.status(200).json({
      success: true,
      message:
        "Product updated successfully.",
      product,
    });
  } catch (error) {
    console.error(
      "Update product error:",
      error
    );

    return res.status(400).json({
      success: false,
      message:
        "Failed to update product.",
      error: error.message,
    });
  }
};


export const deleteProduct = async (
  req,
  res
) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID.",
      });
    }

    const product =
      await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message:
          "Product not found.",
      });
    }

    const cloudinaryAssetsToDelete = [
      ...(Array.isArray(product.images)
        ? product.images
        : []),
      product.hoverImage,
      product.beforeImage,
      product.afterImage,
      product.video,
    ].filter(Boolean);

    await Product.findByIdAndDelete(id);

    await deleteCloudinaryAssets(
      cloudinaryAssetsToDelete
    );

    return res.status(200).json({
      success: true,
      message:
        "Product deleted successfully.",
    });
  } catch (error) {
    console.error(
      "Delete product error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to delete product.",
      error:
        process.env.NODE_ENV ===
        "development"
          ? error.message
          : undefined,
    });
  }
};