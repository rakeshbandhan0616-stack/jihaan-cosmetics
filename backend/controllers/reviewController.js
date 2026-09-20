import mongoose from "mongoose";
import Product from "../models/Product.js";

export const getAllReviews = async (req, res) => {
  try {
    const {
      search = "",
      rating = "",
      page = 1,
      limit = 10,
    } = req.query;

    const products = await Product.find({
      "reviewList.0": { $exists: true },
    })
      .select("name brand category rating reviews reviewList")
      .lean();

    let reviews = [];

    for (const product of products) {
      for (const review of product.reviewList || []) {
        reviews.push({
          _id: review._id,
          productId: product._id,
          productName: product.name,
          brand: product.brand,
          category: product.category,
          name: review.name,
          email: review.email,
          rating: review.rating,
          comment: review.comment,
          verifiedPurchase: review.verifiedPurchase,
          createdAt: review.createdAt,
          updatedAt: review.updatedAt,
        });
      }
    }

    const normalizedSearch = String(search).trim().toLowerCase();

    if (normalizedSearch) {
      reviews = reviews.filter((review) => {
        return (
          String(review.name || "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(review.email || "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(review.comment || "")
            .toLowerCase()
            .includes(normalizedSearch) ||
          String(review.productName || "")
            .toLowerCase()
            .includes(normalizedSearch)
        );
      });
    }

    if (rating) {
      reviews = reviews.filter(
        (review) => Number(review.rating) === Number(rating),
      );
    }

    reviews.sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    );

    const currentPage = Math.max(1, Number(page) || 1);
    const pageLimit = Math.min(100, Math.max(1, Number(limit) || 10));
    const total = reviews.length;
    const startIndex = (currentPage - 1) * pageLimit;

    return res.status(200).json({
      success: true,
      reviews: reviews.slice(startIndex, startIndex + pageLimit),
      pagination: {
        page: currentPage,
        limit: pageLimit,
        total,
        pages: Math.ceil(total / pageLimit),
      },
    });
  } catch (error) {
    console.error("Get reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch reviews",
      error: error.message,
    });
  }
};

export const getReviewStats = async (req, res) => {
  try {
    const products = await Product.find({
      "reviewList.0": { $exists: true },
    })
      .select("rating reviews reviewList")
      .lean();

    const stats = {
      totalReviews: 0,
      averageRating: 0,
      verifiedReviews: 0,
      distribution: {
        1: 0,
        2: 0,
        3: 0,
        4: 0,
        5: 0,
      },
    };

    let totalRating = 0;

    for (const product of products) {
      for (const review of product.reviewList || []) {
        const reviewRating = Number(review.rating || 0);

        stats.totalReviews += 1;
        totalRating += reviewRating;

        if (review.verifiedPurchase) {
          stats.verifiedReviews += 1;
        }

        if (stats.distribution[reviewRating] !== undefined) {
          stats.distribution[reviewRating] += 1;
        }
      }
    }

    stats.averageRating =
      stats.totalReviews > 0
        ? Number((totalRating / stats.totalReviews).toFixed(1))
        : 0;

    return res.status(200).json({
      success: true,
      stats,
    });
  } catch (error) {
    console.error("Review stats error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch review stats",
      error: error.message,
    });
  }
};

export const getProductReviewsAdmin = async (req, res) => {
  try {
    const { productId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(productId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID",
      });
    }

    const product = await Product.findById(productId)
      .select("name brand category rating reviews reviewList")
      .lean();

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    return res.status(200).json({
      success: true,
      product,
      reviews: product.reviewList || [],
    });
  } catch (error) {
    console.error("Get product reviews error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch product reviews",
      error: error.message,
    });
  }
};

export const deleteReview = async (req, res) => {
  try {
    const { productId, reviewId } = req.params;

    if (
      !mongoose.Types.ObjectId.isValid(productId) ||
      !mongoose.Types.ObjectId.isValid(reviewId)
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid product ID or review ID",
      });
    }

    const product = await Product.findById(productId);

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Product not found",
      });
    }

    const reviewExists = product.reviewList.some(
      (review) => String(review._id) === String(reviewId),
    );

    if (!reviewExists) {
      return res.status(404).json({
        success: false,
        message: "Review not found",
      });
    }

    product.reviewList = product.reviewList.filter(
      (review) => String(review._id) !== String(reviewId),
    );

    product.reviews = product.reviewList.length;

    product.rating =
      product.reviewList.length > 0
        ? Number(
            (
              product.reviewList.reduce(
                (total, review) => total + Number(review.rating || 0),
                0,
              ) / product.reviewList.length
            ).toFixed(1),
          )
        : 0;

    await product.save();

    return res.status(200).json({
      success: true,
      message: "Review deleted successfully",
      productId,
      reviewId,
    });
  } catch (error) {
    console.error("Delete review error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to delete review",
      error: error.message,
    });
  }
};