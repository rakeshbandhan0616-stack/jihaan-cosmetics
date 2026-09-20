import mongoose from "mongoose";
import Product from "../models/Product.js";

// --------------------------------------------------
// Utility helpers
// --------------------------------------------------

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
    // Continue with comma-separated text
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

const getUploadedImages = (files) => {
  if (!files || !Array.isArray(files.images)) {
    return [];
  }

  return files.images.map(
    (file) => `/uploads/products/images/${file.filename}`
  );
};

const getUploadedImage = (files, fieldName) => {
  const file = getUploadedFile(files, fieldName);

  if (!file) {
    return "";
  }

  return `/uploads/products/images/${file.filename}`;
};

const getUploadedVideo = (files) => {
  const file = getUploadedFile(files, "video");

  if (!file) {
    return "";
  }

  return `/uploads/products/videos/${file.filename}`;
};

const normalizeDiscountType = (value) => {
  const allowedTypes = [
    "none",
    "flat",
    "percentage",
  ];

  return allowedTypes.includes(value) ? value : "none";
};

const normalizeOffer = (value = {}) => {
  const offer = parseObject(value, {});

  const discountType = normalizeDiscountType(
    offer.discountType
  );

  let discountValue = parseNumber(
    offer.discountValue
  );

  if (discountValue < 0) {
    discountValue = 0;
  }

  if (
    discountType === "percentage" &&
    discountValue > 100
  ) {
    discountValue = 100;
  }

  return {
    enabled: parseBoolean(offer.enabled, false),
    title: String(offer.title || "").trim(),
    description: String(offer.description || "").trim(),
    badge: String(offer.badge || "").trim(),
    discountType,
    discountValue,
    startDate: offer.startDate || null,
    endDate: offer.endDate || null,
    active: parseBoolean(offer.active, true),
  };
};

const validateOffer = (offer) => {
  if (!offer.enabled) {
    return null;
  }

  if (
    !["none", "flat", "percentage"].includes(
      offer.discountType
    )
  ) {
    return "Invalid offer discount type.";
  }

  if (offer.discountValue < 0) {
    return "Offer discount value cannot be negative.";
  }

  if (
    offer.discountType === "percentage" &&
    offer.discountValue > 100
  ) {
    return "Offer percentage discount cannot exceed 100.";
  }

  if (
    offer.startDate &&
    offer.endDate &&
    new Date(offer.startDate) > new Date(offer.endDate)
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

// --------------------------------------------------
// Review and rating helpers
// --------------------------------------------------

const calculateProductRating = (reviewList = []) => {
  if (
    !Array.isArray(reviewList) ||
    reviewList.length === 0
  ) {
    return {
      rating: 0,
      reviews: 0,
    };
  }

  const totalRating = reviewList.reduce(
    (sum, review) =>
      sum + Number(review.rating || 0),
    0
  );

  return {
    rating: Number(
      (totalRating / reviewList.length).toFixed(1)
    ),
    reviews: reviewList.length,
  };
};

// --------------------------------------------------
// Get active products with filters
// GET /api/products
//
// Supported query parameters:
//
// ?category=Beauty
// ?subcategory=Face Wash
// ?brand=Lakme
// ?search=lipstick
// ?minPrice=300
// ?maxPrice=1500
// ?minRating=4
// ?inStock=true
// ?sort=newest
// ?sort=oldest
// ?sort=price-low
// ?sort=price-high
// ?sort=rating
// ?sort=popular
// --------------------------------------------------

export const getProducts = async (req, res) => {
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

    // --------------------------------------------------
    // Category filter
    // --------------------------------------------------

    if (category && String(category).trim()) {
      query.category = {
        $regex: `^${String(category).trim()}$`,
        $options: "i",
      };
    }

    // --------------------------------------------------
    // Subcategory filter
    // --------------------------------------------------

    if (
      subcategory &&
      String(subcategory).trim()
    ) {
      query.subcategory = {
        $regex: `^${String(subcategory).trim()}$`,
        $options: "i",
      };
    }

    // --------------------------------------------------
    // Brand filter
    // --------------------------------------------------

    if (brand && String(brand).trim()) {
      query.brand = {
        $regex: `^${String(brand).trim()}$`,
        $options: "i",
      };
    }

    // --------------------------------------------------
    // Search filter
    // --------------------------------------------------

    if (search && String(search).trim()) {
      const searchRegex = {
        $regex: String(search).trim(),
        $options: "i",
      };

      query.$or = [
        {
          name: searchRegex,
        },
        {
          brand: searchRegex,
        },
        {
          category: searchRegex,
        },
        {
          subcategory: searchRegex,
        },
        {
          description: searchRegex,
        },
        {
          tags: searchRegex,
        },
      ];
    }

    // --------------------------------------------------
    // Price filters
    // --------------------------------------------------

    const priceFilter = {};

    if (
      minPrice !== undefined &&
      minPrice !== ""
    ) {
      const minimumPrice = Number(minPrice);

      if (
        Number.isFinite(minimumPrice) &&
        minimumPrice >= 0
      ) {
        priceFilter.$gte = minimumPrice;
      }
    }

    if (
      maxPrice !== undefined &&
      maxPrice !== ""
    ) {
      const maximumPrice = Number(maxPrice);

      if (
        Number.isFinite(maximumPrice) &&
        maximumPrice >= 0
      ) {
        priceFilter.$lte = maximumPrice;
      }
    }

    if (Object.keys(priceFilter).length > 0) {
      query.price = priceFilter;
    }

    // --------------------------------------------------
    // Minimum rating filter
    // --------------------------------------------------

    if (
      minRating !== undefined &&
      minRating !== ""
    ) {
      const minimumRating = Number(minRating);

      if (
        Number.isFinite(minimumRating) &&
        minimumRating >= 0 &&
        minimumRating <= 5
      ) {
        query.rating = {
          $gte: minimumRating,
        };
      }
    }

    // --------------------------------------------------
    // In-stock filter
    // --------------------------------------------------

    if (
      String(inStock).toLowerCase() === "true"
    ) {
      query.stock = {
        $gt: 0,
      };
    }

    // --------------------------------------------------
    // Sorting
    // --------------------------------------------------

    let sortOption = {
      createdAt: -1,
    };

    switch (String(sort).toLowerCase()) {
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

    // --------------------------------------------------
    // Fetch products
    // --------------------------------------------------

    const products = await Product.find(query).sort(
      sortOption
    );

    return res.status(200).json({
      success: true,
      count: products.length,
      filters: {
        category: category || "",
        subcategory: subcategory || "",
        brand: brand || "",
        search: search || "",
        minPrice: minPrice || "",
        maxPrice: maxPrice || "",
        minRating: minRating || "",
        inStock: inStock || "",
        sort,
      },
      products,
    });
  } catch (error) {
    console.error("Get products error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch products",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Get all products for admin
// GET /api/products/admin
// --------------------------------------------------

export const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find().sort({
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error(
      "Get all products error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch all products",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Get New Arrivals
// GET /api/products/new-arrivals
// --------------------------------------------------

export const getNewArrivals = async (req, res) => {
  try {
    const products = await Product.find({
      active: true,
      isNewArrival: true,
    }).sort({
      newArrivalSortOrder: 1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error(
      "Get new arrivals error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch new arrivals",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Get Best Sellers
// GET /api/products/bestsellers
// --------------------------------------------------

export const getBestsellers = async (req, res) => {
  try {
    const products = await Product.find({
      active: true,
      isBestseller: true,
    }).sort({
      bestSellerSortOrder: 1,
      rating: -1,
      reviews: -1,
      createdAt: -1,
    });

    return res.status(200).json({
      success: true,
      count: products.length,
      products,
    });
  } catch (error) {
    console.error(
      "Get bestsellers error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch bestsellers",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Get product by slug
// GET /api/products/slug/:slug
// --------------------------------------------------

export const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      active: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error(
      "Get product by slug error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Get product by MongoDB ID
// GET /api/products/:id
// --------------------------------------------------

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;

    if (
      !id ||
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findOne({
      _id: id,
      active: true,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
    });
  } catch (error) {
    console.error(
      "Get product by ID error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Get product reviews
// GET /api/products/:id/reviews
// --------------------------------------------------

export const getProductReviews = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id).select(
      "rating reviews reviewList"
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const reviewList = Array.isArray(
      product.reviewList
    )
      ? [...product.reviewList].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        )
      : [];

    return res.status(200).json({
      success: true,
      rating: product.rating || 0,
      reviews: product.reviews || 0,
      reviewList,
    });
  } catch (error) {
    console.error(
      "Get product reviews error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product reviews",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Add product review
// POST /api/products/:id/reviews
// --------------------------------------------------

export const addProductReview = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      rating,
      comment,
    } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    if (!name || !email || !rating || !comment) {
      return res.status(400).json({
        success: false,
        message:
          "Name, email, rating and comment are required",
      });
    }

    const numericRating = Number(rating);

    if (
      !Number.isFinite(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        success: false,
        message: "Rating must be between 1 and 5",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!Array.isArray(product.reviewList)) {
      product.reviewList = [];
    }

    product.reviewList.push({
      name: String(name).trim(),
      email: String(email).trim().toLowerCase(),
      rating: numericRating,
      comment: String(comment).trim(),
      createdAt: new Date(),
    });

    const ratingData = calculateProductRating(
      product.reviewList
    );

    product.rating = ratingData.rating;
    product.reviews = ratingData.reviews;

    await product.save();

    const savedReview =
      product.reviewList[
        product.reviewList.length - 1
      ];

    return res.status(201).json({
      success: true,
      message: "Review submitted successfully",
      rating: product.rating,
      reviews: product.reviews,
      review: savedReview,
    });
  } catch (error) {
    console.error(
      "Add product review error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to submit review",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Delete product review
// DELETE /api/products/:id/reviews/:reviewId
// --------------------------------------------------

export const deleteProductReview = async (
  req,
  res
) => {
  try {
    const { id, reviewId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(id) ||
      !mongoose.Types.ObjectId.isValid(reviewId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID or review ID",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    if (!Array.isArray(product.reviewList)) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    const reviewIndex = product.reviewList.findIndex(
      (review) =>
        String(review._id) === String(reviewId)
    );

    if (reviewIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
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
      message: "Review deleted successfully",
      rating: product.rating,
      reviews: product.reviews,
      reviewList: product.reviewList,
    });
  } catch (error) {
    console.error(
      "Delete product review error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Failed to delete review",
      error: error.message,
    });
  }
};
// --------------------------------------------------
// Create product
// POST /api/products
// --------------------------------------------------

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      brand,
      category,
      subcategory = "",
      oldPrice,
      discountType = "none",
      discountValue = 0,
      description = "",
      howToUse = "",
      ingredients = "",
      additionalDetails = "",
      benefits = "",
      composition = "",
      youtubeVideoUrl = "",
      stock = 0,
      active = true,
      isNewArrival = false,
      isBestseller = false,
      newArrivalSortOrder = 0,
      bestSellerSortOrder = 0,
      tags = [],
      shades = [],
      offer,
      badge = "",
    } = req.body;

    // --------------------------------------------------
    // Required fields validation
    // --------------------------------------------------

    if (
      !name ||
      !String(name).trim() ||
      !brand ||
      !String(brand).trim() ||
      !category ||
      !String(category).trim()
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Product name, brand and category are required.",
      });
    }

    const numericOldPrice = parseNumber(oldPrice);

    if (
      !Number.isFinite(numericOldPrice) ||
      numericOldPrice < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Old price must be a valid positive number.",
      });
    }

    const normalizedDiscountType =
      normalizeDiscountType(discountType);

    let numericDiscountValue = parseNumber(
      discountValue
    );

    if (numericDiscountValue < 0) {
      numericDiscountValue = 0;
    }

    if (
      normalizedDiscountType === "percentage" &&
      numericDiscountValue > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Percentage discount cannot exceed 100.",
      });
    }

    const numericStock = parseNumber(stock);

    if (numericStock < 0) {
      return res.status(400).json({
        success: false,
        message: "Stock cannot be negative.",
      });
    }

    const numericNewArrivalSortOrder = parseNumber(
      newArrivalSortOrder
    );

    const numericBestSellerSortOrder = parseNumber(
      bestSellerSortOrder
    );

    if (
      numericNewArrivalSortOrder < 0 ||
      numericBestSellerSortOrder < 0
    ) {
      return res.status(400).json({
        success: false,
        message: "Sort order cannot be negative.",
      });
    }

    // --------------------------------------------------
    // Create unique slug
    // --------------------------------------------------

    const slug = await createUniqueSlug(name);

    // --------------------------------------------------
    // Calculate selling price
    // --------------------------------------------------

    const price = calculatePrice(
      numericOldPrice,
      normalizedDiscountType,
      numericDiscountValue
    );

    // --------------------------------------------------
    // Normalize offer
    // --------------------------------------------------

    const normalizedOffer = normalizeOffer(offer);

    const offerError = validateOffer(normalizedOffer);

    if (offerError) {
      return res.status(400).json({
        success: false,
        message: offerError,
      });
    }

    // --------------------------------------------------
    // Uploaded files
    // --------------------------------------------------

    const images = getUploadedImages(req.files);

    const hoverImage = getUploadedImage(
      req.files,
      "hoverImage"
    );

    const beforeImage = getUploadedImage(
      req.files,
      "beforeImage"
    );

    const afterImage = getUploadedImage(
      req.files,
      "afterImage"
    );

    const video = getUploadedVideo(req.files);

    // --------------------------------------------------
    // Product type
    // --------------------------------------------------

    const normalizedIsNewArrival = parseBoolean(
      isNewArrival,
      false
    );

    const normalizedIsBestseller = parseBoolean(
      isBestseller,
      false
    );

    const productType = getProductType(
      normalizedIsNewArrival,
      normalizedIsBestseller
    );

    // --------------------------------------------------
    // Create product
    // --------------------------------------------------

    const product = await Product.create({
      name: String(name).trim(),
      slug,
      brand: String(brand).trim(),
      category: String(category).trim(),
      subcategory: String(subcategory).trim(),

      description: String(description).trim(),
      howToUse: String(howToUse).trim(),
      ingredients: String(ingredients).trim(),
      additionalDetails: String(
        additionalDetails
      ).trim(),
      benefits: String(benefits).trim(),
      composition: String(composition).trim(),

      oldPrice: numericOldPrice,
      discountType: normalizedDiscountType,
      discountValue: numericDiscountValue,
      price,

      offer: normalizedOffer,

      tags: parseArray(tags),
      shades: parseArray(shades),

      images,
      hoverImage,
      beforeImage,
      afterImage,
      video,
      youtubeVideoUrl: String(
        youtubeVideoUrl
      ).trim(),

      badge: String(badge).trim(),

      stock: numericStock,
      active: parseBoolean(active, true),

      isNewArrival: normalizedIsNewArrival,
      isBestseller: normalizedIsBestseller,

      newArrivalSortOrder:
        numericNewArrivalSortOrder,

      bestSellerSortOrder:
        numericBestSellerSortOrder,

      productType,
    });

    return res.status(201).json({
      success: true,
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    console.error("Create product error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A product with this information already exists.",
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to create product",
      error: error.message,
    });
  }
};

// --------------------------------------------------
// Update product
// PUT /api/products/:id
// --------------------------------------------------

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;

    if (
      !id ||
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    // --------------------------------------------------
    // Existing values
    // --------------------------------------------------

    const name =
      req.body.name !== undefined
        ? String(req.body.name).trim()
        : product.name;

    const brand =
      req.body.brand !== undefined
        ? String(req.body.brand).trim()
        : product.brand;

    const category =
      req.body.category !== undefined
        ? String(req.body.category).trim()
        : product.category;

    if (!name || !brand || !category) {
      return res.status(400).json({
        success: false,
        message:
          "Product name, brand and category are required.",
      });
    }

    const oldPrice =
      req.body.oldPrice !== undefined
        ? parseNumber(req.body.oldPrice)
        : product.oldPrice;

    if (oldPrice < 0) {
      return res.status(400).json({
        success: false,
        message: "Old price cannot be negative.",
      });
    }

    const discountType =
      req.body.discountType !== undefined
        ? normalizeDiscountType(
            req.body.discountType
          )
        : product.discountType || "none";

    const discountValue =
      req.body.discountValue !== undefined
        ? parseNumber(req.body.discountValue)
        : product.discountValue || 0;

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
        message: "Percentage discount cannot exceed 100.",
      });
    }

    // --------------------------------------------------
    // Offer
    // --------------------------------------------------

    const currentOffer = product.offer || {};

    const normalizedOffer =
      req.body.offer !== undefined
        ? normalizeOffer(req.body.offer)
        : normalizeOffer(currentOffer);

    const offerError = validateOffer(normalizedOffer);

    if (offerError) {
      return res.status(400).json({
        success: false,
        message: offerError,
      });
    }

    // --------------------------------------------------
    // Update main product fields
    // --------------------------------------------------

    product.name = name;
    product.brand = brand;
    product.category = category;

    if (req.body.subcategory !== undefined) {
      product.subcategory = String(
        req.body.subcategory
      ).trim();
    }

    product.oldPrice = oldPrice;
    product.discountType = discountType;
    product.discountValue = discountValue;

    product.price = calculatePrice(
      oldPrice,
      discountType,
      discountValue
    );

    product.offer = normalizedOffer;

    // --------------------------------------------------
    // Optional text fields
    // --------------------------------------------------

    if (req.body.description !== undefined) {
      product.description = String(
        req.body.description
      ).trim();
    }

    if (req.body.howToUse !== undefined) {
      product.howToUse = String(
        req.body.howToUse
      ).trim();
    }

    if (req.body.ingredients !== undefined) {
      product.ingredients = String(
        req.body.ingredients
      ).trim();
    }

    if (req.body.additionalDetails !== undefined) {
      product.additionalDetails = String(
        req.body.additionalDetails
      ).trim();
    }

    if (req.body.benefits !== undefined) {
      product.benefits = String(
        req.body.benefits
      ).trim();
    }

    if (req.body.composition !== undefined) {
      product.composition = String(
        req.body.composition
      ).trim();
    }

    if (req.body.youtubeVideoUrl !== undefined) {
      product.youtubeVideoUrl = String(
        req.body.youtubeVideoUrl
      ).trim();
    }

    if (req.body.badge !== undefined) {
      product.badge = String(
        req.body.badge
      ).trim();
    }

    // --------------------------------------------------
    // Arrays
    // --------------------------------------------------

    if (req.body.tags !== undefined) {
      product.tags = parseArray(req.body.tags);
    }

    if (req.body.shades !== undefined) {
      product.shades = parseArray(req.body.shades);
    }

    // --------------------------------------------------
    // Stock and status
    // --------------------------------------------------

    if (req.body.stock !== undefined) {
      const updatedStock = parseNumber(
        req.body.stock
      );

      if (updatedStock < 0) {
        return res.status(400).json({
          success: false,
          message: "Stock cannot be negative.",
        });
      }

      product.stock = updatedStock;
    }

    if (req.body.active !== undefined) {
      product.active = parseBoolean(
        req.body.active,
        true
      );
    }

    if (req.body.isNewArrival !== undefined) {
      product.isNewArrival = parseBoolean(
        req.body.isNewArrival,
        false
      );
    }

    if (req.body.isBestseller !== undefined) {
      product.isBestseller = parseBoolean(
        req.body.isBestseller,
        false
      );
    }

    // --------------------------------------------------
    // Sort orders
    // --------------------------------------------------

    if (
      req.body.newArrivalSortOrder !== undefined
    ) {
      const sortOrder = parseNumber(
        req.body.newArrivalSortOrder,
        0
      );

      if (sortOrder < 0) {
        return res.status(400).json({
          success: false,
          message:
            "New Arrival sort order cannot be negative.",
        });
      }

      product.newArrivalSortOrder = sortOrder;
    }

    if (
      req.body.bestSellerSortOrder !== undefined
    ) {
      const sortOrder = parseNumber(
        req.body.bestSellerSortOrder,
        0
      );

      if (sortOrder < 0) {
        return res.status(400).json({
          success: false,
          message:
            "Best Seller sort order cannot be negative.",
        });
      }

      product.bestSellerSortOrder = sortOrder;
    }

    // --------------------------------------------------
    // Product type
    // --------------------------------------------------

    product.productType = getProductType(
      product.isNewArrival,
      product.isBestseller
    );

    // --------------------------------------------------
    // Update slug if product name changed
    // --------------------------------------------------

    if (req.body.name !== undefined) {
      product.slug = await createUniqueSlug(
        name,
        product._id
      );
    }

    // --------------------------------------------------
    // Add newly uploaded images
    // --------------------------------------------------

    const newImages = getUploadedImages(
      req.files
    );

    if (newImages.length > 0) {
      product.images = [
        ...(Array.isArray(product.images)
          ? product.images
          : []),
        ...newImages,
      ];
    }

    // --------------------------------------------------
    // Update hover image
    // --------------------------------------------------

    const newHoverImage = getUploadedImage(
      req.files,
      "hoverImage"
    );

    if (newHoverImage) {
      product.hoverImage = newHoverImage;
    }

    // --------------------------------------------------
    // Update before image
    // --------------------------------------------------

    const newBeforeImage = getUploadedImage(
      req.files,
      "beforeImage"
    );

    if (newBeforeImage) {
      product.beforeImage = newBeforeImage;
    }

    // --------------------------------------------------
    // Update after image
    // --------------------------------------------------

    const newAfterImage = getUploadedImage(
      req.files,
      "afterImage"
    );

    if (newAfterImage) {
      product.afterImage = newAfterImage;
    }

    // --------------------------------------------------
    // Update video
    // --------------------------------------------------

    const newVideo = getUploadedVideo(
      req.files
    );

    if (newVideo) {
      product.video = newVideo;
    }

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Product updated successfully",
      product,
    });
  } catch (error) {
    console.error("Update product error:", error);

    if (error.code === 11000) {
      return res.status(409).json({
        success: false,
        message: "A product with this information already exists.",
        error: error.message,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Failed to update product",
      error: error.message,
    });
  }
};
// --------------------------------------------------
// Delete product
// DELETE /api/products/:id
// --------------------------------------------------

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate product ID
    if (
      !id ||
      !mongoose.Types.ObjectId.isValid(id)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    // Find and delete product
    const product = await Product.findByIdAndDelete(id);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Delete product error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete product",
      error: error.message,
    });
  }
};