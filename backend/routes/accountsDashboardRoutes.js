import express from "express";

import {
  getAccountsOverview,
  getAccountsSales,
  getAccountsOrders,
  getAccountsOrderById,
  getAccountsInventory,
} from "../controllers/accountsDashboardController.js";

import {
  exportSalesReportPdf,
  exportSalesReportExcel,
} from "../controllers/salesReportController.js";

import {
  protect,
  accountsOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   ACCOUNTS DASHBOARD
========================================================= */

/*
 * All Accounts Dashboard APIs require:
 *
 * 1. Authentication
 * 2. Accounts role
 * 3. Read-only access
 *
 * Accounts users cannot:
 * - Create products
 * - Update products
 * - Delete products
 * - Change orders
 * - Change payment status
 * - Change tracking
 * - Cancel orders
 * - Manage other users
 *
 * They can:
 * - View overview
 * - View sales
 * - View orders
 * - View order details
 * - View inventory
 * - Download sales reports
 */

/* =========================================================
   AUTHENTICATION
========================================================= */

router.use(protect);

/* =========================================================
   ACCOUNTS ROLE ONLY
========================================================= */

router.use(accountsOnly);

/* =========================================================
   OVERVIEW
========================================================= */

/*
 * GET /api/accounts-dashboard/overview
 *
 * Returns:
 * - Total orders
 * - Total sales
 * - Paid amount
 * - Pending amount
 * - Refunded amount
 * - Cancelled amount
 * - Total customers
 * - Total products
 */

router.get(
  "/overview",
  getAccountsOverview,
);

/* =========================================================
   SALES
========================================================= */

/*
 * GET /api/accounts-dashboard/sales
 *
 * Optional:
 *
 * ?from=2026-09-01
 * &to=2026-09-30
 *
 * Returns:
 * - Sales summary
 * - Daily sales
 * - Payment breakdown
 * - Order status breakdown
 */

router.get(
  "/sales",
  getAccountsSales,
);

/* =========================================================
   SALES REPORT - PDF
========================================================= */

/*
 * GET /api/accounts-dashboard/sales/export/pdf
 *
 * Downloads:
 * accounts-sales-report.pdf
 *
 * Optional:
 *
 * ?from=2026-09-01
 * &to=2026-09-30
 */

router.get(
  "/sales/export/pdf",
  exportSalesReportPdf,
);

/* =========================================================
   SALES REPORT - EXCEL
========================================================= */

/*
 * GET /api/accounts-dashboard/sales/export/excel
 *
 * Downloads:
 * sales-report.xlsx
 *
 * Optional:
 *
 * ?from=2026-09-01
 * &to=2026-09-30
 */

router.get(
  "/sales/export/excel",
  exportSalesReportExcel,
);

/* =========================================================
   ORDERS
========================================================= */

/*
 * GET /api/accounts-dashboard/orders
 *
 * Optional query:
 *
 * ?page=1
 * &limit=20
 * &search=tushar
 * &status=DELIVERED
 * &paymentStatus=PAID
 */

router.get(
  "/orders",
  getAccountsOrders,
);

/* =========================================================
   SINGLE ORDER
========================================================= */

/*
 * GET /api/accounts-dashboard/orders/:id
 *
 * Accounts can view:
 * - Customer information
 * - Order information
 * - Payment information
 * - Tracking information
 * - Order history
 */

router.get(
  "/orders/:id",
  getAccountsOrderById,
);

/* =========================================================
   INVENTORY
========================================================= */

/*
 * GET /api/accounts-dashboard/inventory
 *
 * Optional query:
 *
 * ?page=1
 * &limit=50
 * &search=lipstick
 * &lowStock=true
 *
 * Returns:
 * - Product
 * - SKU
 * - Price
 * - Stock
 * - Inventory value
 * - Low stock
 * - Out of stock
 */

router.get(
  "/inventory",
  getAccountsInventory,
);

/* =========================================================
   EXPORT ROUTER
========================================================= */

export default router;