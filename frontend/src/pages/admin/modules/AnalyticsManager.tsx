import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import axios, { type AxiosRequestConfig } from "axios";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  CalendarDays,
  DollarSign,
  FileJson,
  FileSpreadsheet,
  Filter,
  Package,
  RefreshCw,
  ShoppingCart,
  TrendingUp,
  UserRound,
  Users,
  Wallet,
} from "lucide-react";
import styles from "./AnalyticsManager.module.css";

type AnalyticsTab = "overview" | "sales" | "customers" | "inventory";

type Tone = "green" | "blue" | "purple" | "orange" | "red";

type ApiResponse<T = unknown> = {
  success?: boolean;
  message?: string;
  data?: T;
  result?: T;
  [key: string]: unknown;
};

type OverviewData = {
  totalRevenue?: number;
  revenue?: number;
  totalSales?: number;
  totalOrders?: number;
  orders?: number;
  orderCount?: number;
  totalCustomers?: number;
  customers?: number;
  customerCount?: number;
  totalProducts?: number;
  products?: number;
  productCount?: number;
  averageOrderValue?: number;
  avgOrderValue?: number;
  pendingOrders?: number;
  completedOrders?: number;
  cancelledOrders?: number;
  lowStockProducts?: number;
  lowStock?: number;
  lowStockCount?: number;
  outOfStockProducts?: number;
  outOfStock?: number;
  outOfStockCount?: number;
  totalInventoryValue?: number;
  inventoryValue?: number;
  totalValue?: number;
};

type SalesItem = {
  date?: string;
  period?: string;
  label?: string;
  revenue?: number;
  totalRevenue?: number;
  sales?: number;
  orders?: number;
  orderCount?: number;
  averageOrderValue?: number;
};

type SalesData = {
  sales?: SalesItem[];
  reports?: SalesItem[];
  items?: SalesItem[];
  data?: SalesItem[];
  totalRevenue?: number;
  revenue?: number;
  totalSales?: number;
  totalOrders?: number;
  orders?: number;
};

type CustomerItem = {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  email?: string;
  orders?: number;
  orderCount?: number;
  totalSpent?: number;
  revenue?: number;
  totalRevenue?: number;
  lastOrderDate?: string;
};

type CustomerData = {
  customers?: CustomerItem[];
  users?: CustomerItem[];
  items?: CustomerItem[];
  data?: CustomerItem[];
  totalCustomers?: number;
  customerCount?: number;
  newCustomers?: number;
  returningCustomers?: number;
};

type InventoryItem = {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  productName?: string;
  sku?: string;
  stock?: number;
  quantity?: number;
  availableStock?: number;
  price?: number;
  sellingPrice?: number;
  image?: string;
  images?: string[];
  active?: boolean;
  isActive?: boolean;
  category?: string;
  brand?: string;
};

type InventoryData = {
  products?: InventoryItem[];
  inventory?: InventoryItem[];
  items?: InventoryItem[];
  data?: InventoryItem[];
  totalProducts?: number;
  productCount?: number;
  total?: number;
  lowStockProducts?: number;
  lowStock?: number;
  lowStockCount?: number;
  outOfStockProducts?: number;
  outOfStock?: number;
  outOfStockCount?: number;
  totalInventoryValue?: number;
  inventoryValue?: number;
  totalValue?: number;
};

type MetricCardProps = {
  title: string;
  value: string;
  description?: string;
  icon: ReactNode;
  tone?: Tone;
};

type PanelProps = {
  title: string;
  description?: string;
  children: ReactNode;
  action?: ReactNode;
};

/*
  Supports both environment configurations:

  VITE_API_BASE_URL=http://localhost:5000
  VITE_API_BASE_URL=http://localhost:5000/api
*/
const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "https://jihaan-cosmetics.onrender.com"
).replace(/\/+$/, "");

const API_BASE_URL = RAW_API_BASE_URL.endsWith("/api")
  ? RAW_API_BASE_URL
  : `${RAW_API_BASE_URL}/api`;

const formatCurrency = (value?: unknown) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
};

const formatNumber = (value?: unknown) => {
  const amount = Number(value || 0);

  return new Intl.NumberFormat("en-IN").format(
    Number.isFinite(amount) ? amount : 0
  );
};

const formatDate = (value?: unknown) => {
  if (!value) return "—";

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getToken = () => {
  return (
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("adminToken") ||
    ""
  );
};

const getAuthConfig = (): AxiosRequestConfig => {
  const token = getToken();

  if (!token) {
    return {};
  }

  return {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  };
};

const isObject = (value: unknown): value is Record<string, unknown> => {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
};

const unwrapResponse = <T,>(response: unknown): T => {
  if (!isObject(response)) {
    return response as T;
  }

  if (isObject(response.data)) {
    return response.data as T;
  }

  if (isObject(response.result)) {
    return response.result as T;
  }

  return response as T;
};

const findNestedObject = (
  source: unknown,
  keys: string[]
): Record<string, unknown> => {
  if (!isObject(source)) {
    return {};
  }

  for (const key of keys) {
    const value = source[key];

    if (isObject(value)) {
      return value;
    }
  }

  return source;
};

const readNumber = (
  source: unknown,
  keys: string[],
  fallback = 0
): number => {
  if (!isObject(source)) {
    return fallback;
  }

  for (const key of keys) {
    const value = source[key];

    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }

    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);

      if (Number.isFinite(parsed)) {
        return parsed;
      }
    }
  }

  return fallback;
};

const readArray = <T,>(source: unknown, keys: string[]): T[] => {
  if (!isObject(source)) {
    return [];
  }

  for (const key of keys) {
    if (Array.isArray(source[key])) {
      return source[key] as T[];
    }
  }

  return [];
};

function MetricCard({
  title,
  value,
  description,
  icon,
  tone = "blue",
}: MetricCardProps) {
  return (
    <div className={styles.metricCard}>
      <div className={`${styles.metricIcon} ${styles[tone]}`}>{icon}</div>

      <div className={styles.metricContent}>
        <div className={styles.metricTitle}>{title}</div>
        <div className={styles.metricValue}>{value}</div>

        {description && (
          <div className={styles.metricDescription}>{description}</div>
        )}
      </div>
    </div>
  );
}

function Panel({ title, description, children, action }: PanelProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div>
          <h3 className={styles.panelTitle}>{title}</h3>

          {description && (
            <p className={styles.subtitle}>{description}</p>
          )}
        </div>

        {action}
      </div>

      <div className={styles.panelBody}>{children}</div>
    </section>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className={styles.emptyState}>
      <BarChart3 size={34} />
      <p>{message}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className={styles.loadingState}>
      <RefreshCw className={styles.spin} size={26} />
      <p>Loading analytics...</p>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className={styles.errorBanner}>
      <div>
        <strong>Unable to load analytics</strong>
        <p>{message}</p>
      </div>

      <button className={styles.errorRetry} onClick={onRetry}>
        <RefreshCw size={15} />
        Retry
      </button>
    </div>
  );
}

function SalesChart({ items }: { items: SalesItem[] }) {
  const normalizedItems = items.map((item) => ({
    ...item,
    displayDate: item.date || item.period || item.label || "Unknown",
    displayRevenue: Number(
      item.revenue ?? item.totalRevenue ?? item.sales ?? 0
    ),
    displayOrders: Number(item.orders ?? item.orderCount ?? 0),
  }));

  const maxRevenue = Math.max(
    ...normalizedItems.map((item) => item.displayRevenue),
    1
  );

  if (!normalizedItems.length) {
    return <EmptyState message="No sales data available for this period." />;
  }

  return (
    <div className={styles.salesChart}>
      {normalizedItems.map((item, index) => {
        const width = `${Math.max(
          2,
          (item.displayRevenue / maxRevenue) * 100
        )}%`;

        return (
          <div className={styles.salesRow} key={`${item.displayDate}-${index}`}>
            <div className={styles.salesDate}>
              {formatDate(item.displayDate)}
            </div>

            <div className={styles.salesBarTrack}>
              <div
                className={styles.salesBar}
                style={{ width }}
                title={formatCurrency(item.displayRevenue)}
              />
            </div>

            <div className={styles.salesValue}>
              {formatCurrency(item.displayRevenue)}
            </div>

            <div className={styles.salesMeta}>
              {formatNumber(item.displayOrders)} orders
            </div>
          </div>
        );
      })}
    </div>
  );
}

function CustomerTable({ customers }: { customers: CustomerItem[] }) {
  if (!customers.length) {
    return <EmptyState message="No customer data available." />;
  }

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Orders</th>
            <th>Total Spent</th>
            <th>Last Order</th>
          </tr>
        </thead>

        <tbody>
          {customers.map((customer, index) => {
            const customerName =
              customer.name ||
              customer.fullName ||
              customer.email ||
              `Customer ${index + 1}`;

            const orderCount = Number(
              customer.orders ?? customer.orderCount ?? 0
            );

            const revenue = Number(
              customer.totalSpent ??
                customer.revenue ??
                customer.totalRevenue ??
                0
            );

            return (
              <tr key={customer._id || customer.id || index}>
                <td>
                  <div className={styles.tableCustomer}>
                    <div className={styles.avatar}>
                      <UserRound size={16} />
                    </div>

                    <div>
                      <strong>{customerName}</strong>

                      {customer.email && customer.name && (
                        <span>{customer.email}</span>
                      )}
                    </div>
                  </div>
                </td>

                <td>{formatNumber(orderCount)}</td>
                <td>{formatCurrency(revenue)}</td>
                <td>{formatDate(customer.lastOrderDate)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function InventoryTable({
  products,
  onStockUpdated,
}: {
  products: InventoryItem[];
  onStockUpdated: (productId: string, stock: number) => Promise<void>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftStock, setDraftStock] = useState("");
  const [savingId, setSavingId] = useState<string | null>(null);

  if (!products.length) {
    return <EmptyState message="No inventory data available." />;
  }

  const startEditing = (product: InventoryItem, currentStock: number) => {
    const id = String(product._id || product.id || "");
    if (!id) return;
    setEditingId(id);
    setDraftStock(String(currentStock));
  };

  const cancelEditing = () => {
    setEditingId(null);
    setDraftStock("");
  };

  const saveStock = async (product: InventoryItem, currentStock: number) => {
    const id = String(product._id || product.id || "");
    if (!id) return;

    const nextStock = Number(draftStock);

    if (!Number.isInteger(nextStock) || nextStock < 0) {
      window.alert("Please enter a valid stock quantity (0 or more).");
      return;
    }

    if (nextStock === currentStock) {
      cancelEditing();
      return;
    }

    try {
      setSavingId(id);
      await onStockUpdated(id, nextStock);
      cancelEditing();
    } finally {
      setSavingId(null);
    }
  };

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Product</th>
            <th>SKU</th>
            <th>Stock</th>
            <th>Price</th>
            <th>Status</th>
            <th>Inventory</th>
          </tr>
        </thead>

        <tbody>
          {products.map((product, index) => {
            const stock = Math.max(
              0,
              Number(
                product.stock ??
                  product.quantity ??
                  product.availableStock ??
                  0
              )
            );

            const price = Number(
              product.price ?? product.sellingPrice ?? 0
            );

            const productName =
              product.name ||
              product.title ||
              product.productName ||
              `Product ${index + 1}`;

            const image =
              product.image ||
              (Array.isArray(product.images) ? product.images[0] : "");

            const inactive =
              product.active === false || product.isActive === false;

            let statusClass = styles.statusSuccess;
            let statusLabel = "In stock";

            if (inactive) {
              statusClass = styles.statusNeutral;
              statusLabel = "Inactive";
            } else if (stock <= 0) {
              statusClass = styles.statusDanger;
              statusLabel = "Out of stock";
            } else if (stock <= 5) {
              statusClass = styles.statusWarning;
              statusLabel = "Low stock";
            }

            const id = String(product._id || product.id || index);
            const isEditing = editingId === id;
            const isSaving = savingId === id;

            return (
              <tr key={id}>
                <td>
                  <div className={styles.tableProduct}>
                    {image ? (
                      <img
                        src={image}
                        alt={productName}
                        className={styles.productImage}
                      />
                    ) : (
                      <div className={styles.tableProductPlaceholder}>
                        <Package size={17} />
                      </div>
                    )}

                    <strong>{productName}</strong>
                  </div>
                </td>

                <td>{product.sku || "—"}</td>

                <td>
                  {isEditing ? (
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={draftStock}
                      onChange={(event) => setDraftStock(event.target.value)}
                      className={styles.stockInput}
                      disabled={isSaving}
                      autoFocus
                    />
                  ) : (
                    <strong>{formatNumber(stock)}</strong>
                  )}
                </td>

                <td>{formatCurrency(price)}</td>

                <td>
                  <span className={statusClass}>{statusLabel}</span>
                </td>

                <td>
                  {isEditing ? (
                    <div className={styles.inventoryActions}>
                      <button
                        type="button"
                        className={styles.primaryButton}
                        onClick={() => saveStock(product, stock)}
                        disabled={isSaving}
                      >
                        {isSaving ? (
                          <>
                            <RefreshCw className={styles.spin} size={14} />
                            Saving...
                          </>
                        ) : (
                          "Save"
                        )}
                      </button>

                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={cancelEditing}
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      onClick={() => startEditing(product, stock)}
                      disabled={!product._id && !product.id}
                    >
                      Update Stock
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function AnalyticsManager() {
  const [activeTab, setActiveTab] =
    useState<AnalyticsTab>("overview");

  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [groupBy, setGroupBy] = useState("day");

  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [sales, setSales] = useState<SalesData | null>(null);
  const [customers, setCustomers] = useState<CustomerData | null>(null);
  const [inventory, setInventory] = useState<InventoryData | null>(null);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState("");

  const queryParams = useMemo(() => {
    const params: Record<string, string> = {};

    if (startDate) {
      params.startDate = startDate;
    }

    if (endDate) {
      params.endDate = endDate;
    }

    return params;
  }, [startDate, endDate]);

  const fetchAnalytics = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const config = getAuthConfig();

      const [
        overviewResponse,
        salesResponse,
        customersResponse,
        inventoryResponse,
      ] = await Promise.all([
        axios.get<ApiResponse>(
          `${API_BASE_URL}/admin/analytics/overview`,
          {
            ...config,
            params: queryParams,
          }
        ),

        axios.get<ApiResponse>(
          `${API_BASE_URL}/admin/analytics/sales`,
          {
            ...config,
            params: {
              ...queryParams,
              groupBy,
            },
          }
        ),

        axios.get<ApiResponse>(
          `${API_BASE_URL}/admin/analytics/customers`,
          {
            ...config,
            params: queryParams,
          }
        ),

        axios.get<ApiResponse>(
          `${API_BASE_URL}/admin/analytics/inventory`,
          {
            ...config,
            params: queryParams,
          }
        ),
      ]);

      const overviewPayload = unwrapResponse<OverviewData>(
        overviewResponse.data
      );

      const salesPayload = unwrapResponse<SalesData>(
        salesResponse.data
      );

      const customersPayload = unwrapResponse<CustomerData>(
        customersResponse.data
      );

      const inventoryPayload = unwrapResponse<InventoryData>(
        inventoryResponse.data
      );

      const overviewObject = findNestedObject(overviewPayload, [
        "overview",
        "summary",
        "analytics",
      ]);

      const salesObject = findNestedObject(salesPayload, [
        "sales",
        "report",
        "reports",
      ]);

      const customersObject = findNestedObject(customersPayload, [
        "customers",
        "customerAnalytics",
        "report",
      ]);

      const inventoryObject = findNestedObject(inventoryPayload, [
        "inventory",
        "stock",
        "inventoryAnalytics",
      ]);

      setOverview({
        ...overviewPayload,
        ...overviewObject,
      });

      setSales({
        ...salesPayload,
        ...salesObject,
      });

      setCustomers({
        ...customersPayload,
        ...customersObject,
      });

      setInventory({
        ...inventoryPayload,
        ...inventoryObject,
      });
    } catch (requestError) {
      if (axios.isAxiosError(requestError)) {
        const status = requestError.response?.status;

        if (status === 401) {
          setError("Your login session has expired. Please login again.");
        } else if (status === 403) {
          setError(
            "You do not have admin permission to access analytics."
          );
        } else if (status === 404) {
          setError(
            "Analytics API route was not found. Check the backend route mounting."
          );
        } else {
          const responseData = requestError.response?.data as
            | { message?: string }
            | undefined;

          setError(
            responseData?.message ||
              requestError.message ||
              "Something went wrong while loading analytics."
          );
        }
      } else {
        setError("Something went wrong while loading analytics.");
      }
    } finally {
      setLoading(false);
    }
  }, [groupBy, queryParams]);

  const inventoryItems = readArray<InventoryItem>(inventory, [
    "products",
    "inventory",
    "items",
    "data",
  ]);

  const updateInventoryStock = useCallback(
    async (productId: string, stock: number) => {
      if (!productId) {
        throw new Error("Product ID is missing.");
      }

      try {
        setError("");

        /*
         * Backend contract:
         * Existing backend contract:
         * PUT /api/products/:id
         * body: { stock: number }
         */
        const configuredEndpoint = String(
          import.meta.env.VITE_ADMIN_PRODUCT_UPDATE_ENDPOINT || ""
        ).trim();

        const endpointTemplate =
          configuredEndpoint || `${API_BASE_URL}/products/:id`;

        const endpoint = endpointTemplate.replace(
          ":id",
          encodeURIComponent(productId)
        );

        await axios.put(
          endpoint,
          { stock },
          getAuthConfig()
        );

        setInventory((current) => {
          if (!current) return current;

          const updateProducts = (items?: InventoryItem[]) =>
            items?.map((item) => {
              const itemId = String(item._id || item.id || "");
              return itemId === productId
                ? {
                    ...item,
                    stock,
                    quantity: stock,
                    availableStock: stock,
                  }
                : item;
            });

          return {
            ...current,
            products: updateProducts(current.products),
            inventory: updateProducts(current.inventory),
            items: updateProducts(current.items),
            data: updateProducts(current.data),
          };
        });

        setOverview((current) => {
          if (!current) return current;

          const previousStock = inventoryItems.find(
            (item) =>
              String(item._id || item.id || "") === productId
          );

          const oldStock = Number(
            previousStock?.stock ??
              previousStock?.quantity ??
              previousStock?.availableStock ??
              0
          );

          const wasLow = oldStock > 0 && oldStock <= 5;
          const wasOut = oldStock <= 0;
          const isLow = stock > 0 && stock <= 5;
          const isOut = stock <= 0;

          return {
            ...current,
            lowStockProducts:
              Number(
                current.lowStockProducts ??
                  current.lowStock ??
                  current.lowStockCount ??
                  0
              ) +
              Number(isLow) -
              Number(wasLow),
            outOfStockProducts:
              Number(
                current.outOfStockProducts ??
                  current.outOfStock ??
                  current.outOfStockCount ??
                  0
              ) +
              Number(isOut) -
              Number(wasOut),
          };
        });

        window.alert("Inventory stock updated successfully.");
      } catch (requestError) {
        let message = "Unable to update product stock.";

        if (axios.isAxiosError(requestError)) {
          const responseData = requestError.response?.data as
            | { message?: string }
            | undefined;

          if (requestError.response?.status === 401) {
            message = "Your login session has expired. Please login again.";
          } else if (requestError.response?.status === 403) {
            message = "You do not have admin permission to update inventory.";
          } else if (requestError.response?.status === 404) {
            message =
              "Product update API route was not found. Check the backend route.";
          } else {
            message =
              responseData?.message ||
              requestError.message ||
              message;
          }
        } else if (requestError instanceof Error) {
          message = requestError.message;
        }

        setError(message);
        throw new Error(message);
      }
    },
    [inventoryItems]
  );

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const totalRevenue = readNumber(overview, [
    "totalRevenue",
    "revenue",
    "totalSales",
  ]);

  const totalOrders = readNumber(overview, [
    "totalOrders",
    "orders",
    "orderCount",
  ]);

  const totalCustomers = readNumber(overview, [
    "totalCustomers",
    "customers",
    "customerCount",
  ]);

  const totalProducts = readNumber(overview, [
    "totalProducts",
    "products",
    "productCount",
  ]);

  const averageOrderValue = readNumber(overview, [
    "averageOrderValue",
    "avgOrderValue",
  ]);

  const lowStockProducts = readNumber(overview, [
    "lowStockProducts",
    "lowStock",
    "lowStockCount",
  ]);

  const outOfStockProducts = readNumber(overview, [
    "outOfStockProducts",
    "outOfStock",
    "outOfStockCount",
  ]);

  const inventoryValue = readNumber(inventory, [
    "totalInventoryValue",
    "inventoryValue",
    "totalValue",
  ]);

  const salesItems = readArray<SalesItem>(sales, [
    "sales",
    "reports",
    "items",
    "data",
  ]);

  const customerItems = readArray<CustomerItem>(customers, [
    "customers",
    "users",
    "items",
    "data",
  ]);

  const handleExport = useCallback(

    (format: "csv" | "json") => {
      try {
        setExporting(true);

        const exportData = {
          generatedAt: new Date().toISOString(),
          filters: {
            startDate,
            endDate,
            groupBy,
          },
          overview,
          sales,
          customers,
          inventory,
        };

        let fileContent = "";
        let mimeType = "application/json";
        let extension = "json";

        if (format === "json") {
          fileContent = JSON.stringify(exportData, null, 2);
        } else {
          extension = "csv";
          mimeType = "text/csv;charset=utf-8;";

          const rows = [
            ["Metric", "Value"],
            ["Total Revenue", totalRevenue],
            ["Total Orders", totalOrders],
            ["Total Customers", totalCustomers],
            ["Total Products", totalProducts],
            ["Average Order Value", averageOrderValue],
            ["Low Stock Products", lowStockProducts],
            ["Out Of Stock Products", outOfStockProducts],
            ["Inventory Value", inventoryValue],
          ];

          fileContent = rows
            .map((row) =>
              row
                .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
                .join(",")
            )
            .join("\n");
        }

        const blob = new Blob([fileContent], {
          type: mimeType,
        });

        const url = URL.createObjectURL(blob);
        const anchor = document.createElement("a");

        anchor.href = url;
        anchor.download = `analytics-report-${new Date()
          .toISOString()
          .slice(0, 10)}.${extension}`;

        document.body.appendChild(anchor);
        anchor.click();
        anchor.remove();

        URL.revokeObjectURL(url);
      } finally {
        setExporting(false);
      }
    },
    [
      averageOrderValue,
      customers,
      endDate,
      groupBy,
      inventory,
      inventoryValue,
      lowStockProducts,
      overview,
      outOfStockProducts,
      sales,
      startDate,
      totalCustomers,
      totalOrders,
      totalProducts,
      totalRevenue,
    ]
  );

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <div>
          <div className={styles.eyebrow}>ADMIN PANEL</div>
          <h1 className={styles.title}>Analytics</h1>
          <p className={styles.subtitle}>
            Manage your beauty store performance.
          </p>
        </div>

        <div className={styles.headerActions}>
          <button
            className={styles.secondaryButton}
            onClick={() => handleExport("csv")}
            disabled={exporting || loading}
          >
            <FileSpreadsheet size={16} />
            Export CSV
          </button>

          <button
            className={styles.secondaryButton}
            onClick={() => handleExport("json")}
            disabled={exporting || loading}
          >
            <FileJson size={16} />
            Export JSON
          </button>

          <button
            className={styles.primaryButton}
            onClick={fetchAnalytics}
            disabled={loading}
          >
            <RefreshCw
              size={16}
              className={loading ? styles.spin : ""}
            />
            Refresh
          </button>
        </div>
      </div>

      <div className={styles.filterCard}>
        <div className={styles.filterHeader}>
          <div className={styles.filterTitle}>
            <Filter size={17} />
            Filter Analytics
          </div>

          <button
            className={styles.textButton}
            onClick={() => {
              setStartDate("");
              setEndDate("");
              setGroupBy("day");
            }}
          >
            Reset filters
          </button>
        </div>

        <div className={styles.filters}>
          <label className={styles.field}>
            <span>
              <CalendarDays size={14} />
              Start date
            </span>

            <input
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>
              <CalendarDays size={14} />
              End date
            </span>

            <input
              type="date"
              value={endDate}
              onChange={(event) => setEndDate(event.target.value)}
            />
          </label>

          <label className={styles.field}>
            <span>Sales grouping</span>

            <select
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value)}
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
          </label>
        </div>
      </div>

      {error && <ErrorState message={error} onRetry={fetchAnalytics} />}

      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${
            activeTab === "overview" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("overview")}
        >
          <BarChart3 size={16} />
          Overview
        </button>

        <button
          className={`${styles.tab} ${
            activeTab === "sales" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("sales")}
        >
          <TrendingUp size={16} />
          Sales
        </button>

        <button
          className={`${styles.tab} ${
            activeTab === "customers" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("customers")}
        >
          <Users size={16} />
          Customers
        </button>

        <button
          className={`${styles.tab} ${
            activeTab === "inventory" ? styles.activeTab : ""
          }`}
          onClick={() => setActiveTab("inventory")}
        >
          <Boxes size={16} />
          Inventory
        </button>
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {activeTab === "overview" && (
            <div className={styles.sectionStack}>
              <div className={styles.metricGrid}>
                <MetricCard
                  title="Total Revenue"
                  value={formatCurrency(totalRevenue)}
                  description="Revenue excluding cancelled and returned orders"
                  icon={<DollarSign size={21} />}
                  tone="green"
                />

                <MetricCard
                  title="Total Orders"
                  value={formatNumber(totalOrders)}
                  description="Orders recorded in selected period"
                  icon={<ShoppingCart size={21} />}
                  tone="blue"
                />

                <MetricCard
                  title="Customers"
                  value={formatNumber(totalCustomers)}
                  description="Total registered customers"
                  icon={<Users size={21} />}
                  tone="purple"
                />

                <MetricCard
                  title="Products"
                  value={formatNumber(totalProducts)}
                  description="Products available in catalog"
                  icon={<Package size={21} />}
                  tone="orange"
                />

                <MetricCard
                  title="Average Order Value"
                  value={formatCurrency(averageOrderValue)}
                  description="Average revenue per order"
                  icon={<Wallet size={21} />}
                  tone="green"
                />

                <MetricCard
                  title="Low Stock"
                  value={formatNumber(lowStockProducts)}
                  description="Products with low stock"
                  icon={<AlertTriangle size={21} />}
                  tone="orange"
                />
              </div>

              <div className={styles.twoColumnGrid}>
                <Panel
                  title="Sales Performance"
                  description="Revenue grouped by selected period"
                >
                  <SalesChart items={salesItems} />
                </Panel>

                <Panel
                  title="Inventory Summary"
                  description="Current inventory status"
                >
                  <div className={styles.summaryRows}>
                    <div className={styles.summaryRow}>
                      <span>Total products</span>
                      <strong>{formatNumber(totalProducts)}</strong>
                    </div>

                    <div className={styles.summaryRow}>
                      <span>Low stock products</span>
                      <strong className={styles.stockWarning}>
                        {formatNumber(lowStockProducts)}
                      </strong>
                    </div>

                    <div className={styles.summaryRow}>
                      <span>Out of stock products</span>
                      <strong className={styles.stockDanger}>
                        {formatNumber(outOfStockProducts)}
                      </strong>
                    </div>

                    <div className={styles.summaryRow}>
                      <span>Total inventory value</span>
                      <strong>{formatCurrency(inventoryValue)}</strong>
                    </div>
                  </div>
                </Panel>
              </div>
            </div>
          )}

          {activeTab === "sales" && (
            <div className={styles.sectionStack}>
              <div className={styles.metricGrid}>
                <MetricCard
                  title="Sales Revenue"
                  value={formatCurrency(
                    sales?.totalRevenue ??
                      sales?.revenue ??
                      sales?.totalSales ??
                      totalRevenue
                  )}
                  icon={<DollarSign size={21} />}
                  tone="green"
                />

                <MetricCard
                  title="Sales Orders"
                  value={formatNumber(
                    sales?.totalOrders ??
                      sales?.orders ??
                      totalOrders
                  )}
                  icon={<ShoppingCart size={21} />}
                  tone="blue"
                />
              </div>

              <Panel
                title="Sales Report"
                description={`Sales grouped by ${groupBy}`}
              >
                <SalesChart items={salesItems} />
              </Panel>
            </div>
          )}

          {activeTab === "customers" && (
            <div className={styles.sectionStack}>
              <div className={styles.metricGrid}>
                <MetricCard
                  title="Total Customers"
                  value={formatNumber(
                    customers?.totalCustomers ??
                      customers?.customerCount ??
                      totalCustomers
                  )}
                  icon={<Users size={21} />}
                  tone="purple"
                />

                <MetricCard
                  title="New Customers"
                  value={formatNumber(customers?.newCustomers)}
                  icon={<UserRound size={21} />}
                  tone="blue"
                />

                <MetricCard
                  title="Returning Customers"
                  value={formatNumber(customers?.returningCustomers)}
                  icon={<Users size={21} />}
                  tone="green"
                />
              </div>

              <Panel
                title="Customer Analytics"
                description="Customer order and spending information"
              >
                <CustomerTable customers={customerItems} />
              </Panel>
            </div>
          )}

          {activeTab === "inventory" && (
            <div className={styles.sectionStack}>
              <div className={styles.metricGrid}>
                <MetricCard
                  title="Total Products"
                  value={formatNumber(
                    inventory?.totalProducts ??
                      inventory?.productCount ??
                      inventory?.total ??
                      totalProducts
                  )}
                  icon={<Package size={21} />}
                  tone="blue"
                />

                <MetricCard
                  title="Low Stock Products"
                  value={formatNumber(
                    inventory?.lowStockProducts ??
                      inventory?.lowStock ??
                      inventory?.lowStockCount ??
                      lowStockProducts
                  )}
                  icon={<AlertTriangle size={21} />}
                  tone="orange"
                />

                <MetricCard
                  title="Out Of Stock"
                  value={formatNumber(
                    inventory?.outOfStockProducts ??
                      inventory?.outOfStock ??
                      inventory?.outOfStockCount ??
                      outOfStockProducts
                  )}
                  icon={<Boxes size={21} />}
                  tone="red"
                />

                <MetricCard
                  title="Inventory Value"
                  value={formatCurrency(inventoryValue)}
                  icon={<Wallet size={21} />}
                  tone="green"
                />
              </div>

              <Panel
                title="Inventory Details"
                description="Product stock and availability"
              >
                <InventoryTable
                  products={inventoryItems}
                  onStockUpdated={updateInventoryStock}
                />
              </Panel>
            </div>
          )}
        </>
      )}
    </div>
  );
}