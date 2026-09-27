import "dotenv/config";

import dns from "node:dns";
import path from "node:path";
import { fileURLToPath } from "node:url";

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

import connectDB from "./config/db.js";

// --------------------------------------------------
// Authentication and users
// --------------------------------------------------

import authRoutes from "./routes/authRoutes.js";
import adminUserRoutes from "./routes/adminUserRoutes.js";

// --------------------------------------------------
// Partners
// --------------------------------------------------

import partnerRoutes from "./routes/partnerRoutes.js";
import adminPartnerRoutes from "./routes/adminPartnerRoutes.js";

// --------------------------------------------------
// Catalog
// --------------------------------------------------

import categoryRoutes from "./routes/categoryRoutes.js";
import categoryManagerRoutes from "./routes/categoryManagerRoutes.js";
import heroBannerRoutes from "./routes/heroBannerRoutes.js";
import offerRoutes from "./routes/offerRoutes.js";
import newArrivalRoutes from "./routes/newArrivalRoutes.js";
import productRoutes from "./routes/productRoutes.js";
import brandRoutes from "./routes/brandRoutes.js";
import beautyStoryRoutes from "./routes/beautyStoryRoutes.js";

// --------------------------------------------------
// Account and shopping
// --------------------------------------------------

import accountRoutes from "./routes/accountRoutes.js";
import orderRoutes from "./routes/orderRoutes.js";
import adminOrderRoutes from "./routes/adminOrderRoutes.js";
import cartRoutes from "./routes/cartRoutes.js";

// --------------------------------------------------
// Accounts dashboard
// --------------------------------------------------

import accountsDashboardRoutes from "./routes/accountsDashboardRoutes.js";

// --------------------------------------------------
// Logistics dashboard
// --------------------------------------------------

import logisticsDashboardRoutes from "./routes/logisticsDashboardRoutes.js";

// --------------------------------------------------
// Contact
// --------------------------------------------------

import contactRoutes from "./routes/contactRoutes.js";
import adminContactRoutes from "./routes/adminContactRoutes.js";

// --------------------------------------------------
// Admin reports and reviews
// --------------------------------------------------

import analyticsRoutes from "./routes/analyticsRoutes.js";
import salesReportRoutes from "./routes/salesReportRoutes.js";
import reviewRoutes from "./routes/reviewRoutes.js";

// --------------------------------------------------
// DNS configuration
// --------------------------------------------------

dns.setServers(["8.8.8.8", "8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");

// --------------------------------------------------
// App configuration
// --------------------------------------------------

const app = express();

const PORT = Number(process.env.PORT) || 5000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --------------------------------------------------
// CORS configuration
// --------------------------------------------------

const allowedOrigins = [
  // Local development
  "http://localhost:5173",
  "http://localhost:5174",

  // Production frontend
  "https://jihaan-cosmetics.netlify.app",

  // Render environment variable
  process.env.FRONTEND_URL,
].filter(Boolean);

console.log("----------------------------------------");
console.log("Allowed CORS origins:");
console.log(allowedOrigins);
console.log("----------------------------------------");

app.use(
  cors({
    origin: (origin, callback) => {
      // ------------------------------------------------
      // Requests without Origin
      // ------------------------------------------------
      // Allows Postman, server-to-server requests,
      // curl, health checks, etc.
      if (!origin) {
        return callback(null, true);
      }

      // ------------------------------------------------
      // Allowed frontend origin
      // ------------------------------------------------
      if (allowedOrigins.includes(origin)) {
        console.log(`CORS allowed: ${origin}`);
        return callback(null, true);
      }

      // ------------------------------------------------
      // Block unknown origins
      // ------------------------------------------------
      console.warn(`CORS blocked origin: ${origin}`);

      // Do not throw an Express error here.
      // Returning false prevents the CORS header from
      // being added while keeping the server stable.
      return callback(null, false);
    },

    // Required if frontend sends cookies/auth credentials
    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
    ],
  }),
);

// --------------------------------------------------
// Explicit OPTIONS handling
// --------------------------------------------------

app.options("*", cors());

// --------------------------------------------------
// Body parsing middleware
// --------------------------------------------------

app.use(
  express.json({
    limit: "10mb",
  }),
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb",
  }),
);

// --------------------------------------------------
// Cookie parser
// --------------------------------------------------

app.use(cookieParser());

// --------------------------------------------------
// Static files
// --------------------------------------------------

app.use(
  "/uploads",
  express.static(path.join(__dirname, "uploads")),
);

// --------------------------------------------------
// Health check routes
// --------------------------------------------------

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "Jihaan Beauty API is running",
    environment: process.env.NODE_ENV || "development",
  });
});

app.get("/api/health", (_req, res) => {
  res.status(200).json({
    success: true,
    message: "API is healthy",
    timestamp: new Date().toISOString(),
  });
});

// --------------------------------------------------
// API routes
// --------------------------------------------------

// ==================================================
// Authentication
// ==================================================

app.use("/api/auth", authRoutes);

app.use("/api/admin/users", adminUserRoutes);

// ==================================================
// Partners
// ==================================================

app.use("/api/partners", partnerRoutes);

app.use("/api/admin/partners", adminPartnerRoutes);

// ==================================================
// Catalog
// ==================================================

app.use("/api/categories", categoryRoutes);

app.use("/api/category-manager", categoryManagerRoutes);

app.use("/api/hero-banners", heroBannerRoutes);

app.use("/api/offers", offerRoutes);

app.use("/api/new-arrivals", newArrivalRoutes);

app.use("/api/products", productRoutes);

app.use("/api/brands", brandRoutes);

app.use("/api/beauty-stories", beautyStoryRoutes);

// ==================================================
// Customer account, orders and cart
// ==================================================

app.use("/api/account", accountRoutes);

app.use("/api/orders", orderRoutes);

app.use("/api/cart", cartRoutes);

// ==================================================
// Admin order management
// ==================================================

app.use("/api/admin/orders", adminOrderRoutes);

// ==================================================
// Accounts dashboard
// ==================================================

app.use(
  "/api/accounts-dashboard",
  accountsDashboardRoutes,
);

// ==================================================
// Logistics dashboard
// ==================================================

app.use(
  "/api/logistics-dashboard",
  logisticsDashboardRoutes,
);

// ==================================================
// Contact
// ==================================================

app.use("/api/contact", contactRoutes);

app.use("/api/admin/contact", adminContactRoutes);

// ==================================================
// Admin analytics, reports and reviews
// ==================================================

app.use(
  "/api/admin/analytics",
  analyticsRoutes,
);

app.use(
  "/api/admin/sales-report",
  salesReportRoutes,
);

app.use(
  "/api/admin/reviews",
  reviewRoutes,
);

// --------------------------------------------------
// 404 handler
// --------------------------------------------------

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  });
});

// --------------------------------------------------
// Global error handler
// --------------------------------------------------

app.use((error, _req, res, _next) => {
  console.error("API Error:", error);

  const statusCode =
    error?.status ||
    error?.statusCode ||
    500;

  res.status(statusCode).json({
    success: false,
    message:
      error?.message ||
      "Internal server error",
  });
});

// --------------------------------------------------
// Start server
// --------------------------------------------------

const startServer = async () => {
  try {
    // ------------------------------------------------
    // Required environment variables
    // ------------------------------------------------

    if (!process.env.MONGO_URI) {
      throw new Error(
        "MONGO_URI is missing in environment variables",
      );
    }

    if (!process.env.JWT_SECRET) {
      console.warn(
        "Warning: JWT_SECRET is missing in environment variables",
      );
    }

    if (!process.env.FRONTEND_URL) {
      console.warn(
        "Warning: FRONTEND_URL is missing. Production CORS is using the hard-coded Netlify URL.",
      );
    }

    // ------------------------------------------------
    // Connect MongoDB
    // ------------------------------------------------

    await connectDB();

    // ------------------------------------------------
    // Start Express server
    // ------------------------------------------------

    app.listen(PORT, "0.0.0.0", () => {
      console.log("----------------------------------------");
      console.log("Jihaan Beauty API started successfully");
      console.log(
        `Environment: ${process.env.NODE_ENV || "development"}`,
      );
      console.log(`Server running on port: ${PORT}`);
      console.log(
        `Frontend URL: ${
          process.env.FRONTEND_URL || "https://jihaan-cosmetics.netlify.app"
        }`,
      );
      console.log(
        `API URL: http://localhost:${PORT}`,
      );
      console.log(
        `Health URL: http://localhost:${PORT}/api/health`,
      );
      console.log(
        `Uploads URL: http://localhost:${PORT}/uploads`,
      );
      console.log("----------------------------------------");
    });
  } catch (error) {
    console.error("----------------------------------------");
    console.error("Server startup failed:");

    console.error(
      error instanceof Error
        ? error.message
        : error,
    );

    console.error("----------------------------------------");

    process.exit(1);
  }
};

void startServer();