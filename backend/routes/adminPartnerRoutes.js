import express from "express";

import {
  getPartnerApplications,
  reviewPartnerApplication,
} from "../controllers/adminPartnerController.js";

import { requireSuperAdmin } from "../middleware/adminMiddleware.js";

const router = express.Router();

router.get(
  "/applications",
  requireSuperAdmin,
  getPartnerApplications
);

router.patch(
  "/applications/:id/review",
  requireSuperAdmin,
  reviewPartnerApplication
);

export default router;