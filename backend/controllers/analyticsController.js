import Order from "../models/Order.js";
import Product from "../models/Product.js";

const getDateRange = (req) => {
  const { startDate, endDate } = req.query;

  const end = endDate
    ? new Date(`${endDate}T23:59:59.999`)
    : new Date();

  const start = startDate
    ? new Date(`${startDate}T00:00:00.000`)
    : new Date(end.getTime() - 30 * 24 * 60 * 60 * 1000);

  return { start, end };
};

const getOrderFilter = (start, end) => ({
  createdAt: {
    $gte: start,
    $lte: end,
  },
  orderStatus: {
    $nin: ["CANCELLED", "RETURNED"],
  },
});

/* =========================================================
   ANALYTICS OVERVIEW
========================================================= */

export const getAnalyticsOverview = async (req, res) => {
  try {
    const { start, end } = getDateRange(req);
    const filter = getOrderFilter(start, end);

    const [
      orderSummary,
      revenueSummary,
      paymentSummary,
      statusSummary,
      customerSummary,
      inventorySummary,
    ] = await Promise.all([
      Order.aggregate([
        { $match: filter },

        {
          $group: {
            _id: null,

            totalOrders: {
              $sum: 1,
            },

            totalItems: {
              $sum: {
                $reduce: {
                  input: "$items",
                  initialValue: 0,

                  in: {
                    $add: [
                      "$$value",
                      {
                        $ifNull: ["$$this.quantity", 0],
                      },
                    ],
                  },
                },
              },
            },
          },
        },
      ]),

      Order.aggregate([
        { $match: filter },

        {
          $group: {
            _id: null,

            revenue: {
              $sum: {
                $ifNull: ["$totalAmount", 0],
              },
            },

            subtotal: {
              $sum: {
                $ifNull: ["$subtotal", 0],
              },
            },

            shipping: {
              $sum: {
                $ifNull: ["$shippingCharge", 0],
              },
            },

            discount: {
              $sum: {
                $ifNull: ["$discount", 0],
              },
            },
          },
        },
      ]),

      Order.aggregate([
        { $match: filter },

        {
          $group: {
            _id: "$paymentMethod",

            count: {
              $sum: 1,
            },

            amount: {
              $sum: {
                $ifNull: ["$totalAmount", 0],
              },
            },
          },
        },

        {
          $sort: {
            amount: -1,
          },
        },
      ]),

      Order.aggregate([
        { $match: filter },

        {
          $group: {
            _id: "$orderStatus",

            count: {
              $sum: 1,
            },

            amount: {
              $sum: {
                $ifNull: ["$totalAmount", 0],
              },
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),

      Order.aggregate([
        { $match: filter },

        {
          $group: {
            _id: "$user",
          },
        },

        {
          $count: "totalCustomers",
        },
      ]),

      /*
       * Inventory is NOT affected by sales date filters.
       * It represents the current Product collection.
       */

      Product.aggregate([
        {
          $group: {
            _id: null,

            totalProducts: {
              $sum: 1,
            },

            activeProducts: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      { $eq: ["$active", true] },
                      { $eq: ["$isActive", true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },

            totalStock: {
              $sum: {
                $ifNull: ["$stock", 0],
              },
            },

            lowStockProducts: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $gt: [
                          {
                            $ifNull: ["$stock", 0],
                          },
                          0,
                        ],
                      },

                      {
                        $lte: [
                          {
                            $ifNull: ["$stock", 0],
                          },
                          5,
                        ],
                      },
                    ],
                  },

                  1,
                  0,
                ],
              },
            },

            outOfStockProducts: {
              $sum: {
                $cond: [
                  {
                    $lte: [
                      {
                        $ifNull: ["$stock", 0],
                      },
                      0,
                    ],
                  },

                  1,
                  0,
                ],
              },
            },

            totalInventoryValue: {
              $sum: {
                $multiply: [
                  {
                    $ifNull: ["$stock", 0],
                  },

                  {
                    $ifNull: ["$price", 0],
                  },
                ],
              },
            },
          },
        },
      ]),
    ]);

    const orders = orderSummary[0] || {
      totalOrders: 0,
      totalItems: 0,
    };

    const revenue = revenueSummary[0] || {
      revenue: 0,
      subtotal: 0,
      shipping: 0,
      discount: 0,
    };

    const customers = customerSummary[0] || {
      totalCustomers: 0,
    };

    const inventory = inventorySummary[0] || {
      totalProducts: 0,
      activeProducts: 0,
      totalStock: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      totalInventoryValue: 0,
    };

    return res.status(200).json({
      success: true,

      dateRange: {
        start,
        end,
      },

      overview: {
        totalOrders: Number(orders.totalOrders || 0),

        totalItems: Number(orders.totalItems || 0),

        totalCustomers: Number(
          customers.totalCustomers || 0
        ),

        revenue: Number(
          revenue.revenue || 0
        ),

        subtotal: Number(
          revenue.subtotal || 0
        ),

        shipping: Number(
          revenue.shipping || 0
        ),

        discount: Number(
          revenue.discount || 0
        ),

        averageOrderValue:
          Number(orders.totalOrders || 0) > 0
            ? Number(
                (
                  Number(revenue.revenue || 0) /
                  Number(orders.totalOrders || 1)
                ).toFixed(2)
              )
            : 0,

        totalProducts: Number(
          inventory.totalProducts || 0
        ),

        activeProducts: Number(
          inventory.activeProducts || 0
        ),

        totalStock: Number(
          inventory.totalStock || 0
        ),

        lowStockProducts: Number(
          inventory.lowStockProducts || 0
        ),

        outOfStockProducts: Number(
          inventory.outOfStockProducts || 0
        ),

        totalInventoryValue: Number(
          inventory.totalInventoryValue || 0
        ),

        inventoryValue: Number(
          inventory.totalInventoryValue || 0
        ),
      },

      paymentSummary,

      statusSummary,
    });
  } catch (error) {
    console.error(
      "Analytics overview error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch analytics overview",

      error: error.message,
    });
  }
};

/* =========================================================
   SALES ANALYTICS
========================================================= */

export const getSalesAnalytics = async (req, res) => {
  try {
    const { start, end } = getDateRange(req);

    const filter = getOrderFilter(start, end);

    const sales = await Order.aggregate([
      {
        $match: filter,
      },

      {
        $group: {
          _id: {
            year: {
              $year: "$createdAt",
            },

            month: {
              $month: "$createdAt",
            },

            day: {
              $dayOfMonth: "$createdAt",
            },
          },

          revenue: {
            $sum: {
              $ifNull: ["$totalAmount", 0],
            },
          },

          orders: {
            $sum: 1,
          },

          items: {
            $sum: {
              $reduce: {
                input: "$items",

                initialValue: 0,

                in: {
                  $add: [
                    "$$value",

                    {
                      $ifNull: [
                        "$$this.quantity",
                        0,
                      ],
                    },
                  ],
                },
              },
            },
          },
        },
      },

      {
        $project: {
          _id: 0,

          date: {
            $dateFromParts: {
              year: "$_id.year",
              month: "$_id.month",
              day: "$_id.day",
            },
          },

          revenue: 1,

          orders: 1,

          items: 1,
        },
      },

      {
        $sort: {
          date: 1,
        },
      },
    ]);

    const totalRevenue = sales.reduce(
      (total, item) =>
        total + Number(item.revenue || 0),
      0
    );

    const totalOrders = sales.reduce(
      (total, item) =>
        total + Number(item.orders || 0),
      0
    );

    const totalItems = sales.reduce(
      (total, item) =>
        total + Number(item.items || 0),
      0
    );

    return res.status(200).json({
      success: true,

      dateRange: {
        start,
        end,
      },

      sales,

      totalRevenue,

      revenue: totalRevenue,

      totalSales: totalRevenue,

      totalOrders,

      orders: totalOrders,

      totalItems,
    });
  } catch (error) {
    console.error(
      "Sales analytics error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch sales analytics",

      error: error.message,
    });
  }
};

/* =========================================================
   ORDER ANALYTICS
========================================================= */

export const getOrderAnalytics = async (
  req,
  res
) => {
  try {
    const { start, end } = getDateRange(req);

    const [
      orderStatus,
      paymentStatus,
      paymentMethods,
    ] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: start,
              $lte: end,
            },
          },
        },

        {
          $group: {
            _id: "$orderStatus",

            count: {
              $sum: 1,
            },

            amount: {
              $sum: {
                $ifNull: ["$totalAmount", 0],
              },
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),

      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: start,
              $lte: end,
            },
          },
        },

        {
          $group: {
            _id: "$paymentStatus",

            count: {
              $sum: 1,
            },

            amount: {
              $sum: {
                $ifNull: ["$totalAmount", 0],
              },
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),

      Order.aggregate([
        {
          $match: {
            createdAt: {
              $gte: start,
              $lte: end,
            },
          },
        },

        {
          $group: {
            _id: "$paymentMethod",

            count: {
              $sum: 1,
            },

            amount: {
              $sum: {
                $ifNull: ["$totalAmount", 0],
              },
            },
          },
        },

        {
          $sort: {
            count: -1,
          },
        },
      ]),
    ]);

    return res.status(200).json({
      success: true,

      dateRange: {
        start,
        end,
      },

      orderStatus,

      paymentStatus,

      paymentMethods,
    });
  } catch (error) {
    console.error(
      "Order analytics error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch order analytics",

      error: error.message,
    });
  }
};

/* =========================================================
   PRODUCT ANALYTICS
========================================================= */

export const getProductAnalytics = async (
  req,
  res
) => {
  try {
    const { start, end } = getDateRange(req);

    const filter = getOrderFilter(start, end);

    const products = await Order.aggregate([
      {
        $match: filter,
      },

      {
        $unwind: "$items",
      },

      {
        $group: {
          _id: "$items.product",

          productName: {
            $first: "$items.name",
          },

          quantitySold: {
            $sum: {
              $ifNull: [
                "$items.quantity",
                0,
              ],
            },
          },

          revenue: {
            $sum: {
              $ifNull: [
                "$items.subtotal",
                0,
              ],
            },
          },

          orders: {
            $sum: 1,
          },
        },
      },

      {
        $lookup: {
          from: "products",

          localField: "_id",

          foreignField: "_id",

          as: "product",
        },
      },

      {
        $unwind: {
          path: "$product",

          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 1,

          productName: 1,

          quantitySold: 1,

          revenue: 1,

          orders: 1,

          stock: {
            $ifNull: [
              "$product.stock",
              0,
            ],
          },

          price: {
            $ifNull: [
              "$product.price",
              0,
            ],
          },

          rating: "$product.rating",

          reviews: "$product.reviews",

          category: "$product.category",

          brand: "$product.brand",

          images: "$product.images",

          active: "$product.active",

          isActive: "$product.isActive",
        },
      },

      {
        $sort: {
          revenue: -1,
        },
      },
    ]);

    return res.status(200).json({
      success: true,

      dateRange: {
        start,
        end,
      },

      products,
    });
  } catch (error) {
    console.error(
      "Product analytics error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch product analytics",

      error: error.message,
    });
  }
};

/* =========================================================
   CUSTOMER ANALYTICS
========================================================= */

export const getCustomerAnalytics = async (
  req,
  res
) => {
  try {
    const { start, end } = getDateRange(req);

    const filter = getOrderFilter(start, end);

    const customers = await Order.aggregate([
      {
        $match: filter,
      },

      {
        $group: {
          _id: "$user",

          orders: {
            $sum: 1,
          },

          totalSpent: {
            $sum: {
              $ifNull: [
                "$totalAmount",
                0,
              ],
            },
          },

          lastOrderDate: {
            $max: "$createdAt",
          },
        },
      },

      {
        $lookup: {
          from: "users",

          localField: "_id",

          foreignField: "_id",

          as: "user",
        },
      },

      {
        $unwind: {
          path: "$user",

          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $project: {
          _id: 1,

          name: "$user.name",

          email: "$user.email",

          orders: 1,

          totalSpent: 1,

          lastOrderDate: 1,
        },
      },

      {
        $sort: {
          totalSpent: -1,
        },
      },
    ]);

    const newCustomerCount = customers.filter(
      (customer) => {
        if (!customer.lastOrderDate) {
          return false;
        }

        const orderDate = new Date(
          customer.lastOrderDate
        );

        return orderDate >= start;
      }
    ).length;

    const returningCustomerCount =
      Math.max(
        0,
        customers.length -
          newCustomerCount
      );

    return res.status(200).json({
      success: true,

      dateRange: {
        start,
        end,
      },

      customers,

      totalCustomers: customers.length,

      customerCount: customers.length,

      newCustomers:
        newCustomerCount,

      returningCustomers:
        returningCustomerCount,
    });
  } catch (error) {
    console.error(
      "Customer analytics error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch customer analytics",

      error: error.message,
    });
  }
};

/* =========================================================
   INVENTORY ANALYTICS
========================================================= */

export const getInventoryAnalytics = async (
  req,
  res
) => {
  try {
    /*
     * IMPORTANT:
     *
     * Inventory is based on the CURRENT Product
     * collection.
     *
     * It is NOT filtered by sales date.
     *
     * This endpoint returns:
     *
     * 1. All products
     * 2. Current stock
     * 3. Product price
     * 4. SKU
     * 5. Images
     * 6. Active status
     * 7. Low-stock products
     * 8. Out-of-stock products
     * 9. Inventory summary
     */

    const [
      summaryResult,
      products,
      lowStockProducts,
      outOfStockProducts,
    ] = await Promise.all([
      /* -----------------------------------------
         INVENTORY SUMMARY
      ----------------------------------------- */

      Product.aggregate([
        {
          $group: {
            _id: null,

            totalProducts: {
              $sum: 1,
            },

            activeProducts: {
              $sum: {
                $cond: [
                  {
                    $or: [
                      {
                        $eq: [
                          "$active",
                          true,
                        ],
                      },

                      {
                        $eq: [
                          "$isActive",
                          true,
                        ],
                      },
                    ],
                  },

                  1,

                  0,
                ],
              },
            },

            totalStock: {
              $sum: {
                $ifNull: [
                  "$stock",
                  0,
                ],
              },
            },

            lowStockCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      {
                        $gt: [
                          {
                            $ifNull: [
                              "$stock",
                              0,
                            ],
                          },

                          0,
                        ],
                      },

                      {
                        $lte: [
                          {
                            $ifNull: [
                              "$stock",
                              0,
                            ],
                          },

                          5,
                        ],
                      },
                    ],
                  },

                  1,

                  0,
                ],
              },
            },

            outOfStockCount: {
              $sum: {
                $cond: [
                  {
                    $lte: [
                      {
                        $ifNull: [
                          "$stock",
                          0,
                        ],
                      },

                      0,
                    ],
                  },

                  1,

                  0,
                ],
              },
            },

            totalInventoryValue: {
              $sum: {
                $multiply: [
                  {
                    $ifNull: [
                      "$stock",
                      0,
                    ],
                  },

                  {
                    $ifNull: [
                      "$price",
                      0,
                    ],
                  },
                ],
              },
            },
          },
        },
      ]),

      /* -----------------------------------------
         ALL PRODUCTS
      ----------------------------------------- */

      Product.find({})
        .select(
          [
            "_id",
            "name",
            "title",
            "productName",
            "sku",
            "brand",
            "category",
            "price",
            "sellingPrice",
            "stock",
            "quantity",
            "availableStock",
            "images",
            "image",
            "active",
            "isActive",
          ].join(" ")
        )
        .sort({
          name: 1,
        })
        .lean(),

      /* -----------------------------------------
         LOW STOCK PRODUCTS
      ----------------------------------------- */

      Product.find({
        $or: [
          {
            active: true,
          },

          {
            isActive: true,
          },
        ],

        stock: {
          $gt: 0,

          $lte: 5,
        },
      })
        .select(
          [
            "_id",
            "name",
            "title",
            "productName",
            "sku",
            "brand",
            "category",
            "price",
            "sellingPrice",
            "stock",
            "quantity",
            "availableStock",
            "images",
            "image",
            "active",
            "isActive",
          ].join(" ")
        )
        .sort({
          stock: 1,

          name: 1,
        })
        .lean(),

      /* -----------------------------------------
         OUT OF STOCK PRODUCTS
      ----------------------------------------- */

      Product.find({
        $or: [
          {
            active: true,
          },

          {
            isActive: true,
          },
        ],

        $or: [
          {
            stock: 0,
          },

          {
            stock: {
              $exists: false,
            },
          },

          {
            stock: null,
          },

          {
            stock: {
              $lt: 0,
            },
          },
        ],
      })
        .select(
          [
            "_id",
            "name",
            "title",
            "productName",
            "sku",
            "brand",
            "category",
            "price",
            "sellingPrice",
            "stock",
            "quantity",
            "availableStock",
            "images",
            "image",
            "active",
            "isActive",
          ].join(" ")
        )
        .sort({
          name: 1,
        })
        .lean(),
    ]);

    /* -----------------------------------------
       NORMALIZE SUMMARY
    ----------------------------------------- */

    const summary =
      summaryResult[0] || {
        totalProducts: 0,

        activeProducts: 0,

        totalStock: 0,

        lowStockCount: 0,

        outOfStockCount: 0,

        totalInventoryValue: 0,
      };

    const totalProducts = Number(
      summary.totalProducts || 0
    );

    const activeProducts = Number(
      summary.activeProducts || 0
    );

    const totalStock = Number(
      summary.totalStock || 0
    );

    const lowStockCount = Number(
      summary.lowStockCount || 0
    );

    const outOfStockCount = Number(
      summary.outOfStockCount || 0
    );

    const inventoryValue = Number(
      summary.totalInventoryValue || 0
    );

    /* -----------------------------------------
       RESPONSE
    ----------------------------------------- */

    return res.status(200).json({
      success: true,

      /*
       * MAIN PRODUCT ARRAY
       *
       * Your AnalyticsManager uses this.
       */

      products,

      /*
       * Compatibility aliases.
       */

      inventory: products,

      items: products,

      data: products,

      /*
       * SUMMARY OBJECT
       */

      summary: {
        totalProducts,

        productCount:
          totalProducts,

        total:

          totalProducts,

        activeProducts,

        totalStock,

        totalInventoryStock:
          totalStock,

        totalInventoryValue:
          inventoryValue,

        inventoryValue,

        totalValue:
          inventoryValue,

        lowStockProducts:
          lowStockCount,

        lowStock:
          lowStockCount,

        lowStockCount,

        outOfStockProducts:
          outOfStockCount,

        outOfStock:
          outOfStockCount,

        outOfStockCount,
      },

      /*
       * TOP-LEVEL VALUES
       *
       * These make the API compatible with
       * different frontend implementations.
       */

      totalProducts,

      productCount:
        totalProducts,

      total:
        totalProducts,

      activeProducts,

      totalStock,

      totalInventoryStock:
        totalStock,

      totalInventoryValue:
        inventoryValue,

      inventoryValue,

      totalValue:
        inventoryValue,

      lowStockProducts:
        lowStockCount,

      lowStock:
        lowStockCount,

      lowStockCount,

      outOfStockProducts:
        outOfStockCount,

      outOfStock:
        outOfStockCount,

      outOfStockCount,

      /*
       * Separate lists.
       */

      lowStockProductsList:
        lowStockProducts,

      outOfStockProductsList:
        outOfStockProducts,

      lowStockProductsData:
        lowStockProducts,

      outOfStockProductsData:
        outOfStockProducts,
    });
  } catch (error) {
    console.error(
      "Inventory analytics error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch inventory analytics",

      error: error.message,
    });
  }
};

/* =========================================================
   REVIEW ANALYTICS
========================================================= */

export const getReviewAnalytics = async (
  req,
  res
) => {
  try {
    const [
      summary,
      ratingDistribution,
      topRated,
      lowestRated,
    ] = await Promise.all([
      /* -----------------------------------------
         REVIEW SUMMARY
      ----------------------------------------- */

      Product.aggregate([
        {
          $group: {
            _id: null,

            totalReviews: {
              $sum: {
                $ifNull: [
                  "$reviews",
                  0,
                ],
              },
            },

            averageRating: {
              $avg: {
                $ifNull: [
                  "$rating",
                  0,
                ],
              },
            },

            productsWithReviews: {
              $sum: {
                $cond: [
                  {
                    $gt: [
                      {
                        $ifNull: [
                          "$reviews",
                          0,
                        ],
                      },

                      0,
                    ],
                  },

                  1,

                  0,
                ],
              },
            },
          },
        },
      ]),

      /* -----------------------------------------
         RATING DISTRIBUTION
      ----------------------------------------- */

      Product.aggregate([
        {
          $unwind: "$reviewList",
        },

        {
          $group: {
            _id: "$reviewList.rating",

            count: {
              $sum: 1,
            },
          },
        },

        {
          $sort: {
            _id: 1,
          },
        },
      ]),

      /* -----------------------------------------
         TOP RATED
      ----------------------------------------- */

      Product.find({
        reviews: {
          $gt: 0,
        },
      })
        .select(
          "name brand category rating reviews"
        )
        .sort({
          rating: -1,

          reviews: -1,
        })
        .limit(10)
        .lean(),

      /* -----------------------------------------
         LOWEST RATED
      ----------------------------------------- */

      Product.find({
        reviews: {
          $gt: 0,
        },
      })
        .select(
          "name brand category rating reviews"
        )
        .sort({
          rating: 1,

          reviews: -1,
        })
        .limit(10)
        .lean(),
    ]);

    const reviewSummary =
      summary[0] || {
        totalReviews: 0,

        averageRating: 0,

        productsWithReviews: 0,
      };

    return res.status(200).json({
      success: true,

      summary: {
        totalReviews: Number(
          reviewSummary.totalReviews || 0
        ),

        averageRating: Number(
          reviewSummary.averageRating || 0
        ),

        productsWithReviews: Number(
          reviewSummary.productsWithReviews ||
            0
        ),
      },

      ratingDistribution,

      topRated,

      lowestRated,
    });
  } catch (error) {
    console.error(
      "Review analytics error:",
      error
    );

    return res.status(500).json({
      success: false,

      message:
        "Failed to fetch review analytics",

      error: error.message,
    });
  }
};