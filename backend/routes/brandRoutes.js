import express from "express";

import {
  getBrands,
  getAllBrands,
  createBrand,
  updateBrand,
  deleteBrand,
  toggleBrand,
} from "../controllers/brandController.js";

const router = express.Router();

router.get("/", getBrands);
router.get("/admin", getAllBrands);
router.post("/", createBrand);
router.put("/:id", updateBrand);
router.delete("/:id", deleteBrand);
router.patch("/:id/toggle", toggleBrand);

export default router;