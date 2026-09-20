import express from "express";

import {
  createContactMessage,
} from "../controllers/contactController.js";

// Change this import if your auth middleware has another filename.
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route.
// If a valid token is provided, the controller will attach the user ID.
// If your protect middleware rejects unauthenticated users,
// remove protect from this route.
router.post("/", createContactMessage);

export default router;