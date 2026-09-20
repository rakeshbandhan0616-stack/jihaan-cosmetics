import mongoose from "mongoose";

/* =========================================================
   ORDER ITEM SCHEMA
========================================================= */

const orderItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product is required"],
    },

    name: {
      type: String,
      required: [true, "Product name is required"],
      trim: true,
    },

    image: {
      type: String,
      default: "",
      trim: true,
    },

    price: {
      type: Number,
      required: [true, "Product price is required"],
      min: [0, "Price cannot be negative"],
    },

    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },

    size: {
      type: String,
      default: "Standard",
      trim: true,
    },

    subtotal: {
      type: Number,
      required: [true, "Item subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
    },
  },
  {
    _id: false,
  },
);

/* =========================================================
   SHIPPING ADDRESS SCHEMA
========================================================= */

const addressSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, "Full name is required"],
      trim: true,
    },

    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },

    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
    },

    addressLine1: {
      type: String,
      required: [true, "Address is required"],
      trim: true,
    },

    addressLine2: {
      type: String,
      default: "",
      trim: true,
    },

    city: {
      type: String,
      required: [true, "City is required"],
      trim: true,
    },

    state: {
      type: String,
      required: [true, "State is required"],
      trim: true,
    },

    postalCode: {
      type: String,
      required: [true, "Postal code is required"],
      trim: true,
    },

    country: {
      type: String,
      default: "India",
      trim: true,
    },
  },
  {
    _id: false,
  },
);

/* =========================================================
   ORDER STATUS HISTORY SCHEMA
========================================================= */

const orderStatusHistorySchema = new mongoose.Schema(
  {
    status: {
      type: String,
      enum: {
        values: [
          "PLACED",
          "CONFIRMED",
          "PROCESSING",
          "SHIPPED",
          "OUT_FOR_DELIVERY",
          "DELIVERED",
          "CANCELLED",
          "RETURN_REQUESTED",
          "RETURNED",
        ],
        message: "Invalid order status",
      },
      required: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

/* =========================================================
   TRACKING HISTORY SCHEMA

   Used by logistics/admin for:
   - Current location
   - Shipment movement
   - Tracking notes
   - Status-related tracking updates
   - Staff member who made update
========================================================= */

const trackingHistorySchema = new mongoose.Schema(
  {
    location: {
      type: String,
      default: "",
      trim: true,
    },

    note: {
      type: String,
      default: "",
      trim: true,
    },

    status: {
      type: String,
      enum: {
        values: [
          "PLACED",
          "CONFIRMED",
          "PROCESSING",
          "SHIPPED",
          "OUT_FOR_DELIVERY",
          "DELIVERED",
          "CANCELLED",
          "RETURN_REQUESTED",
          "RETURNED",
          null,
        ],
        message: "Invalid tracking status",
      },
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    _id: false,
  },
);

/* =========================================================
   ORDER SCHEMA
========================================================= */

const orderSchema = new mongoose.Schema(
  {
    /* =====================================================
       ORDER IDENTIFICATION
    ===================================================== */

    orderNumber: {
      type: String,
      unique: true,
      index: true,
      trim: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "User is required"],
      index: true,
    },

    /* =====================================================
       ORDER ITEMS
    ===================================================== */

    items: {
      type: [orderItemSchema],
      required: [true, "Order items are required"],

      validate: {
        validator: (items) =>
          Array.isArray(items) && items.length > 0,

        message: "At least one order item is required",
      },
    },

    /* =====================================================
       SHIPPING ADDRESS
    ===================================================== */

    shippingAddress: {
      type: addressSchema,
      required: [true, "Shipping address is required"],
    },

    /* =====================================================
       PAYMENT DETAILS
    ===================================================== */

    paymentMethod: {
      type: String,

      enum: {
        values: ["COD", "ONLINE"],
        message: "Invalid payment method",
      },

      default: "COD",
    },

    paymentStatus: {
      type: String,

      enum: {
        values: [
          "PENDING",
          "RECEIVED",
          "PAID",
          "FAILED",
          "REFUNDED",
        ],
        message: "Invalid payment status",
      },

      default: "PENDING",

      index: true,
    },

    paymentReceivedAt: {
      type: Date,
      default: null,
    },

    paymentReceiptUrl: {
      type: String,
      default: "",
      trim: true,
    },

    paymentNote: {
      type: String,
      default: "",
      trim: true,
    },

    /* =====================================================
       ORDER STATUS
    ===================================================== */

    orderStatus: {
      type: String,

      enum: {
        values: [
          "PLACED",
          "CONFIRMED",
          "PROCESSING",
          "SHIPPED",
          "OUT_FOR_DELIVERY",
          "DELIVERED",
          "CANCELLED",
          "RETURN_REQUESTED",
          "RETURNED",
        ],
        message: "Invalid order status",
      },

      default: "PLACED",

      index: true,
    },

    /* =====================================================
       ORDER STATUS HISTORY
    ===================================================== */

    orderStatusHistory: {
      type: [orderStatusHistorySchema],
      default: [],
    },

    /* =====================================================
       ADMIN NOTE
    ===================================================== */

    adminNote: {
      type: String,
      default: "",
      trim: true,
    },

    /* =====================================================
       ORDER AMOUNT DETAILS
    ===================================================== */

    subtotal: {
      type: Number,
      required: [true, "Subtotal is required"],
      min: [0, "Subtotal cannot be negative"],
    },

    shippingCharge: {
      type: Number,
      default: 0,
      min: [0, "Shipping charge cannot be negative"],
    },

    discount: {
      type: Number,
      default: 0,
      min: [0, "Discount cannot be negative"],
    },

    totalAmount: {
      type: Number,
      required: [true, "Total amount is required"],
      min: [0, "Total amount cannot be negative"],
    },

    couponCode: {
      type: String,
      default: "",
      trim: true,
      uppercase: true,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
    },

    /* =====================================================
       COURIER AND TRACKING DETAILS
    ===================================================== */

    trackingId: {
      type: String,
      default: "",
      trim: true,
      index: true,
    },

    courierName: {
      type: String,
      default: "",
      trim: true,
    },

    trackingUrl: {
      type: String,
      default: "",
      trim: true,
    },

    shippedAt: {
      type: Date,
      default: null,
    },

    expectedDeliveryAt: {
      type: Date,
      default: null,
    },

    outForDeliveryAt: {
      type: Date,
      default: null,
    },

    deliveredAt: {
      type: Date,
      default: null,
    },

    /* =====================================================
       CURRENT LOCATION
    ===================================================== */

    currentLocation: {
      type: String,
      default: "",
      trim: true,
    },

    locationUpdatedAt: {
      type: Date,
      default: null,
    },

    /* =====================================================
       TRACKING HISTORY
    ===================================================== */

    trackingHistory: {
      type: [trackingHistorySchema],
      default: [],
    },

    /* =====================================================
       CANCELLATION DETAILS
    ===================================================== */

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancellationReason: {
      type: String,
      default: "",
      trim: true,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* =====================================================
       RETURN DETAILS
    ===================================================== */

    returnReason: {
      type: String,
      default: "",
      trim: true,
    },

    returnRequestedAt: {
      type: Date,
      default: null,
    },

    returnedAt: {
      type: Date,
      default: null,
    },

    returnNote: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

/* =========================================================
   GENERATE ORDER NUMBER
========================================================= */

orderSchema.pre("save", function () {
  if (!this.orderNumber) {
    const timestamp = Date.now();

    const randomNumber = Math.floor(
      1000 + Math.random() * 9000,
    );

    this.orderNumber = `JHN-${timestamp}-${randomNumber}`;
  }
});

/* =========================================================
   AUTOMATIC PAYMENT DATE
========================================================= */

orderSchema.pre("save", function () {
  if (
    this.isModified("paymentStatus") &&
    ["RECEIVED", "PAID"].includes(
      this.paymentStatus,
    ) &&
    !this.paymentReceivedAt
  ) {
    this.paymentReceivedAt = new Date();
  }

  if (
    this.isModified("paymentStatus") &&
    !["RECEIVED", "PAID"].includes(
      this.paymentStatus,
    )
  ) {
    this.paymentReceivedAt = null;
  }
});

/* =========================================================
   AUTOMATIC STATUS DATE
========================================================= */

orderSchema.pre("save", function () {
  if (!this.isModified("orderStatus")) {
    return;
  }

  const currentDate = new Date();

  /* -------------------------------------------------------
     SHIPPED
  ------------------------------------------------------- */

  if (
    this.orderStatus === "SHIPPED" &&
    !this.shippedAt
  ) {
    this.shippedAt = currentDate;
  }

  /* -------------------------------------------------------
     OUT FOR DELIVERY
  ------------------------------------------------------- */

  if (
    this.orderStatus === "OUT_FOR_DELIVERY" &&
    !this.outForDeliveryAt
  ) {
    this.outForDeliveryAt = currentDate;
  }

  /* -------------------------------------------------------
     DELIVERED
  ------------------------------------------------------- */

  if (
    this.orderStatus === "DELIVERED" &&
    !this.deliveredAt
  ) {
    this.deliveredAt = currentDate;
  }

  /* -------------------------------------------------------
     CANCELLED
  ------------------------------------------------------- */

  if (
    this.orderStatus === "CANCELLED" &&
    !this.cancelledAt
  ) {
    this.cancelledAt = currentDate;
  }

  /* -------------------------------------------------------
     RETURN REQUESTED
  ------------------------------------------------------- */

  if (
    this.orderStatus === "RETURN_REQUESTED" &&
    !this.returnRequestedAt
  ) {
    this.returnRequestedAt = currentDate;
  }

  /* -------------------------------------------------------
     RETURNED
  ------------------------------------------------------- */

  if (
    this.orderStatus === "RETURNED" &&
    !this.returnedAt
  ) {
    this.returnedAt = currentDate;
  }
});

/* =========================================================
   EXPORT MODEL
========================================================= */

const Order =
  mongoose.models.Order ||
  mongoose.model("Order", orderSchema);

export default Order;