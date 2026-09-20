import express from "express";
import {
  registerPartner,
  loginPartner,
  getApplicationStatus,
} from "../controllers/partnerController.js";

const router = express.Router();

router.post("/register", registerPartner);
router.post("/login", loginPartner);
router.get("/status/:referenceNumber", getApplicationStatus);

export default router;