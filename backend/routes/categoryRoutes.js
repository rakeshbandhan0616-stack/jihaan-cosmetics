import express from "express";

import {
  getCategories,
  getAllCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/categoryController.js";

import categoryUpload from "../middleware/categoryUpload.js";

const router = express.Router();

/*
|--------------------------------------------------------------------------
| Public categories
|--------------------------------------------------------------------------
*/

router.get(
  "/",
  getCategories
);

router.get(
  "/all",
  getAllCategories
);

/*
|--------------------------------------------------------------------------
| Create category
|--------------------------------------------------------------------------
*/

router.post(
  "/",
  categoryUpload.single("image"),
  createCategory
);

/*
|--------------------------------------------------------------------------
| Update category
|--------------------------------------------------------------------------
*/

router.put(
  "/:id",
  categoryUpload.single("image"),
  updateCategory
);

/*
|--------------------------------------------------------------------------
| Delete category
|--------------------------------------------------------------------------
*/

router.delete(
  "/:id",
  deleteCategory
);

export default router;