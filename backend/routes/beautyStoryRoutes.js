import express from "express";

import {
  getBeautyStories,
  getAllBeautyStories,
  createBeautyStory,
  updateBeautyStory,
  deleteBeautyStory,
  toggleBeautyStory,
} from "../controllers/beautyStoryController.js";

const router = express.Router();

router.get("/", getBeautyStories);
router.get("/admin", getAllBeautyStories);
router.post("/", createBeautyStory);
router.put("/:id", updateBeautyStory);
router.delete("/:id", deleteBeautyStory);
router.patch("/:id/toggle", toggleBeautyStory);

export default router;