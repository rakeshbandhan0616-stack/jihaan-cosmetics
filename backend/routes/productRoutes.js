import express from "express";

import {
  getProducts,
  getAllProducts,
  getNewArrivals,
  getBestsellers,
  getProductBySlug,
  getProductById,
  getProductReviews,
  addProductReview,
  deleteProductReview,
  createProduct,
  updateProduct,
  deleteProduct,
} from "../controllers/productController.js";

import {
  protect,
  userOnly,
  adminOnly,
} from "../middleware/authMiddleware.js";

import productUpload from "../middleware/productUpload.js";
import reviewUpload from "../middleware/reviewUpload.js";

const router = express.Router();

/* =========================================================
   PUBLIC PRODUCT ROUTES
========================================================= */

// GET /api/products
router.get("/", getProducts);

// GET /api/products/new-arrivals
router.get("/new-arrivals", getNewArrivals);

// GET /api/products/bestsellers
router.get("/bestsellers", getBestsellers);

// GET /api/products/slug/:slug
router.get("/slug/:slug", getProductBySlug);

/* =========================================================
   ADMIN PRODUCT ROUTES
========================================================= */

// GET /api/products/admin
router.get(
  "/admin",
  protect,
  adminOnly,
  getAllProducts,
);

/* =========================================================
   PRODUCT REVIEW ROUTES
========================================================= */

// GET /api/products/:id/reviews
// Public: everyone can read reviews.
router.get("/:id/reviews", getProductReviews);

// POST /api/products/:id/reviews
// Protected: only logged-in customers can submit reviews.
router.post(
  "/:id/reviews",
  protect,
  userOnly,
  reviewUpload.array("images", 5),
  addProductReview,
);

// DELETE /api/products/:id/reviews/:reviewId
// Protected: controller should verify ownership or admin access.
router.delete(
  "/:id/reviews/:reviewId",
  protect,
  deleteProductReview,
);

/* =========================================================
   CREATE PRODUCT
========================================================= */

// POST /api/products
router.post(
  "/",
  protect,
  adminOnly,
  productUpload.fields([
    {
      name: "images",
      maxCount: 10,
    },
    {
      name: "hoverImage",
      maxCount: 1,
    },
    {
      name: "beforeImage",
      maxCount: 1,
    },
    {
      name: "afterImage",
      maxCount: 1,
    },
    {
      name: "video",
      maxCount: 1,
    },
  ]),
  createProduct,
);

/* =========================================================
   GET PRODUCT BY ID
========================================================= */

// GET /api/products/:id
router.get("/:id", getProductById);

/* =========================================================
   UPDATE PRODUCT
========================================================= */

// PUT /api/products/:id
router.put(
  "/:id",
  protect,
  adminOnly,
  productUpload.fields([
    {
      name: "images",
      maxCount: 10,
    },
    {
      name: "hoverImage",
      maxCount: 1,
    },
    {
      name: "beforeImage",
      maxCount: 1,
    },
    {
      name: "afterImage",
      maxCount: 1,
    },
    {
      name: "video",
      maxCount: 1,
    },
  ]),
  updateProduct,
);

/* =========================================================
   DELETE PRODUCT
========================================================= */

// DELETE /api/products/:id
router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteProduct,
);

export default router;