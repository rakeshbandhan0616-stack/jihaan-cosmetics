import express from "express";

import {
  getAllContactMessages,
  getContactMessageById,
  updateContactMessage,
  deleteContactMessage,
  getContactStats,
} from "../controllers/contactController.js";

// Change these imports according to your existing middleware filenames.
import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get("/", getAllContactMessages);
router.get("/stats", getContactStats);
router.get("/:id", getContactMessageById);
router.patch("/:id", updateContactMessage);
router.delete("/:id", deleteContactMessage);

export default router;