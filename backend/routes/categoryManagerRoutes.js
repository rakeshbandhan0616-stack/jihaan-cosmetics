import express from "express";

import {
  getCategoryProducts,
  toggleCategoryProduct,
  updateCategorySortOrder,
} from "../controllers/categoryManagerController.js";

const router = express.Router();

// Get all products for a category manager
// /api/category-manager/new-arrivals
// /api/category-manager/best-sellers
router.get("/:category", getCategoryProducts);

// Mark or unmark a product
// /api/category-manager/new-arrivals/:id/toggle
// /api/category-manager/best-sellers/:id/toggle
router.patch("/:category/:id/toggle", toggleCategoryProduct);

// Update display order
// /api/category-manager/new-arrivals/:id/sort-order
// /api/category-manager/best-sellers/:id/sort-order
router.patch(
  "/:category/:id/sort-order",
  updateCategorySortOrder,
);

export default router;