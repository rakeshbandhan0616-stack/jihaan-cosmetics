import mongoose from "mongoose";

import Order from "../models/Order.js";
import Product from "../models/Product.js";
import Cart from "../models/Cart.js";

/* =========================================================
   FORMAT ORDER RESPONSE
========================================================= */

const formatOrder = (order) => {
  if (!order) return null;

  return {
    id: order._id,
    _id: order._id,

    orderNumber: order.orderNumber,

    trackingId: order.trackingId || order.orderNumber || "",

    user: order.user,

    items: order.items || [],

    shippingAddress: order.shippingAddress,

    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,

    orderStatus: order.orderStatus,

    orderStatusHistory: Array.isArray(order.orderStatusHistory)
      ? order.orderStatusHistory
      : [],

    tracking: {
      trackingId: order.trackingId || order.orderNumber || "",
      courierName: order.courierName || "",
      trackingUrl: order.trackingUrl || "",
      shippedAt: order.shippedAt || null,
      expectedDeliveryAt: order.expectedDeliveryAt || null,
      outForDeliveryAt: order.outForDeliveryAt || null,
      deliveredAt: order.deliveredAt || null,

      currentLocation: order.currentLocation || "",
      locationUpdatedAt: order.locationUpdatedAt || null,
    },

    trackingHistory: Array.isArray(order.trackingHistory)
      ? order.trackingHistory
      : [],

    currentLocation: order.currentLocation || "",
    locationUpdatedAt: order.locationUpdatedAt || null,

    subtotal: order.subtotal,
    shippingCharge: order.shippingCharge,
    discount: order.discount,
    totalAmount: order.totalAmount,

    couponCode: order.couponCode,
    notes: order.notes,

    cancelledAt: order.cancelledAt,
    cancellationReason: order.cancellationReason,

    returnReason: order.returnReason || "",
    returnedAt: order.returnedAt || null,

    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
};

/* =========================================================
   GET USER ID
========================================================= */

const getUserId = (req) => {
  return req.user?._id || req.user?.id || req.auth?.userId;
};

/* =========================================================
   STAFF / ACTOR ID
========================================================= */

const getActorId = (req) => {
  return req.user?._id || req.user?.id || req.auth?.userId || null;
};

/* =========================================================
   PRODUCT HELPERS
========================================================= */

const getProductName = (product) => {
  return product?.name || product?.title || "Product";
};

const getProductImage = (product) => {
  if (product?.image) {
    return product.image;
  }

  if (product?.thumbnail) {
    return product.thumbnail;
  }

  if (Array.isArray(product?.images) && product.images.length > 0) {
    return product.images[0];
  }

  return "";
};

const getProductPrice = (product) => {
  return Number(
    product?.salePrice ??
      product?.discountPrice ??
      product?.price ??
      product?.sellingPrice ??
      0,
  );
};

/* =========================================================
   ORDER STATUS HISTORY HELPER
========================================================= */

const appendOrderStatusHistory = (
  order,
  {
    status,
    note = "",
    updatedBy = null,
  },
) => {
  if (!Array.isArray(order.orderStatusHistory)) {
    order.orderStatusHistory = [];
  }

  order.orderStatusHistory.push({
    status,
    note: String(note || "").trim(),
    updatedBy: updatedBy || null,
    updatedAt: new Date(),
  });
};

/* =========================================================
   TRACKING HISTORY HELPER
========================================================= */

const appendTrackingHistory = (
  order,
  {
    location = "",
    note = "",
    status = null,
    updatedBy = null,
  },
) => {
  if (!Array.isArray(order.trackingHistory)) {
    order.trackingHistory = [];
  }

  order.trackingHistory.push({
    location: String(location || "").trim(),
    note: String(note || "").trim(),
    status: status || null,
    updatedBy: updatedBy || null,
    updatedAt: new Date(),
  });
};

/* =========================================================
   RESTORE ORDER STOCK
========================================================= */

const restoreOrderStock = async (order) => {
  if (!order || !Array.isArray(order.items)) {
    return;
  }

  for (const item of order.items) {
    if (!item?.product || !item?.quantity) {
      continue;
    }

    await Product.findByIdAndUpdate(item.product, {
      $inc: {
        stock: Number(item.quantity),
      },
    });
  }
};

/* =========================================================
   VALIDATE ORDER STATUS
========================================================= */

const ORDER_STATUSES = [
  "PLACED",
  "CONFIRMED",
  "PROCESSING",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "CANCELLED",
  "RETURN_REQUESTED",
  "RETURNED",
];

const PAYMENT_STATUSES = [
  "PENDING",
  "PAID",
  "RECEIVED",
  "FAILED",
  "REFUNDED",
];

/* =========================================================
   CREATE ORDER
   POST /api/orders
========================================================= */

export const createOrder = async (req, res) => {
  try {
    const userId = getUserId(req);

    console.log(
      "Received order request:",
      JSON.stringify(req.body, null, 2),
    );

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const {
      items,
      shippingAddress,
      paymentMethod = "COD",
      shippingCharge = 0,
      discount = 0,
      couponCode = "",
      notes = "",
    } = req.body || {};

    /* -----------------------------------------------------
       VALIDATE ITEMS
    ----------------------------------------------------- */

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one product is required",
      });
    }

    /* -----------------------------------------------------
       VALIDATE SHIPPING ADDRESS
    ----------------------------------------------------- */

    if (!shippingAddress || typeof shippingAddress !== "object") {
      return res.status(400).json({
        success: false,
        message: "Shipping address is required",
      });
    }

    const requiredAddressFields = [
      "fullName",
      "phone",
      "addressLine1",
      "city",
      "state",
      "postalCode",
    ];

    for (const field of requiredAddressFields) {
      if (!String(shippingAddress[field] || "").trim()) {
        return res.status(400).json({
          success: false,
          message: `${field} is required`,
        });
      }
    }

    /* -----------------------------------------------------
       VALIDATE PAYMENT METHOD
    ----------------------------------------------------- */

    if (!["COD", "ONLINE"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment method",
      });
    }

    if (paymentMethod === "ONLINE") {
      return res.status(400).json({
        success: false,
        message:
          "Online payment is not configured yet. Please select Cash on Delivery.",
      });
    }

    /* -----------------------------------------------------
       VALIDATE PRODUCT IDS
    ----------------------------------------------------- */

    const productIds = items.map((item) => item?.product);

    const invalidProductId = productIds.find(
      (productId) =>
        !productId ||
        !mongoose.Types.ObjectId.isValid(productId),
    );

    if (invalidProductId) {
      return res.status(400).json({
        success: false,
        message:
          "Each order item must contain a valid product ID. Use 'product', not 'productId'.",
      });
    }

    /* -----------------------------------------------------
       FETCH PRODUCTS
    ----------------------------------------------------- */

    const products = await Product.find({
      _id: {
        $in: productIds,
      },
      isActive: {
        $ne: false,
      },
    });

    if (products.length !== productIds.length) {
      return res.status(404).json({
        success: false,
        message: "One or more products are unavailable",
      });
    }

    /* -----------------------------------------------------
       PREPARE ORDER ITEMS
    ----------------------------------------------------- */

    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = products.find(
        (productItem) =>
          productItem._id.toString() === String(item.product),
      );

      if (!product) {
        return res.status(404).json({
          success: false,
          message: "One or more products are unavailable",
        });
      }

      const quantity = Number(item.quantity || 1);

      if (!Number.isInteger(quantity) || quantity < 1) {
        return res.status(400).json({
          success: false,
          message: "Invalid product quantity",
        });
      }

      const stock = Number(product.stock ?? 0);

      if (stock < quantity) {
        return res.status(400).json({
          success: false,
          message: `Only ${stock} item(s) of ${getProductName(
            product,
          )} are available`,
        });
      }

      const price = getProductPrice(product);

      if (!Number.isFinite(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: `Invalid price for ${getProductName(product)}`,
        });
      }

      const itemSubtotal = Number(
        (price * quantity).toFixed(2),
      );

      subtotal += itemSubtotal;

      orderItems.push({
        product: product._id,
        name: getProductName(product),
        image: getProductImage(product),
        price,
        quantity,
        size: String(item.size || "Standard").trim(),
        subtotal: itemSubtotal,
      });
    }

    subtotal = Number(subtotal.toFixed(2));

    /* -----------------------------------------------------
       CALCULATE TOTALS
    ----------------------------------------------------- */

    const safeShippingCharge = Math.max(
      0,
      Number(shippingCharge) || 0,
    );

    const safeDiscount = Math.min(
      subtotal,
      Math.max(0, Number(discount) || 0),
    );

    const totalAmount = Number(
      Math.max(
        0,
        subtotal + safeShippingCharge - safeDiscount,
      ).toFixed(2),
    );

    /* -----------------------------------------------------
       REDUCE PRODUCT STOCK
    ----------------------------------------------------- */

    for (const item of orderItems) {
      const updatedProduct = await Product.findOneAndUpdate(
        {
          _id: item.product,
          stock: {
            $gte: item.quantity,
          },
        },
        {
          $inc: {
            stock: -item.quantity,
          },
        },
        {
          returnDocument: "after",
        },
      );

      if (!updatedProduct) {
        return res.status(400).json({
          success: false,
          message: `Stock changed for ${item.name}. Please try again.`,
        });
      }
    }

    /* -----------------------------------------------------
       CREATE ORDER
    ----------------------------------------------------- */

    const order = await Order.create({
      user: userId,

      items: orderItems,

      shippingAddress: {
        fullName: String(shippingAddress.fullName).trim(),

        phone: String(shippingAddress.phone).trim(),

        email: String(shippingAddress.email || "")
          .trim()
          .toLowerCase(),

        addressLine1: String(
          shippingAddress.addressLine1,
        ).trim(),

        addressLine2: String(
          shippingAddress.addressLine2 || "",
        ).trim(),

        city: String(shippingAddress.city).trim(),

        state: String(shippingAddress.state).trim(),

        postalCode: String(shippingAddress.postalCode).trim(),

        country: String(
          shippingAddress.country || "India",
        ).trim(),
      },

      paymentMethod,
      paymentStatus: "PENDING",

      orderStatus: "PLACED",

      orderStatusHistory: [
        {
          status: "PLACED",
          note: "Order placed successfully",
          updatedBy: userId,
          updatedAt: new Date(),
        },
      ],

      trackingId: "",
      courierName: "",
      trackingUrl: "",
      shippedAt: null,
      expectedDeliveryAt: null,
      deliveredAt: null,

      subtotal,
      shippingCharge: safeShippingCharge,
      discount: safeDiscount,
      totalAmount,

      couponCode: String(couponCode || "").trim(),
      notes: String(notes || "").trim(),
    });

    /* -----------------------------------------------------
       CLEAR USER CART
    ----------------------------------------------------- */

    await Cart.findOneAndUpdate(
      {
        user: userId,
      },
      {
        $set: {
          items: [],
        },
      },
    );

    /* -----------------------------------------------------
       POPULATE ORDER
    ----------------------------------------------------- */

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone")
      .lean();

    return res.status(201).json({
      success: true,
      message: "Order placed successfully",
      order: formatOrder(populatedOrder),
    });
  } catch (error) {
    console.error("Create order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to create order",
      error: error.message,
    });
  }
};

/* =========================================================
   GET MY ORDERS
   GET /api/orders/my-orders
========================================================= */

export const getMyOrders = async (req, res) => {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const orders = await Order.find({
      user: userId,
    })
      .sort({
        createdAt: -1,
      })
      .lean();

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders: orders.map(formatOrder),
    });
  } catch (error) {
    console.error("Get my orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch orders",
      error: error.message,
    });
  }
};

/* =========================================================
   GET SINGLE ORDER
   GET /api/orders/:id
========================================================= */

export const getOrderById = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findOne({
      _id: id,
      user: userId,
    }).lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      order: formatOrder(order),
    });
  } catch (error) {
    console.error("Get order by ID error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

/* =========================================================
   CANCEL ORDER
   PUT /api/orders/:id/cancel
========================================================= */

export const cancelOrder = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { reason = "" } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findOne({
      _id: id,
      user: userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const nonCancellableStatuses = [
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "CANCELLED",
      "RETURNED",
    ];

    if (nonCancellableStatuses.includes(order.orderStatus)) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled in ${order.orderStatus} status`,
      });
    }

    /* -----------------------------------------------------
       RESTORE STOCK
    ----------------------------------------------------- */

    await restoreOrderStock(order);

    order.orderStatus = "CANCELLED";
    order.cancelledAt = new Date();
    order.cancellationReason = String(
      reason || "",
    ).trim();

    appendOrderStatusHistory(order, {
      status: "CANCELLED",
      note:
        String(reason || "").trim() ||
        "Order cancelled by customer",
      updatedBy: userId,
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Order cancelled successfully",
      order: formatOrder(order),
    });
  } catch (error) {
    console.error("Cancel order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to cancel order",
      error: error.message,
    });
  }
};

/* =========================================================
   REQUEST RETURN
   PUT /api/orders/:id/return
========================================================= */

export const requestReturn = async (req, res) => {
  try {
    const userId = getUserId(req);
    const { id } = req.params;
    const { reason = "" } = req.body || {};

    if (!userId) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findOne({
      _id: id,
      user: userId,
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.orderStatus !== "DELIVERED") {
      return res.status(400).json({
        success: false,
        message: "Only delivered orders can be returned",
      });
    }

    order.orderStatus = "RETURN_REQUESTED";
    order.returnReason = String(reason || "").trim();

    appendOrderStatusHistory(order, {
      status: "RETURN_REQUESTED",
      note:
        String(reason || "").trim() ||
        "Return request submitted by customer",
      updatedBy: userId,
    });

    await order.save();

    return res.status(200).json({
      success: true,
      message: "Return request submitted successfully",
      order: formatOrder(order),
    });
  } catch (error) {
    console.error("Request return error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to request return",
      error: error.message,
    });
  }
};

/* =========================================================
   ADMIN: GET ALL ORDERS
   GET /api/admin/orders
========================================================= */

export const getAllOrdersAdmin = async (req, res) => {
  try {
    const {
      status,
      paymentStatus,
      search,
    } = req.query || {};

    const filter = {};

    if (status && ORDER_STATUSES.includes(String(status))) {
      filter.orderStatus = String(status);
    }

    if (
      paymentStatus &&
      PAYMENT_STATUSES.includes(String(paymentStatus))
    ) {
      filter.paymentStatus = String(paymentStatus);
    }

    const orders = await Order.find(filter)
      .populate("user", "name email phone")
      .sort({
        createdAt: -1,
      })
      .lean();

    let formattedOrders = orders.map(formatOrder);

    if (search) {
      const normalizedSearch = String(search)
        .trim()
        .toLowerCase();

      formattedOrders = formattedOrders.filter((order) => {
        const orderNumber = String(
          order.orderNumber || "",
        ).toLowerCase();

        const trackingId = String(
          order.trackingId || "",
        ).toLowerCase();

        const customerName = String(
          order.user?.name ||
            order.shippingAddress?.fullName ||
            "",
        ).toLowerCase();

        const customerPhone = String(
          order.user?.phone ||
            order.shippingAddress?.phone ||
            "",
        ).toLowerCase();

        return (
          orderNumber.includes(normalizedSearch) ||
          trackingId.includes(normalizedSearch) ||
          customerName.includes(normalizedSearch) ||
          customerPhone.includes(normalizedSearch)
        );
      });
    }

    return res.status(200).json({
      success: true,
      count: formattedOrders.length,
      orders: formattedOrders,
    });
  } catch (error) {
    console.error("Admin get all orders error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch admin orders",
      error: error.message,
    });
  }
};

/* =========================================================
   ADMIN: GET SINGLE ORDER
   GET /api/admin/orders/:id
========================================================= */

export const getAdminOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(id)
      .populate("user", "name email phone")
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    return res.status(200).json({
      success: true,
      order: formatOrder(order),
    });
  } catch (error) {
    console.error("Admin get order error:", error);

    return res.status(500).json({
      success: false,
      message: "Failed to fetch order",
      error: error.message,
    });
  }
};

/* =========================================================
   ADMIN: UPDATE ORDER STATUS
   PUT /api/admin/orders/:id/status
========================================================= */

export const updateOrderStatusAdmin = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      orderStatus,
      note = "",
      cancellationReason = "",
    } = req.body || {};

    const actorId = getActorId(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    if (!ORDER_STATUSES.includes(orderStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order status",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    const previousStatus = order.orderStatus;

    if (previousStatus === orderStatus) {
      return res.status(400).json({
        success: false,
        message: `Order is already in ${orderStatus} status`,
      });
    }

    /* -----------------------------------------------------
       CANCEL THROUGH STATUS ENDPOINT
    ----------------------------------------------------- */

    if (orderStatus === "CANCELLED") {
      const nonCancellableStatuses = [
        "SHIPPED",
        "OUT_FOR_DELIVERY",
        "DELIVERED",
        "CANCELLED",
        "RETURNED",
      ];

      if (nonCancellableStatuses.includes(previousStatus)) {
        return res.status(400).json({
          success: false,
          message: `Order cannot be cancelled from ${previousStatus} status`,
        });
      }

      await restoreOrderStock(order);

      order.orderStatus = "CANCELLED";
      order.cancelledAt = new Date();

      order.cancellationReason = String(
        cancellationReason || note || "",
      ).trim();

      appendOrderStatusHistory(order, {
        status: "CANCELLED",
        note:
          String(cancellationReason || note || "").trim() ||
          "Order cancelled by staff",
        updatedBy: actorId,
      });

      await order.save();

      const populatedOrder = await Order.findById(order._id)
        .populate("user", "name email phone")
        .lean();

      return res.status(200).json({
        success: true,
        message: `Order cancelled from ${previousStatus} status`,
        order: formatOrder(populatedOrder),
      });
    }

    /* -----------------------------------------------------
       NORMAL STATUS UPDATE
    ----------------------------------------------------- */

    order.orderStatus = orderStatus;

    if (orderStatus === "SHIPPED" && !order.shippedAt) {
      order.shippedAt = new Date();
    }

    if (
      orderStatus === "OUT_FOR_DELIVERY" &&
      !order.outForDeliveryAt
    ) {
      order.outForDeliveryAt = new Date();
    }

    if (
      orderStatus === "DELIVERED" &&
      !order.deliveredAt
    ) {
      order.deliveredAt = new Date();
    }

    if (
      orderStatus === "RETURNED" &&
      !order.returnedAt
    ) {
      order.returnedAt = new Date();
    }

    appendOrderStatusHistory(order, {
      status: orderStatus,
      note:
        String(note || "").trim() ||
        `Order status changed from ${previousStatus} to ${orderStatus}`,
      updatedBy: actorId,
    });

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone")
      .lean();

    return res.status(200).json({
      success: true,
      message: `Order status updated from ${previousStatus} to ${orderStatus}`,
      order: formatOrder(populatedOrder),
    });
  } catch (error) {
    console.error(
      "Admin update order status error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update order status",
      error: error.message,
    });
  }
};

/* =========================================================
   ADMIN: UPDATE PAYMENT STATUS
   PUT /api/admin/orders/:id/payment
========================================================= */

export const updatePaymentStatusAdmin = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;
    const { paymentStatus } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    if (!PAYMENT_STATUSES.includes(paymentStatus)) {
      return res.status(400).json({
        success: false,
        message: "Invalid payment status",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    order.paymentStatus = paymentStatus;

    await order.save();

    const populatedOrder = await Order.findById(order._id)
      .populate("user", "name email phone")
      .lean();

    return res.status(200).json({
      success: true,
      message: `Payment status updated to ${paymentStatus}`,
      order: formatOrder(populatedOrder),
    });
  } catch (error) {
    console.error(
      "Admin update payment status error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message: "Failed to update payment status",
      error: error.message,
    });
  }
};

/* =========================================================
   ADMIN: UPDATE TRACKING DETAILS
   PUT /api/admin/orders/:id/tracking
========================================================= */

export const updateTrackingAdmin = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    const {
      trackingId = "",
      courierName = "",
      trackingUrl = "",
      expectedDeliveryAt = null,
      location = "",
      note = "",
    } = req.body || {};

    const actorId = getActorId(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    /* -----------------------------------------------------
       VALIDATE TRACKING URL
    ----------------------------------------------------- */

    if (
      trackingUrl &&
      !/^https?:\/\/.+/i.test(trackingUrl)
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Tracking URL must start with http:// or https://",
      });
    }

    /* -----------------------------------------------------
       VALIDATE EXPECTED DELIVERY DATE
    ----------------------------------------------------- */

    if (
      expectedDeliveryAt &&
      Number.isNaN(
        new Date(expectedDeliveryAt).getTime(),
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid expected delivery date",
      });
    }

    const previousStatus = order.orderStatus;

    const previousTrackingId =
      order.trackingId || "";

    const previousCourierName =
      order.courierName || "";

    const previousLocation =
      order.currentLocation || "";

    /* -----------------------------------------------------
       UPDATE TRACKING DETAILS
    ----------------------------------------------------- */

    order.trackingId = String(
      trackingId || "",
    ).trim();

    order.courierName = String(
      courierName || "",
    ).trim();

    order.trackingUrl = String(
      trackingUrl || "",
    ).trim();

    order.expectedDeliveryAt =
      expectedDeliveryAt
        ? new Date(expectedDeliveryAt)
        : null;

    const normalizedLocation = String(
      location || "",
    ).trim();

    const normalizedNote = String(
      note || "",
    ).trim();

    /* -----------------------------------------------------
       CURRENT LOCATION
    ----------------------------------------------------- */

    if (normalizedLocation) {
      order.currentLocation =
        normalizedLocation;

      order.locationUpdatedAt =
        new Date();
    }

    /* -----------------------------------------------------
       AUTOMATIC STATUS UPDATE

       If tracking ID is added to a PLACED order,
       automatically confirm the order.
    ----------------------------------------------------- */

    if (
      order.trackingId &&
      order.orderStatus === "PLACED"
    ) {
      order.orderStatus = "CONFIRMED";

      appendOrderStatusHistory(order, {
        status: "CONFIRMED",
        note:
          normalizedNote ||
          "Order confirmed after tracking details were added",
        updatedBy: actorId,
      });
    }

    /* -----------------------------------------------------
       TRACKING HISTORY
    ----------------------------------------------------- */

    const trackingChanged =
      previousTrackingId !==
        order.trackingId ||
      previousCourierName !==
        order.courierName ||
      previousLocation !==
        normalizedLocation ||
      Boolean(normalizedNote);

    if (trackingChanged) {
      appendTrackingHistory(order, {
        location: normalizedLocation,
        note:
          normalizedNote ||
          "Tracking details updated",
        status:
          order.orderStatus !== previousStatus
            ? order.orderStatus
            : null,
        updatedBy: actorId,
      });
    }

    await order.save();

    const populatedOrder = await Order.findById(
      order._id,
    )
      .populate(
        "user",
        "name email phone",
      )
      .lean();

    return res.status(200).json({
      success: true,
      message:
        "Tracking details updated successfully",
      order: formatOrder(populatedOrder),
    });
  } catch (error) {
    console.error(
      "Admin update tracking error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update tracking details",
      error: error.message,
    });
  }
};

/* =========================================================
   ADMIN: CANCEL ORDER
   PUT /api/admin/orders/:id/cancel
========================================================= */

export const cancelOrderAdmin = async (
  req,
  res,
) => {
  try {
    const { id } = req.params;

    const {
      reason = "",
      note = "",
    } = req.body || {};

    const actorId = getActorId(req);

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid order ID",
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      });
    }

    if (order.orderStatus === "CANCELLED") {
      return res.status(400).json({
        success: false,
        message: "Order is already cancelled",
      });
    }

    const nonCancellableStatuses = [
      "SHIPPED",
      "OUT_FOR_DELIVERY",
      "DELIVERED",
      "RETURNED",
    ];

    if (
      nonCancellableStatuses.includes(
        order.orderStatus,
      )
    ) {
      return res.status(400).json({
        success: false,
        message: `Order cannot be cancelled in ${order.orderStatus} status`,
      });
    }

    /* -----------------------------------------------------
       RESTORE STOCK
    ----------------------------------------------------- */

    await restoreOrderStock(order);

    /* -----------------------------------------------------
       UPDATE CANCELLATION DETAILS
    ----------------------------------------------------- */

    order.orderStatus = "CANCELLED";

    order.cancelledAt = new Date();

    order.cancellationReason = String(
      reason || note || "",
    ).trim();

    appendOrderStatusHistory(order, {
      status: "CANCELLED",
      note:
        String(note || reason || "").trim() ||
        "Order cancelled by staff",
      updatedBy: actorId,
    });

    await order.save();

    const populatedOrder = await Order.findById(
      order._id,
    )
      .populate(
        "user",
        "name email phone",
      )
      .lean();

    return res.status(200).json({
      success: true,
      message:
        "Order cancelled successfully",
      order: formatOrder(populatedOrder),
    });
  } catch (error) {
    console.error(
      "Admin cancel order error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to cancel order",
      error: error.message,
    });
  }
};