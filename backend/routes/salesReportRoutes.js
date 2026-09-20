import express from "express";

import {
  getSalesReport,
  exportSalesReportPdf,
  exportSalesReportExcel,
  exportSalesReportDocx,
} from "../controllers/salesReportController.js";

import {
  protect,
  adminOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

router.use(protect);
router.use(adminOnly);

router.get("/", getSalesReport);
router.get("/export/pdf", exportSalesReportPdf);
router.get("/export/excel", exportSalesReportExcel);
router.get("/export/docx", exportSalesReportDocx);

export default router;