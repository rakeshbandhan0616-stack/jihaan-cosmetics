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

router.get("/", getCategories);

router.get("/all", getAllCategories);

router.post(
  "/",
  categoryUpload.single("image"),
  createCategory,
);

router.put(
  "/:id",
  categoryUpload.single("image"),
  updateCategory,
);

router.delete("/:id", deleteCategory);

export default router;