import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  BadgePercent,
  Box,
  IndianRupee,
  Package,
  RefreshCw,
  ShoppingBag,
  TrendingUp,
  Users,
  Wallet,
  XCircle,
} from "lucide-react";

import "./DashboardOverview.css";

interface DashboardOverviewProps {
  stats?: {
    totalProducts?: number;
    totalCategories?: number;
    totalBrands?: number;
    totalOrders?: number;
    totalCustomers?: number;
    totalRevenue?: number;
    activeOffers?: number;
    pendingOrders?: number;
  };
}

interface DashboardOverviewData {
  totalOrders: number;
  totalCustomers: number;
  revenue: number;
  subtotal: number;
  shipping: number;
  discount: number;
  averageOrderValue: number;

  totalProducts: number;
  totalStock: number;
  inventoryValue: number;
  lowStockProducts: number;
  outOfStockProducts: number;

  totalCategories: number;
  totalBrands: number;
  activeOffers: number;
  pendingOrders: number;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  overview?: Record<string, unknown>;
  summary?: Record<string, unknown>;
  products?: unknown[];
  categories?: unknown[];
  brands?: unknown[];
  offers?: unknown[];
  orders?: unknown[];
  data?: unknown;
  result?: unknown;
}

interface StatCardProps {
  title: string;
  value: string | number;
  description: string;
  icon: React.ElementType;
  className?: string;
  loading?: boolean;
}

const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "http://localhost:5000",
).replace(/\/+$/, "");

const API_BASE_URL = RAW_API_BASE_URL.endsWith("/api")
  ? RAW_API_BASE_URL
  : `${RAW_API_BASE_URL}/api`;

const getToken = (): string => {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("jihaan_auth_token") ||
    ""
  );
};

const getAuthHeaders = (): HeadersInit => {
  const token = getToken();

  if (!token) {
    return {
      Accept: "application/json",
    };
  }

  return {
    Accept: "application/json",
    Authorization: `Bearer ${token}`,
  };
};

const toNumber = (value: unknown, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const getObject = (value: unknown): Record<string, unknown> => {
  if (
    value &&
    typeof value === "object" &&
    !Array.isArray(value)
  ) {
    return value as Record<string, unknown>;
  }

  return {};
};

const getArray = (value: unknown): unknown[] => {
  return Array.isArray(value) ? value : [];
};

const extractArray = (
  response: ApiResponse,
  keys: string[],
): unknown[] => {
  for (const key of keys) {
    const directValue = response[key as keyof ApiResponse];

    if (Array.isArray(directValue)) {
      return directValue;
    }
  }

  const dataObject = getObject(response.data);

  for (const key of keys) {
    if (Array.isArray(dataObject[key])) {
      return dataObject[key] as unknown[];
    }
  }

  const resultObject = getObject(response.result);

  for (const key of keys) {
    if (Array.isArray(resultObject[key])) {
      return resultObject[key] as unknown[];
    }
  }

  return [];
};

async function fetchJson(
  endpoint: string,
  options?: RequestInit,
): Promise<ApiResponse> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...getAuthHeaders(),
      ...(options?.headers || {}),
    },
    credentials: "include",
  });

  const data = (await response
    .json()
    .catch(() => ({}))) as ApiResponse;

  if (!response.ok) {
    throw new Error(
      data.message ||
        `Request failed with status ${response.status}`,
    );
  }

  return data;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  className = "",
  loading = false,
}: StatCardProps) {
  return (
    <div className={`dashboardStatCard ${className}`}>
      <div className="statCardTop">
        <div className="statCardIcon">
          <Icon size={22} />
        </div>

        <TrendingUp size={18} className="statTrendIcon" />
      </div>

      <div className="statCardBody">
        <p>{title}</p>

        <h3>{loading ? "..." : value}</h3>

        <span>{description}</span>
      </div>
    </div>
  );
}

export default function DashboardOverview({
  stats,
}: DashboardOverviewProps) {
  const [backendStats, setBackendStats] =
    useState<DashboardOverviewData>({
      totalOrders: 0,
      totalCustomers: 0,
      revenue: 0,
      subtotal: 0,
      shipping: 0,
      discount: 0,
      averageOrderValue: 0,

      totalProducts: 0,
      totalStock: 0,
      inventoryValue: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,

      totalCategories: 0,
      totalBrands: 0,
      activeOffers: 0,
      pendingOrders: 0,
    });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const fetchDashboardData = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        setError("");

        const [
          overviewResponse,
          inventoryResponse,
          categoriesResponse,
          brandsResponse,
          offersResponse,
          ordersResponse,
        ] = await Promise.allSettled([
          fetchJson("/admin/analytics/overview"),
          fetchJson("/admin/analytics/inventory"),
          fetchJson("/categories"),
          fetchJson("/brands"),
          fetchJson("/offers"),
          fetchJson("/admin/orders"),
        ]);

        /*
         * ---------------------------------------------------------
         * OVERVIEW
         * ---------------------------------------------------------
         */

        let totalOrders = 0;
        let totalCustomers = 0;
        let revenue = 0;
        let subtotal = 0;
        let shipping = 0;
        let discount = 0;
        let averageOrderValue = 0;

        if (overviewResponse.status === "fulfilled") {
          const response = overviewResponse.value;

          const overview = getObject(response.overview);

          totalOrders = toNumber(
            overview.totalOrders ??
              overview.orders ??
              overview.orderCount,
          );

          totalCustomers = toNumber(
            overview.totalCustomers ??
              overview.customers ??
              overview.customerCount,
          );

          revenue = toNumber(
            overview.revenue ??
              overview.totalRevenue ??
              overview.totalSales,
          );

          subtotal = toNumber(overview.subtotal);

          shipping = toNumber(
            overview.shipping ??
              overview.shippingCharge,
          );

          discount = toNumber(
            overview.discount ??
              overview.discountAmount,
          );

          averageOrderValue = toNumber(
            overview.averageOrderValue ??
              overview.avgOrderValue,
          );
        }

        /*
         * ---------------------------------------------------------
         * INVENTORY
         * ---------------------------------------------------------
         */

        let totalProducts = 0;
        let totalStock = 0;
        let inventoryValue = 0;
        let lowStockProducts = 0;
        let outOfStockProducts = 0;

        if (inventoryResponse.status === "fulfilled") {
          const response = inventoryResponse.value;

          const summary = getObject(response.summary);

          const products = extractArray(response, [
            "products",
            "inventory",
            "items",
          ]);

          totalProducts = toNumber(
            summary.totalProducts ??
              response.totalProducts ??
              products.length,
          );

          totalStock = toNumber(
            summary.totalStock ??
              summary.stock ??
              summary.totalQuantity,
          );

          inventoryValue = toNumber(
            summary.inventoryValue ??
              summary.totalInventoryValue ??
              summary.totalValue,
          );

          lowStockProducts = toNumber(
            summary.lowStockProducts ??
              response.lowStockProducts?.length ??
              0,
          );

          outOfStockProducts = toNumber(
            summary.outOfStockProducts ??
              response.outOfStockProducts?.length ??
              0,
          );
        }

        /*
         * ---------------------------------------------------------
         * CATEGORIES
         * ---------------------------------------------------------
         */

        let totalCategories = 0;

        if (categoriesResponse.status === "fulfilled") {
          const response = categoriesResponse.value;

          const categories = extractArray(response, [
            "categories",
            "data",
            "items",
          ]);

          totalCategories = categories.length;
        }

        /*
         * ---------------------------------------------------------
         * BRANDS
         * ---------------------------------------------------------
         */

        let totalBrands = 0;

        if (brandsResponse.status === "fulfilled") {
          const response = brandsResponse.value;

          const brands = extractArray(response, [
            "brands",
            "data",
            "items",
          ]);

          totalBrands = brands.length;
        }

        /*
         * ---------------------------------------------------------
         * OFFERS
         * ---------------------------------------------------------
         */

        let activeOffers = 0;

        if (offersResponse.status === "fulfilled") {
          const response = offersResponse.value;

          const offers = extractArray(response, [
            "offers",
            "data",
            "items",
          ]);

          activeOffers = offers.filter((offer) => {
            const item = getObject(offer);

            return (
              item.active === true ||
              item.isActive === true
            );
          }).length;
        }

        /*
         * ---------------------------------------------------------
         * ORDERS
         * ---------------------------------------------------------
         *
         * This endpoint is optional. If your backend does not
         * expose /admin/orders, pendingOrders safely remains 0.
         */

        let pendingOrders = 0;

        if (ordersResponse.status === "fulfilled") {
          const response = ordersResponse.value;

          const orders = extractArray(response, [
            "orders",
            "data",
            "items",
          ]);

          pendingOrders = orders.filter((order) => {
            const item = getObject(order);

            const status = String(
              item.orderStatus ??
                item.status ??
                "",
            ).toLowerCase();

            return [
              "pending",
              "processing",
              "confirmed",
              "placed",
            ].includes(status);
          }).length;
        }

        /*
         * ---------------------------------------------------------
         * FALLBACK TO PROPS
         * ---------------------------------------------------------
         *
         * Existing parent stats will be used only when a backend
         * endpoint does not return that particular value.
         */

        setBackendStats({
          totalOrders:
            totalOrders ||
            Number(stats?.totalOrders || 0),

          totalCustomers:
            totalCustomers ||
            Number(stats?.totalCustomers || 0),

          revenue:
            revenue ||
            Number(stats?.totalRevenue || 0),

          subtotal,
          shipping,
          discount,

          averageOrderValue,

          totalProducts:
            totalProducts ||
            Number(stats?.totalProducts || 0),

          totalStock,
          inventoryValue,

          lowStockProducts,
          outOfStockProducts,

          totalCategories:
            totalCategories ||
            Number(stats?.totalCategories || 0),

          totalBrands:
            totalBrands ||
            Number(stats?.totalBrands || 0),

          activeOffers:
            activeOffers ||
            Number(stats?.activeOffers || 0),

          pendingOrders:
            pendingOrders ||
            Number(stats?.pendingOrders || 0),
        });

        /*
         * Only show a global error when the important overview
         * endpoint itself fails.
         */

        if (overviewResponse.status === "rejected") {
          setError(
            overviewResponse.reason instanceof Error
              ? overviewResponse.reason.message
              : "Unable to load dashboard overview.",
          );
        }
      } catch (requestError) {
        console.error(
          "Dashboard overview error:",
          requestError,
        );

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load dashboard data.",
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [stats],
  );

  useEffect(() => {
    void fetchDashboardData();
  }, [fetchDashboardData]);

  const dashboardStats = useMemo(
    () => ({
      totalProducts: backendStats.totalProducts,
      totalCategories: backendStats.totalCategories,
      totalBrands: backendStats.totalBrands,
      totalOrders: backendStats.totalOrders,
      totalCustomers: backendStats.totalCustomers,
      totalRevenue: backendStats.revenue,
      activeOffers: backendStats.activeOffers,
      pendingOrders: backendStats.pendingOrders,

      totalStock: backendStats.totalStock,
      inventoryValue: backendStats.inventoryValue,
      lowStockProducts: backendStats.lowStockProducts,
      outOfStockProducts: backendStats.outOfStockProducts,
      averageOrderValue: backendStats.averageOrderValue,
    }),
    [backendStats],
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(Number.isFinite(amount) ? amount : 0);
  };

  const handleRefresh = () => {
    void fetchDashboardData(true);
  };

  return (
    <section className="dashboardOverview">
      {/* ---------------------------------------------------------
          HEADER
      --------------------------------------------------------- */}

      <div className="dashboardWelcome">
        <div>
          <p className="dashboardEyebrow">
            STORE SUMMARY
          </p>

          <h2>Welcome back, Admin</h2>

          <p>
            Here is what is happening with your beauty
            store today.
          </p>
        </div>

        <div className="dashboardWelcomeRight">
          <div className="dashboardDate">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </div>

          <button
            type="button"
            className="dashboardRefreshButton"
            onClick={handleRefresh}
            disabled={loading || refreshing}
            title="Refresh dashboard"
          >
            <RefreshCw
              size={17}
              className={
                loading || refreshing
                  ? "dashboardRefreshSpin"
                  : ""
              }
            />

            {refreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------
          ERROR
      --------------------------------------------------------- */}

      {error && (
        <div className="dashboardError">
          <AlertTriangle size={18} />

          <div>
            <strong>Dashboard data could not be fully loaded</strong>

            <span>{error}</span>
          </div>

          <button
            type="button"
            onClick={handleRefresh}
          >
            Retry
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------
          MAIN STATS
      --------------------------------------------------------- */}

      <div className="dashboardStatsGrid">
        <StatCard
          title="Total Products"
          value={dashboardStats.totalProducts}
          description="Products in your store"
          icon={Package}
          className="statProducts"
          loading={loading}
        />

        <StatCard
          title="Total Orders"
          value={dashboardStats.totalOrders}
          description="Orders received"
          icon={ShoppingBag}
          className="statOrders"
          loading={loading}
        />

        <StatCard
          title="Total Customers"
          value={dashboardStats.totalCustomers}
          description="Customers with orders"
          icon={Users}
          className="statCustomers"
          loading={loading}
        />

        <StatCard
          title="Total Revenue"
          value={formatCurrency(
            dashboardStats.totalRevenue,
          )}
          description="Store revenue"
          icon={IndianRupee}
          className="statRevenue"
          loading={loading}
        />

        <StatCard
          title="Categories"
          value={dashboardStats.totalCategories}
          description="Available categories"
          icon={Box}
          className="statCategories"
          loading={loading}
        />

        <StatCard
          title="Active Offers"
          value={dashboardStats.activeOffers}
          description="Currently running offers"
          icon={BadgePercent}
          className="statOffers"
          loading={loading}
        />

        <StatCard
          title="Inventory Value"
          value={formatCurrency(
            dashboardStats.inventoryValue,
          )}
          description={`${dashboardStats.totalStock} units in stock`}
          icon={Wallet}
          className="statInventory"
          loading={loading}
        />

        <StatCard
          title="Average Order"
          value={formatCurrency(
            dashboardStats.averageOrderValue,
          )}
          description="Average revenue per order"
          icon={TrendingUp}
          className="statAverage"
          loading={loading}
        />
      </div>

      {/* ---------------------------------------------------------
          BOTTOM GRID
      --------------------------------------------------------- */}

      <div className="dashboardBottomGrid">
        {/* ORDER SUMMARY */}

        <div className="dashboardInfoCard">
          <div className="infoCardHeader">
            <div>
              <h3>Order Summary</h3>

              <p>
                Current order and inventory activity
              </p>
            </div>

            <ShoppingBag size={20} />
          </div>

          <div className="orderSummaryRow">
            <span>Pending Orders</span>

            <strong>
              {loading
                ? "..."
                : dashboardStats.pendingOrders}
            </strong>
          </div>

          <div className="orderSummaryRow">
            <span>Total Orders</span>

            <strong>
              {loading
                ? "..."
                : dashboardStats.totalOrders}
            </strong>
          </div>

          <div className="orderSummaryRow">
            <span>Average Order Value</span>

            <strong>
              {loading
                ? "..."
                : formatCurrency(
                    dashboardStats.averageOrderValue,
                  )}
            </strong>
          </div>

          <div className="orderSummaryRow">
            <span>Total Revenue</span>

            <strong>
              {loading
                ? "..."
                : formatCurrency(
                    dashboardStats.totalRevenue,
                  )}
            </strong>
          </div>
        </div>

        {/* STORE INFORMATION */}

        <div className="dashboardInfoCard">
          <div className="infoCardHeader">
            <div>
              <h3>Store Information</h3>

              <p>
                Overview of your store catalog
              </p>
            </div>

            <Box size={20} />
          </div>

          <div className="orderSummaryRow">
            <span>Total Products</span>

            <strong>
              {loading
                ? "..."
                : dashboardStats.totalProducts}
            </strong>
          </div>

          <div className="orderSummaryRow">
            <span>Total Brands</span>

            <strong>
              {loading
                ? "..."
                : dashboardStats.totalBrands}
            </strong>
          </div>

          <div className="orderSummaryRow">
            <span>Total Categories</span>

            <strong>
              {loading
                ? "..."
                : dashboardStats.totalCategories}
            </strong>
          </div>

          <div className="orderSummaryRow">
            <span>Active Offers</span>

            <strong>
              {loading
                ? "..."
                : dashboardStats.activeOffers}
            </strong>
          </div>
        </div>

        {/* INVENTORY HEALTH */}

        <div className="dashboardInfoCard">
          <div className="infoCardHeader">
            <div>
              <h3>Inventory Health</h3>

              <p>
                Products that need attention
              </p>
            </div>

            <Package size={20} />
          </div>

          <div className="orderSummaryRow">
            <span>Total Stock</span>

            <strong>
              {loading
                ? "..."
                : dashboardStats.totalStock}
            </strong>
          </div>

          <div className="orderSummaryRow">
            <span>Low Stock</span>

            <strong className="dashboardWarningValue">
              {loading
                ? "..."
                : dashboardStats.lowStockProducts}
            </strong>
          </div>

          <div className="orderSummaryRow">
            <span>Out of Stock</span>

            <strong className="dashboardDangerValue">
              {loading
                ? "..."
                : dashboardStats.outOfStockProducts}
            </strong>
          </div>

          <div className="orderSummaryRow">
            <span>Inventory Value</span>

            <strong>
              {loading
                ? "..."
                : formatCurrency(
                    dashboardStats.inventoryValue,
                  )}
            </strong>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          HEALTH ALERTS
      --------------------------------------------------------- */}

      <div className="dashboardHealthGrid">
        <div
          className={`dashboardHealthCard ${
            dashboardStats.lowStockProducts > 0
              ? "healthWarning"
              : "healthGood"
          }`}
        >
          <div className="healthIcon">
            <AlertTriangle size={21} />
          </div>

          <div>
            <span>Low Stock Products</span>

            <strong>
              {loading
                ? "..."
                : dashboardStats.lowStockProducts}
            </strong>

            <small>
              {dashboardStats.lowStockProducts > 0
                ? "Products need restocking"
                : "Inventory level looks good"}
            </small>
          </div>
        </div>

        <div
          className={`dashboardHealthCard ${
            dashboardStats.outOfStockProducts > 0
              ? "healthDanger"
              : "healthGood"
          }`}
        >
          <div className="healthIcon">
            <XCircle size={21} />
          </div>

          <div>
            <span>Out of Stock</span>

            <strong>
              {loading
                ? "..."
                : dashboardStats.outOfStockProducts}
            </strong>

            <small>
              {dashboardStats.outOfStockProducts > 0
                ? "Products currently unavailable"
                : "All products have stock"}
            </small>
          </div>
        </div>
      </div>
    </section>
  );
}