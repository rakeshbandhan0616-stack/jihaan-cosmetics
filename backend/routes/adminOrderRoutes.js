import express from "express";

import {
  getAllOrdersAdmin,
  getAdminOrderById,
  updateOrderStatusAdmin,
  updatePaymentStatusAdmin,
  updateTrackingAdmin,
} from "../controllers/orderController.js";

import {
  protect,
  orderViewOnly,
  orderManagementOnly,
  paymentManagementOnly,
} from "../middleware/authMiddleware.js";

const router = express.Router();

/* =========================================================
   ADMIN ORDER ROUTES
========================================================= */

/*
  All order routes require authentication.

  Role permissions are handled individually below.

  Supported staff roles:

  superadmin
  admin
  accounts
  logistics
*/

router.use(protect);

/* =========================================================
   GET ALL ORDERS
========================================================= */

/*
  GET /api/admin/orders

  Allowed:
  - superadmin
  - admin
  - accounts
  - logistics

  Accounts:
  READ ONLY

  Logistics:
  READ ONLY on this endpoint

  Admin/Superadmin:
  READ
*/

router.get(
  "/",
  orderViewOnly,
  getAllOrdersAdmin,
);

/* =========================================================
   GET SINGLE ORDER
========================================================= */

/*
  GET /api/admin/orders/:id

  Allowed:
  - superadmin
  - admin
  - accounts
  - logistics

  Returns:
  - Order information
  - Customer information
  - Shipping address
  - Products
  - Payment information
  - Order status
  - Tracking information
*/

router.get(
  "/:id",
  orderViewOnly,
  getAdminOrderById,
);

/* =========================================================
   UPDATE ORDER STATUS
========================================================= */

/*
  PUT /api/admin/orders/:id/status

  Allowed:
  - superadmin
  - admin
  - logistics

  NOT allowed:
  - accounts
  - user

  Example body:

  {
    "orderStatus": "CONFIRMED",
    "note": "Order confirmed successfully"
  }

  Other examples:

  {
    "orderStatus": "PROCESSING",
    "note": "Order is being processed"
  }

  {
    "orderStatus": "SHIPPED",
    "note": "Order dispatched to customer"
  }

  {
    "orderStatus": "OUT_FOR_DELIVERY",
    "note": "Shipment is out for delivery"
  }

  {
    "orderStatus": "DELIVERED",
    "note": "Order delivered successfully"
  }
*/

router.put(
  "/:id/status",
  orderManagementOnly,
  updateOrderStatusAdmin,
);

/* =========================================================
   UPDATE PAYMENT STATUS
========================================================= */

/*
  PUT /api/admin/orders/:id/payment

  Allowed:
  - superadmin
  - admin

  NOT allowed:
  - accounts
  - logistics
  - user

  Example body:

  {
    "paymentStatus": "RECEIVED",
    "paymentReceiptUrl": "https://example.com/receipt.jpg",
    "paymentNote": "Payment received successfully"
  }

  Other payment statuses:

  PENDING
  PAID
  RECEIVED
  FAILED
  REFUNDED
*/

router.put(
  "/:id/payment",
  paymentManagementOnly,
  updatePaymentStatusAdmin,
);

/* =========================================================
   UPDATE TRACKING DETAILS
========================================================= */

/*
  PUT /api/admin/orders/:id/tracking

  Allowed:
  - superadmin
  - admin
  - logistics

  NOT allowed:
  - accounts
  - user

  Example body:

  {
    "trackingId": "JHN-TRACK-12345",
    "courierName": "Delhivery",
    "trackingUrl": "https://www.delhivery.com/",
    "expectedDeliveryAt": "2026-09-25"
  }

  Logistics will use this endpoint for:
  - Tracking ID
  - Courier partner
  - Tracking URL
  - Expected delivery date/time
*/

router.put(
  "/:id/tracking",
  orderManagementOnly,
  updateTrackingAdmin,
);

/* =========================================================
   IMPORTANT PERMISSION SUMMARY
========================================================= */

/*

  GET /api/admin/orders
  ├── superadmin  ✓
  ├── admin       ✓
  ├── accounts    ✓ READ ONLY
  └── logistics   ✓ READ ONLY

  GET /api/admin/orders/:id
  ├── superadmin  ✓
  ├── admin       ✓
  ├── accounts    ✓ READ ONLY
  └── logistics   ✓ READ ONLY

  PUT /api/admin/orders/:id/status
  ├── superadmin  ✓
  ├── admin       ✓
  ├── accounts    ✗
  └── logistics   ✓

  PUT /api/admin/orders/:id/payment
  ├── superadmin  ✓
  ├── admin       ✓
  ├── accounts    ✗
  └── logistics   ✗

  PUT /api/admin/orders/:id/tracking
  ├── superadmin  ✓
  ├── admin       ✓
  ├── accounts    ✗
  └── logistics   ✓

========================================================= */

export default router;