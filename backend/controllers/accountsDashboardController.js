import mongoose from "mongoose";

import Order from "../models/Order.js";
import Product from "../models/Product.js";

import {
  createPdfReport,
  createExcelReport,
} from "../services/reportExportService.js";

/* =========================================================
   HELPERS
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
   ORDER TOTAL
========================================================= */

const getOrderTotal = (order) => {
  return Number(
    order?.totalAmount || 0,
  );
};

/* =========================================================
   CUSTOMER NAME
========================================================= */

const getCustomerName = (order) => {
  return (
    order?.user?.name ||
    order?.shippingAddress?.fullName ||
    "Customer"
  );
};

/* =========================================================
   ACCOUNTS OVERVIEW
   GET /api/accounts-dashboard/overview

   READ ONLY

   Returns:
   - Total orders
   - Total sales
   - Paid amount
   - Pending payment
   - Refunded amount
   - Cancelled amount
   - Total customers
   - Total products
========================================================= */

export const getAccountsOverview = async (
  req,
  res,
) => {
  try {
    const [
      orderStats,
      customerStats,
      productCount,
    ] = await Promise.all([
      Order.aggregate([
        {
          $group: {
            _id: null,

            /* =================================================
               TOTAL ORDERS
            ================================================= */

            totalOrders: {
              $sum: 1,
            },

            /* =================================================
               TOTAL SALES

               Cancelled orders are not included.
            ================================================= */

            totalSales: {
              $sum: {
                $cond: [
                  {
                    $ne: [
                      "$orderStatus",
                      "CANCELLED",
                    ],
                  },

                  "$totalAmount",

                  0,
                ],
              },
            },

            /* =================================================
               PAID AMOUNT
            ================================================= */

            paidAmount: {
              $sum: {
                $cond: [
                  {
                    $in: [
                      "$paymentStatus",
                      [
                        "PAID",
                        "RECEIVED",
                      ],
                    ],
                  },

                  "$totalAmount",

                  0,
                ],
              },
            },

            /* =================================================
               PENDING AMOUNT
            ================================================= */

            pendingAmount: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$paymentStatus",
                      "PENDING",
                    ],
                  },

                  "$totalAmount",

                  0,
                ],
              },
            },

            /* =================================================
               REFUNDED AMOUNT
            ================================================= */

            refundedAmount: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$paymentStatus",
                      "REFUNDED",
                    ],
                  },

                  "$totalAmount",

                  0,
                ],
              },
            },

            /* =================================================
               CANCELLED AMOUNT
            ================================================= */

            cancelledAmount: {
              $sum: {
                $cond: [
                  {
                    $eq: [
                      "$orderStatus",
                      "CANCELLED",
                    ],
                  },

                  "$totalAmount",

                  0,
                ],
              },
            },
          },
        },
      ]),

      /* =====================================================
         UNIQUE CUSTOMERS
      ===================================================== */

      Order.distinct(
        "user",
      ),

      /* =====================================================
         ACTIVE PRODUCTS
      ===================================================== */

      Product.countDocuments({
        isActive: {
          $ne: false,
        },
      }),
    ]);

    const stats =
      orderStats[0] || {
        totalOrders: 0,
        totalSales: 0,
        paidAmount: 0,
        pendingAmount: 0,
        refundedAmount: 0,
        cancelledAmount: 0,
      };

    return res.status(200).json({
      success: true,

      overview: {
        totalOrders: Number(
          stats.totalOrders || 0,
        ),

        totalSales: Number(
          stats.totalSales || 0,
        ),

        paidAmount: Number(
          stats.paidAmount || 0,
        ),

        pendingAmount: Number(
          stats.pendingAmount || 0,
        ),

        refundedAmount: Number(
          stats.refundedAmount || 0,
        ),

        cancelledAmount: Number(
          stats.cancelledAmount || 0,
        ),

        totalCustomers:
          customerStats.length,

        totalProducts:
          productCount,
      },
    });
  } catch (error) {
    console.error(
      "Accounts overview error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch accounts overview",
    });
  }
};

/* =========================================================
   SALES REPORT
   GET /api/accounts-dashboard/sales

   Optional query:
   ?from=2026-09-01
   &to=2026-09-30

   READ ONLY

   Returns:
   - Summary
   - Daily sales
   - Payment breakdown
   - Status breakdown
========================================================= */

export const getAccountsSales = async (
  req,
  res,
) => {
  try {
    const {
      from,
      to,
    } = req.query || {};

    /* =======================================================
       BASE FILTER

       Cancelled orders are excluded from sales.
    ======================================================= */

    const match = {
      orderStatus: {
        $ne: "CANCELLED",
      },
    };

    /* =======================================================
       DATE FILTER
    ======================================================= */

    if (
      from ||
      to
    ) {
      match.createdAt = {};

      /* =====================================================
         FROM DATE
      ===================================================== */

      if (from) {
        const fromDate =
          new Date(
            `${String(
              from,
            )}T00:00:00.000`,
          );

        if (
          Number.isNaN(
            fromDate.getTime(),
          )
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Invalid from date",
          });
        }

        fromDate.setHours(
          0,
          0,
          0,
          0,
        );

        match.createdAt.$gte =
          fromDate;
      }

      /* =====================================================
         TO DATE
      ===================================================== */

      if (to) {
        const toDate =
          new Date(
            `${String(
              to,
            )}T23:59:59.999`,
          );

        if (
          Number.isNaN(
            toDate.getTime(),
          )
        ) {
          return res.status(400).json({
            success: false,

            message:
              "Invalid to date",
          });
        }

        toDate.setHours(
          23,
          59,
          59,
          999,
        );

        match.createdAt.$lte =
          toDate;
      }
    }

    /* =======================================================
       AGGREGATIONS
    ======================================================= */

    const [
      summary,
      dailySales,
      paymentBreakdown,
      statusBreakdown,
    ] = await Promise.all([
      /* =====================================================
         SUMMARY
      ===================================================== */

      Order.aggregate([
        {
          $match: match,
        },

        {
          $group: {
            _id: null,

            orders: {
              $sum: 1,
            },

            sales: {
              $sum: "$totalAmount",
            },

            averageOrderValue: {
              $avg: "$totalAmount",
            },
          },
        },
      ]),

      /* =====================================================
         DAILY SALES
      ===================================================== */

      Order.aggregate([
        {
          $match: match,
        },

        {
          $group: {
            _id: {
              $dateToString: {
                format:
                  "%Y-%m-%d",

                date:
                  "$createdAt",
              },
            },

            orders: {
              $sum: 1,
            },

            sales: {
              $sum:
                "$totalAmount",
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },
      ]),

      /* =====================================================
         PAYMENT BREAKDOWN
      ===================================================== */

      Order.aggregate([
        {
          $match: match,
        },

        {
          $group: {
            _id:
              "$paymentStatus",

            orders: {
              $sum: 1,
            },

            amount: {
              $sum:
                "$totalAmount",
            },
          },
        },

        {
          $sort: {
            amount: -1,
          },
        },
      ]),

      /* =====================================================
         ORDER STATUS BREAKDOWN
      ===================================================== */

      Order.aggregate([
        {
          $match: match,
        },

        {
          $group: {
            _id:
              "$orderStatus",

            orders: {
              $sum: 1,
            },

            amount: {
              $sum:
                "$totalAmount",
            },
          },
        },

        {
          $sort: {
            orders: -1,
          },
        },
      ]),
    ]);

    const result =
      summary[0] || {
        orders: 0,
        sales: 0,
        averageOrderValue: 0,
      };

    /* =======================================================
       FRONTEND-FRIENDLY RESPONSE
    ======================================================= */

    const salesSummary = {
      orders: Number(
        result.orders || 0,
      ),

      sales: Number(
        result.sales || 0,
      ),

      averageOrderValue:
        Number(
          result.averageOrderValue ||
            0,
        ),
    };

    return res.status(200).json({
      success: true,

      /* -----------------------------------------------------
         CURRENT RESPONSE FORMAT
      ----------------------------------------------------- */

      summary:
        salesSummary,

      dailySales,

      paymentBreakdown,

      statusBreakdown,

      /* -----------------------------------------------------
         FRONTEND COMPATIBILITY
      ----------------------------------------------------- */

      data: {
        summary:
          salesSummary,

        dailySales,

        paymentBreakdown,

        statusBreakdown,
      },
    });
  } catch (error) {
    console.error(
      "Accounts sales error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch sales report",
    });
  }
};

/* =========================================================
   GET ORDERS
   GET /api/accounts-dashboard/orders

   READ ONLY

   Supported query:
   - page
   - limit
   - status
   - paymentStatus
   - search
========================================================= */

export const getAccountsOrders = async (
  req,
  res,
) => {
  try {
    const {
      status,
      paymentStatus,
      search,
      page = 1,
      limit = 20,
    } = req.query || {};

    /* =======================================================
       PAGINATION
    ======================================================= */

    const currentPage =
      Math.max(
        1,
        Number(page) || 1,
      );

    const perPage =
      Math.min(
        100,

        Math.max(
          1,
          Number(limit) || 20,
        ),
      );

    /* =======================================================
       FILTER
    ======================================================= */

    const filter = {};

    /* =======================================================
       ORDER STATUS
    ======================================================= */

    if (
      status &&
      ORDER_STATUSES.includes(
        String(status),
      )
    ) {
      filter.orderStatus =
        String(status);
    }

    /* =======================================================
       PAYMENT STATUS
    ======================================================= */

    if (
      paymentStatus &&
      PAYMENT_STATUSES.includes(
        String(paymentStatus),
      )
    ) {
      filter.paymentStatus =
        String(paymentStatus);
    }

    /* =======================================================
       SEARCH
    ======================================================= */

    if (search) {
      const normalizedSearch =
        String(search).trim();

      if (
        normalizedSearch
      ) {
        filter.$or = [
          {
            orderNumber: {
              $regex:
                normalizedSearch,

              $options: "i",
            },
          },

          {
            trackingId: {
              $regex:
                normalizedSearch,

              $options: "i",
            },
          },

          {
            "shippingAddress.fullName":
              {
                $regex:
                  normalizedSearch,

                $options: "i",
              },
          },

          {
            "shippingAddress.phone":
              {
                $regex:
                  normalizedSearch,

                $options: "i",
              },
          },

          {
            "user.name": {
              $regex:
                normalizedSearch,

              $options: "i",
            },
          },

          {
            "user.email": {
              $regex:
                normalizedSearch,

              $options: "i",
            },
          },
        ];
      }
    }

    /* =======================================================
       SKIP
    ======================================================= */

    const skip =
      (currentPage - 1) *
      perPage;

    /* =======================================================
       FETCH ORDERS
    ======================================================= */

    const [
      orders,
      total,
    ] = await Promise.all([
      Order.find(filter)
        .populate(
          "user",
          "name email phone",
        )
        .sort({
          createdAt: -1,
        })
        .skip(skip)
        .limit(perPage)
        .lean(),

      Order.countDocuments(
        filter,
      ),
    ]);

    return res.status(200).json({
      success: true,

      pagination: {
        page:
          currentPage,

        limit:
          perPage,

        total,

        totalPages:
          Math.ceil(
            total /
              perPage,
          ),
      },

      orders,
    });
  } catch (error) {
    console.error(
      "Accounts orders error:",
      error,
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch accounts orders",
    });
  }
};

/* =========================================================
   GET SINGLE ORDER
   GET /api/accounts-dashboard/orders/:id

   READ ONLY

   Returns:
   - Customer details
   - Order details
   - Payment information
   - Cancellation information
   - Tracking information
   - Order status history
========================================================= */

export const getAccountsOrderById =
  async (
    req,
    res,
  ) => {
    try {
      const {
        id,
      } = req.params;

      /* =====================================================
         VALIDATE OBJECT ID
      ===================================================== */

      if (
        !mongoose.Types.ObjectId.isValid(
          id,
        )
      ) {
        return res.status(400).json({
          success: false,

          message:
            "Invalid order ID",
        });
      }

      /* =====================================================
         FETCH ORDER
      ===================================================== */

      const order =
        await Order.findById(
          id,
        )
          .populate(
            "user",
            "name email phone",
          )

          .populate(
            "cancelledBy",
            "name email role",
          )

          .populate(
            "orderStatusHistory.updatedBy",
            "name email role",
          )

          .populate(
            "trackingHistory.updatedBy",
            "name email role",
          )

          .lean();

      /* =====================================================
         NOT FOUND
      ===================================================== */

      if (!order) {
        return res.status(404).json({
          success: false,

          message:
            "Order not found",
        });
      }

      return res.status(200).json({
        success: true,

        order,
      });
    } catch (error) {
      console.error(
        "Accounts single order error:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to fetch order",
      });
    }
  };

/* =========================================================
   INVENTORY
   GET /api/accounts-dashboard/inventory

   READ ONLY

   Accounts can see:
   - Product
   - Stock
   - Price
   - Inventory value

   Optional:
   ?search=lipstick
   ?lowStock=true
   ?page=1
   ?limit=50
========================================================= */

export const getAccountsInventory =
  async (
    req,
    res,
  ) => {
    try {
      const {
        search,
        lowStock = "false",
        page = 1,
        limit = 50,
      } = req.query || {};

      /* =====================================================
         PAGINATION
      ===================================================== */

      const currentPage =
        Math.max(
          1,
          Number(page) || 1,
        );

      const perPage =
        Math.min(
          100,

          Math.max(
            1,
            Number(limit) || 50,
          ),
        );

      /* =====================================================
         FILTER
      ===================================================== */

      const filter = {};

      /* =====================================================
         SEARCH
      ===================================================== */

      if (search) {
        const normalizedSearch =
          String(search).trim();

        if (
          normalizedSearch
        ) {
          filter.$or = [
            {
              name: {
                $regex:
                  normalizedSearch,

                $options: "i",
              },
            },

            {
              title: {
                $regex:
                  normalizedSearch,

                $options: "i",
              },
            },

            {
              sku: {
                $regex:
                  normalizedSearch,

                $options: "i",
              },
            },
          ];
        }
      }

      /* =====================================================
         LOW STOCK
      ===================================================== */

      if (
        String(
          lowStock,
        ) === "true"
      ) {
        filter.stock = {
          $lte: 10,
        };
      }

      /* =====================================================
         SKIP
      ===================================================== */

      const skip =
        (currentPage - 1) *
        perPage;

      /* =====================================================
         GET PRODUCTS
      ===================================================== */

      const [
        products,
        total,
      ] = await Promise.all([
        Product.find(filter)
          .select(
            [
              "name",
              "title",
              "sku",
              "price",
              "salePrice",
              "discountPrice",
              "stock",
              "isActive",
              "images",
              "image",
            ].join(" "),
          )

          .sort({
            stock: 1,
            createdAt:
              -1,
          })

          .skip(skip)

          .limit(
            perPage,
          )

          .lean(),

        Product.countDocuments(
          filter,
        ),
      ]);

      /* =====================================================
         PREPARE INVENTORY DATA
      ===================================================== */

      const inventory =
        products.map(
          (
            product,
          ) => {
            const price =
              Number(
                product.salePrice ??
                  product.discountPrice ??
                  product.price ??
                  0,
              );

            const stock =
              Number(
                product.stock ||
                  0,
              );

            const inventoryValue =
              Number(
                (
                  price *
                  stock
                ).toFixed(
                  2,
                ),
              );

            return {
              ...product,

              stock,

              inventoryValue,

              lowStock:
                stock <=
                10,

              outOfStock:
                stock <=
                0,
            };
          },
        );

      const pagination = {
        page:
          currentPage,

        limit:
          perPage,

        total,

        totalPages:
          Math.ceil(
            total /
              perPage,
          ),
      };

      return res.status(200).json({
        success: true,

        pagination,

        /* ---------------------------------------------------
           ORIGINAL RESPONSE
        --------------------------------------------------- */

        inventory,

        /* ---------------------------------------------------
           FRONTEND COMPATIBILITY
        --------------------------------------------------- */

        products:
          inventory,
      });
    } catch (error) {
      console.error(
        "Accounts inventory error:",
        error,
      );

      return res.status(500).json({
        success: false,

        message:
          "Failed to fetch inventory",
      });
    }
  };

/* =========================================================
   SALES REPORT EXPORT HELPERS
========================================================= */

/**
 * Builds the requested Accounts sales report date range.
 *
 * Default:
 * - from = last 30 days
 * - to   = current date
 *
 * Explicit:
 * ?from=YYYY-MM-DD
 * ?to=YYYY-MM-DD
 */
const getAccountsReportDateRange = (
  req,
) => {
  const {
    from,
    to,
  } = req.query || {};

  /* =======================================================
     END DATE
  ======================================================= */

  const end = to
    ? new Date(
        `${String(
          to,
        )}T23:59:59.999`,
      )
    : new Date();

  /* =======================================================
     START DATE
  ======================================================= */

  const start = from
    ? new Date(
        `${String(
          from,
        )}T00:00:00.000`,
      )
    : new Date(
        end.getTime() -
          30 *
            24 *
            60 *
            60 *
            1000,
      );

  /* =======================================================
     VALIDATION
  ======================================================= */

  if (
    Number.isNaN(
      start.getTime(),
    ) ||
    Number.isNaN(
      end.getTime(),
    )
  ) {
    return null;
  }

  /* =======================================================
     DATE ORDER VALIDATION
  ======================================================= */

  if (
    start.getTime() >
    end.getTime()
  ) {
    return null;
  }

  return {
    start,
    end,
  };
};

/* =========================================================
   BUILD ACCOUNTS SALES REPORT
========================================================= */

const buildAccountsSalesReport =
  async (
    req,
  ) => {
    const range =
      getAccountsReportDateRange(
        req,
      );

    if (!range) {
      const error =
        new Error(
          "Invalid report date range",
        );

      error.statusCode =
        400;

      throw error;
    }

    /* =======================================================
       FETCH SALES ORDERS

       Exclude:
       - CANCELLED
       - RETURNED
    ======================================================= */

    const orders =
      await Order.find({
        createdAt: {
          $gte:
            range.start,

          $lte:
            range.end,
        },

        orderStatus: {
          $nin: [
            "CANCELLED",
            "RETURNED",
          ],
        },
      })
        .populate(
          "user",
          "name email phone",
        )
        .sort({
          createdAt:
            -1,
        })
        .lean();

    /* =======================================================
       REPORT ROWS
    ======================================================= */

    const rows =
      orders.map(
        (
          order,
        ) => {
          const itemCount =
            (
              order.items ||
              []
            ).reduce(
              (
                total,
                item,
              ) => {
                return (
                  total +
                  Number(
                    item?.quantity ||
                      0,
                  )
                );
              },
              0,
            );

          return {
            orderNumber:
              order.orderNumber ||
              "",

            customerName:
              getCustomerName(
                order,
              ),

            customerEmail:
              order.user
                ?.email ||
              order.shippingAddress
                ?.email ||
              "",

            customerPhone:
              order.user
                ?.phone ||
              order.shippingAddress
                ?.phone ||
              "",

            orderStatus:
              order.orderStatus ||
              "",

            paymentStatus:
              order.paymentStatus ||
              "",

            paymentMethod:
              order.paymentMethod ||
              "",

            itemCount,

            subtotal:
              Number(
                order.subtotal ||
                  0,
              ),

            shippingCharge:
              Number(
                order.shippingCharge ??
                  order.shippingFee ??
                  0,
              ),

            discount:
              Number(
                order.discount ??
                  order.discountAmount ??
                  0,
              ),

            totalAmount:
              getOrderTotal(
                order,
              ),

            createdAt:
              order.createdAt,
          };
        },
      );

    /* =======================================================
       REPORT SUMMARY
    ======================================================= */

    const summary =
      rows.reduce(
        (
          result,
          row,
        ) => {
          result.totalOrders +=
            1;

          result.totalItems +=
            row.itemCount;

          result.subtotal +=
            row.subtotal;

          result.shippingCharge +=
            row.shippingCharge;

          result.discount +=
            row.discount;

          result.totalAmount +=
            row.totalAmount;

          return result;
        },
        {
          totalOrders: 0,

          totalItems: 0,

          subtotal: 0,

          shippingCharge: 0,

          discount: 0,

          totalAmount: 0,
        },
      );

    return {
      start:
        range.start,

      end:
        range.end,

      summary,

      rows,
    };
  };

/* =========================================================
   SALES REPORT - PDF
   GET /api/accounts-dashboard/sales/export/pdf

   Query:
   ?from=YYYY-MM-DD
   ?to=YYYY-MM-DD
========================================================= */

export const exportAccountsSalesPdf =
  async (
    req,
    res,
  ) => {
    try {
      /* =====================================================
         BUILD REPORT
      ===================================================== */

      const report =
        await buildAccountsSalesReport(
          req,
        );

      /* =====================================================
         CREATE PDF
      ===================================================== */

      const pdfBuffer =
        await createPdfReport(
          report,
        );

      /* =====================================================
         RESPONSE HEADERS
      ===================================================== */

      res.setHeader(
        "Content-Type",
        "application/pdf",
      );

      res.setHeader(
        "Content-Disposition",
        'attachment; filename="accounts-sales-report.pdf"',
      );

      /* =====================================================
         SEND FILE
      ===================================================== */

      return res
        .status(200)
        .send(
          pdfBuffer,
        );
    } catch (error) {
      console.error(
        "Accounts PDF export error:",
        error,
      );

      const statusCode =
        Number(
          error?.statusCode,
        ) || 500;

      return res
        .status(
          statusCode,
        )
        .json({
          success:
            false,

          message:
            error?.message ||
            "Failed to export PDF report",
        });
    }
  };

/* =========================================================
   SALES REPORT - EXCEL
   GET /api/accounts-dashboard/sales/export/excel

   Query:
   ?from=YYYY-MM-DD
   ?to=YYYY-MM-DD
========================================================= */

export const exportAccountsSalesExcel =
  async (
    req,
    res,
  ) => {
    try {
      /* =====================================================
         BUILD REPORT
      ===================================================== */

      const report =
        await buildAccountsSalesReport(
          req,
        );

      /* =====================================================
         CREATE EXCEL
      ===================================================== */

      const excelBuffer =
        await createExcelReport(
          report,
        );

      /* =====================================================
         RESPONSE HEADERS
      ===================================================== */

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );

      res.setHeader(
        "Content-Disposition",
        'attachment; filename="accounts-sales-report.xlsx"',
      );

      /* =====================================================
         SEND FILE
      ===================================================== */

      return res
        .status(200)
        .send(
          excelBuffer,
        );
    } catch (error) {
      console.error(
        "Accounts Excel export error:",
        error,
      );

      const statusCode =
        Number(
          error?.statusCode,
        ) || 500;

      return res
        .status(
          statusCode,
        )
        .json({
          success:
            false,

          message:
            error?.message ||
            "Failed to export Excel report",
        });
    }
  };