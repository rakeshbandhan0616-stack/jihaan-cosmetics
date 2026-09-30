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

/*
  GET /api/products

  Get active products for storefront.
*/
router.get("/", getProducts);


/*
  GET /api/products/new-arrivals

  Get new arrival products.
*/
router.get(
  "/new-arrivals",
  getNewArrivals
);


/*
  GET /api/products/bestsellers

  Get bestseller products.
*/
router.get(
  "/bestsellers",
  getBestsellers
);


/*
  GET /api/products/slug/:slug

  Get single product using slug.
*/
router.get(
  "/slug/:slug",
  getProductBySlug
);


/* =========================================================
   ADMIN PRODUCT ROUTES
========================================================= */

/*
  GET /api/products/admin

  Admin-only product management list.
*/
router.get(
  "/admin",
  protect,
  adminOnly,
  getAllProducts
);


/* =========================================================
   PRODUCT REVIEW ROUTES
========================================================= */

/*
  GET /api/products/:id/reviews

  Public route.
  Anyone can view product reviews.
*/
router.get(
  "/:id/reviews",
  getProductReviews
);


/*
  POST /api/products/:id/reviews

  Logged-in customer can submit a review.

  Images:
    images[] -> reviewUpload
*/
router.post(
  "/:id/reviews",
  protect,
  userOnly,
  reviewUpload.array("images", 5),
  addProductReview
);


/*
  DELETE /api/products/:id/reviews/:reviewId

  Logged-in user/admin can request deletion.

  IMPORTANT:
  Ownership/admin authorization should be checked
  inside deleteProductReview.
*/
router.delete(
  "/:id/reviews/:reviewId",
  protect,
  deleteProductReview
);


/* =========================================================
   CREATE PRODUCT
========================================================= */

/*
  POST /api/products

  Admin-only.

  Product media fields:

    images[]       -> multiple product images
    hoverImage     -> hover image
    beforeImage    -> before image
    afterImage     -> after image
    video          -> product video

  productUpload uses memoryStorage.
  The controller uploads these files to Cloudinary.
*/
router.post(
  "/",
  protect,
  adminOnly,
  productUpload,
  createProduct
);


/* =========================================================
   GET PRODUCT BY ID
========================================================= */

/*
  GET /api/products/:id

  Public product details.
*/
router.get(
  "/:id",
  getProductById
);


/* =========================================================
   UPDATE PRODUCT
========================================================= */

/*
  PUT /api/products/:id

  Admin-only.

  Supports:

    - Product information update
    - New product images
    - Hover image
    - Before image
    - After image
    - Product video
    - Removing existing Cloudinary media

  Expected removal fields:

    removedImages
    removeHoverImage
    removeBeforeImage
    removeAfterImage
    removeVideo
*/
router.put(
  "/:id",
  protect,
  adminOnly,
  productUpload,
  updateProduct
);


/* =========================================================
   DELETE PRODUCT
========================================================= */

/*
  DELETE /api/products/:id

  Admin-only.

  Controller:
    1. Deletes product from MongoDB
    2. Deletes associated Cloudinary media
*/
router.delete(
  "/:id",
  protect,
  adminOnly,
  deleteProduct
);


/* =========================================================
   EXPORT ROUTER
========================================================= */

export default router;