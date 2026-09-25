import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./OrdersPage.module.css";
import MainHeader from "../../components/header/MainHeader/MainHeader";
import Footer from "../../components/footer/Footer";

type OrderItem = {
  product?: string;
  productId?: string;
  _id?: string;
  name?: string;
  image?: string;
  price?: number;
  quantity?: number;
  size?: string;
  subtotal?: number;
};

type ShippingAddress = {
  fullName?: string;
  phone?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
};

type OrderStatusHistory = {
  status?: string;
  note?: string;
  updatedBy?: string | { _id?: string; name?: string; email?: string };
  updatedAt?: string;
};

type TrackingHistory = {
  location?: string;
  note?: string;
  status?: string;
  updatedBy?: string | { _id?: string; name?: string; email?: string };
  updatedAt?: string;
};

type OrderTracking = {
  trackingId?: string;
  courierName?: string;
  trackingUrl?: string;
  shippedAt?: string | null;
  expectedDeliveryAt?: string | null;
  outForDeliveryAt?: string | null;
  deliveredAt?: string | null;
  currentLocation?: string;
  locationUpdatedAt?: string | null;
};

type Order = {
  id?: string;
  _id?: string;
  orderNumber?: string;
  trackingId?: string;
  user?: string;
  userId?: string;
  items?: OrderItem[];
  shippingAddress?: ShippingAddress;
  paymentMethod?: "COD" | "ONLINE" | string;
  paymentStatus?: string;
  orderStatus?: string;
  orderStatusHistory?: OrderStatusHistory[];
  tracking?: OrderTracking;
  trackingHistory?: TrackingHistory[];
  currentLocation?: string;
  locationUpdatedAt?: string | null;
  subtotal?: number;
  shippingCharge?: number;
  discount?: number;
  totalAmount?: number;
  couponCode?: string;
  notes?: string;
  cancellationReason?: string;
  cancelledAt?: string | null;
  returnReason?: string;
  returnedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
  deliveredAt?: string | null;
};

type OrdersResponse = {
  success?: boolean;
  count?: number;
  orders?: Order[];
  order?: Order;
  message?: string;
};

type TrackingStep = {
  key: string;
  title: string;
  description: string;
};

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "https://jihaan-cosmetics.onrender.com",
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

const TOKEN_KEY = "jihaan_auth_token";

const trackingSteps: TrackingStep[] = [
  {
    key: "PLACED",
    title: "Order Placed",
    description: "Your order has been placed successfully.",
  },
  {
    key: "CONFIRMED",
    title: "Order Confirmed",
    description: "Your order has been confirmed by Jihaan Cosmetics.",
  },
  {
    key: "PROCESSING",
    title: "Preparing Order",
    description: "Your products are being packed.",
  },
  {
    key: "SHIPPED",
    title: "Order Shipped",
    description: "Your order has been handed over to the delivery partner.",
  },
  {
    key: "OUT_FOR_DELIVERY",
    title: "Out for Delivery",
    description: "Your order is on the way to your address.",
  },
  {
    key: "DELIVERED",
    title: "Delivered",
    description: "Your order has been delivered successfully.",
  },
];

const getToken = (): string => {
  try {
    return localStorage.getItem(TOKEN_KEY) || "";
  } catch {
    return "";
  }
};

const getImageUrl = (image?: string): string => {
  if (!image) return "/images/product-placeholder.jpg";
  if (image.startsWith("http://") || image.startsWith("https://")) return image;
  if (image.startsWith("/")) return `${API_BASE_URL}${image}`;
  return `${API_BASE_URL}/${image}`;
};

const formatCurrency = (amount?: number): string =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(amount) || 0);

const parseDate = (date?: string | null): Date | null => {
  if (!date) return null;
  const value = new Date(date);
  return Number.isNaN(value.getTime()) ? null : value;
};

const formatDate = (date?: string | null): string => {
  const value = parseDate(date);
  if (!value) return "Date unavailable";
  return value.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date?: string | null): string => {
  const value = parseDate(date);
  if (!value) return "Date unavailable";
  return value.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getOrderId = (order: Order): string => order.id || order._id || "";

const getReadableStatus = (status?: string): string => {
  if (!status) return "Unknown";
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const getStatusClass = (status?: string): string => {
  switch (status) {
    case "DELIVERED":
      return styles.delivered;
    case "CANCELLED":
      return styles.cancelled;
    case "SHIPPED":
    case "OUT_FOR_DELIVERY":
      return styles.shipped;
    case "PROCESSING":
    case "CONFIRMED":
      return styles.processing;
    case "RETURN_REQUESTED":
    case "RETURNED":
      return styles.returned || styles.processing;
    default:
      return styles.placed;
  }
};

const getTrackingStepIndex = (status?: string): number => {
  if (!status) return 0;
  if (status === "CANCELLED") return -1;
  if (status === "RETURN_REQUESTED" || status === "RETURNED") {
    return trackingSteps.length;
  }
  const index = trackingSteps.findIndex((step) => step.key === status);
  return index >= 0 ? index : 0;
};

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const canCancelOrder = (status?: string): boolean =>
  ["PLACED", "CONFIRMED", "PROCESSING"].includes(status || "");

const canRequestReturn = (status?: string): boolean =>
  status === "DELIVERED";

const buildHeaders = (): HeadersInit => {
  const token = getToken();
  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
};

const parseResponse = async <T,>(
  response: Response,
  fallbackMessage: string,
): Promise<T> => {
  let data: T | null = null;
  try {
    data = (await response.json()) as T;
  } catch {
    data = null;
  }

  if (!response.ok) {
    const responseData = data as
      | { message?: string; error?: string }
      | null;
    throw new Error(
      responseData?.message || responseData?.error || fallbackMessage,
    );
  }

  return data as T;
};

const getActualTrackingId = (order: Order): string => {
  const trackingId = order.tracking?.trackingId || order.trackingId || "";
  if (!trackingId || trackingId === order.orderNumber) return "";
  return trackingId;
};

const getTrackingUrl = (order: Order): string =>
  order.tracking?.trackingUrl || "";

const getCourierName = (order: Order): string =>
  order.tracking?.courierName || "";

const getCurrentLocation = (order: Order): string =>
  order.tracking?.currentLocation || order.currentLocation || "";

const getLocationUpdatedAt = (order: Order): string | null =>
  order.tracking?.locationUpdatedAt || order.locationUpdatedAt || null;

const getStatusHistory = (order: Order): OrderStatusHistory[] =>
  Array.isArray(order.orderStatusHistory)
    ? [...order.orderStatusHistory].sort(
        (a, b) =>
          (parseDate(a.updatedAt)?.getTime() || 0) -
          (parseDate(b.updatedAt)?.getTime() || 0),
      )
    : [];

const getTrackingHistory = (order: Order): TrackingHistory[] =>
  Array.isArray(order.trackingHistory)
    ? [...order.trackingHistory].sort(
        (a, b) =>
          (parseDate(b.updatedAt)?.getTime() || 0) -
          (parseDate(a.updatedAt)?.getTime() || 0),
      )
    : [];

function OrderTracking({ order }: { order: Order }) {
  const statusHistory = getStatusHistory(order);
  const trackingHistory = getTrackingHistory(order);
  const currentStep = getTrackingStepIndex(order.orderStatus);
  const isCancelled = order.orderStatus === "CANCELLED";
  const isReturned = ["RETURN_REQUESTED", "RETURNED"].includes(
    order.orderStatus || "",
  );

  const trackingId = getActualTrackingId(order);
  const trackingUrl = getTrackingUrl(order);
  const courierName = getCourierName(order);
  const currentLocation = getCurrentLocation(order);
  const locationUpdatedAt = getLocationUpdatedAt(order);
  const tracking = order.tracking;

  return (
    <section className={styles.trackingSection}>
      <div className={styles.trackingHeader}>
        <div>
          <p className={styles.orderLabel}>ORDER TRACKING</p>
          <strong className={styles.trackingId}>
            {trackingId || order.orderNumber || "Tracking unavailable"}
          </strong>
          {trackingId ? (
            <p className={styles.orderDate}>Courier tracking ID</p>
          ) : (
            <p className={styles.orderDate}>
              Courier tracking ID not assigned yet
            </p>
          )}
        </div>
        <span className={styles.trackingStatus}>
          {getReadableStatus(order.orderStatus)}
        </span>
      </div>

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}>
          <span className={styles.sectionNumber}>TR</span>
          <h3>Shipment Details</h3>
        </div>

        <div className={styles.summaryRow}>
          <span>Order Number</span>
          <strong>{order.orderNumber || "N/A"}</strong>
        </div>

        <div className={styles.summaryRow}>
          <span>Courier Partner</span>
          <strong>{courierName || "Not assigned yet"}</strong>
        </div>

        <div className={styles.summaryRow}>
          <span>Current Location</span>
          <strong>{currentLocation || "Not updated yet"}</strong>
        </div>

        {locationUpdatedAt && (
          <div className={styles.summaryRow}>
            <span>Location Updated</span>
            <strong>{formatDateTime(locationUpdatedAt)}</strong>
          </div>
        )}

        <div className={styles.summaryRow}>
          <span>Shipped</span>
          <strong>{formatDateTime(tracking?.shippedAt)}</strong>
        </div>

        <div className={styles.summaryRow}>
          <span>Expected Delivery</span>
          <strong>{formatDate(tracking?.expectedDeliveryAt)}</strong>
        </div>

        <div className={styles.summaryRow}>
          <span>Out for Delivery</span>
          <strong>{formatDateTime(tracking?.outForDeliveryAt)}</strong>
        </div>

        <div className={styles.summaryRow}>
          <span>Delivered</span>
          <strong>{formatDateTime(tracking?.deliveredAt || order.deliveredAt)}</strong>
        </div>

        {trackingUrl && (
          <div className={styles.summaryRow}>
            <span>Shipment Tracking</span>
            <a
              href={trackingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.primaryButton}
            >
              Track Shipment ↗
            </a>
          </div>
        )}
      </div>

      {isCancelled ? (
        <div className={styles.cancelledTracking}>
          <strong>Order Cancelled</strong>
          <p>
            {order.cancellationReason ||
              "This order has been cancelled by the customer or store."}
          </p>
          {order.cancelledAt && (
            <small>Cancelled on {formatDateTime(order.cancelledAt)}</small>
          )}
        </div>
      ) : isReturned ? (
        <div className={styles.returnTracking}>
          <strong>
            {order.orderStatus === "RETURNED"
              ? "Order Returned"
              : "Return Requested"}
          </strong>
          <p>
            {order.orderStatus === "RETURNED"
              ? "Your return has been completed."
              : "Your return request is being reviewed."}
          </p>
          {order.returnReason && <small>Reason: {order.returnReason}</small>}
          {order.returnedAt && (
            <small>Returned on {formatDateTime(order.returnedAt)}</small>
          )}
        </div>
      ) : (
        <div className={styles.trackingTimeline}>
          {statusHistory.length > 0
            ? statusHistory.map((entry, index) => {
                const isCurrent =
                  entry.status === order.orderStatus &&
                  index === statusHistory.length - 1;

                return (
                  <div
                    className={`${styles.trackingStep} ${
                      index < statusHistory.length - 1 ||
                      entry.status === order.orderStatus
                        ? styles.completedStep
                        : ""
                    } ${isCurrent ? styles.activeStep : ""}`}
                    key={`${entry.status}-${entry.updatedAt || index}`}
                  >
                    <div className={styles.trackingMarker}>
                      {index < statusHistory.length - 1 ||
                      entry.status === order.orderStatus
                        ? "✓"
                        : index + 1}
                    </div>
                    <div className={styles.trackingContent}>
                      <strong>{getReadableStatus(entry.status)}</strong>
                      <p>
                        {entry.note ||
                          trackingSteps.find(
                            (step) => step.key === entry.status,
                          )?.description ||
                          "Order status updated."}
                      </p>
                      {entry.updatedAt && (
                        <small>{formatDateTime(entry.updatedAt)}</small>
                      )}
                      {isCurrent && (
                        <span className={styles.currentTrackingLabel}>
                          Current status
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            : trackingSteps.map((step, index) => {
                const completed = index <= currentStep;
                const active = index === currentStep;
                return (
                  <div
                    className={`${styles.trackingStep} ${
                      completed ? styles.completedStep : ""
                    } ${active ? styles.activeStep : ""}`}
                    key={step.key}
                  >
                    <div className={styles.trackingMarker}>
                      {completed ? "✓" : index + 1}
                    </div>
                    <div className={styles.trackingContent}>
                      <strong>{step.title}</strong>
                      <p>{step.description}</p>
                      {active && (
                        <span className={styles.currentTrackingLabel}>
                          Current status
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
        </div>
      )}

      <div className={styles.detailSection}>
        <div className={styles.sectionHeading}>
          <span className={styles.sectionNumber}>TH</span>
          <h3>Tracking History</h3>
        </div>

        {trackingHistory.length === 0 ? (
          <div className={styles.emptyState}>
            <p>
              No courier location updates have been added yet. Order status
              updates are shown above.
            </p>
          </div>
        ) : (
          <div className={styles.trackingTimeline}>
            {trackingHistory.map((entry, index) => (
              <div
                className={`${styles.trackingStep} ${
                  index === 0 ? styles.activeStep : styles.completedStep
                }`}
                key={`${entry.location}-${entry.updatedAt || index}`}
              >
                <div className={styles.trackingMarker}>
                  {index === 0 ? "●" : "✓"}
                </div>
                <div className={styles.trackingContent}>
                  <strong>
                    {entry.location || "Location update"}
                  </strong>
                  {entry.status && (
                    <p>Status: {getReadableStatus(entry.status)}</p>
                  )}
                  {entry.note && <p>{entry.note}</p>}
                  {entry.updatedAt && (
                    <small>{formatDateTime(entry.updatedAt)}</small>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function ProductTracking({ order }: { order: Order }) {
  const items = Array.isArray(order.items) ? order.items : [];
  const trackingId = getActualTrackingId(order);

  return (
    <section className={styles.detailSection}>
      <div className={styles.sectionHeading}>
        <span className={styles.sectionNumber}>03</span>
        <h3>Product-wise Tracking</h3>
      </div>

      <p>
        Tracking is managed at the order/shipment level. Each product below
        follows the same shipment status.
      </p>

      {items.length === 0 ? (
        <div className={styles.emptyState}>
          <p>No product tracking information available.</p>
        </div>
      ) : (
        <div className={styles.productTrackingList}>
          {items.map((item, index) => (
            <div
              className={styles.productTrackingCard}
              key={`${getOrderId(order)}-tracking-${index}`}
            >
              <img
                src={getImageUrl(item.image)}
                alt={item.name || "Product"}
                className={styles.productTrackingImage}
                onError={(event) => {
                  event.currentTarget.src = "/images/product-placeholder.jpg";
                }}
              />
              <div className={styles.productTrackingInfo}>
                <h4>{item.name || "Product unavailable"}</h4>
                <p>
                  Quantity: {item.quantity || 0}
                  {item.size ? ` • ${item.size}` : ""}
                </p>
                <span className={styles.productTrackingStatus}>
                  {getReadableStatus(order.orderStatus)}
                </span>
                <small>
                  Tracking ID:{" "}
                  {trackingId || "Courier tracking not assigned yet"}
                </small>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [search, setSearch] = useState("");

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/orders/my-orders`,
        {
          method: "GET",
          headers: buildHeaders(),
          credentials: "include",
        },
      );

      const data = await parseResponse<OrdersResponse>(
        response,
        "Unable to fetch your orders.",
      );

      if (!data.success) {
        throw new Error(data.message || "Unable to fetch your orders.");
      }

      const fetchedOrders = Array.isArray(data.orders) ? data.orders : [];
      setOrders(fetchedOrders);

      setSelectedOrder((currentSelectedOrder) => {
        if (!currentSelectedOrder) return null;
        const selectedId = getOrderId(currentSelectedOrder);
        return (
          fetchedOrders.find((order) => getOrderId(order) === selectedId) ||
          null
        );
      });
    } catch (error) {
      setError(getErrorMessage(error, "Unable to fetch your orders."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    return orders.filter((order) => {
      const orderNumber = order.orderNumber || "";
      const trackingId =
        order.tracking?.trackingId || order.trackingId || "";
      const items = Array.isArray(order.items) ? order.items : [];

      const matchesStatus =
        statusFilter === "ALL" || order.orderStatus === statusFilter;

      const matchesSearch =
        !normalizedSearch ||
        orderNumber.toLowerCase().includes(normalizedSearch) ||
        trackingId.toLowerCase().includes(normalizedSearch) ||
        (order.tracking?.courierName || "")
          .toLowerCase()
          .includes(normalizedSearch) ||
        items.some((item) =>
          (item.name || "").toLowerCase().includes(normalizedSearch),
        );

      return matchesStatus && matchesSearch;
    });
  }, [orders, search, statusFilter]);

  const cancelOrder = async (order: Order) => {
    const orderId = getOrderId(order);
    if (!orderId || actionLoading) return;

    if (!canCancelOrder(order.orderStatus)) {
      setError("This order can no longer be cancelled.");
      return;
    }

    if (!window.confirm("Are you sure you want to cancel this order?")) return;

    try {
      setActionLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/orders/${orderId}/cancel`,
        {
          method: "PUT",
          headers: buildHeaders(),
          credentials: "include",
          body: JSON.stringify({ reason: "Cancelled by customer" }),
        },
      );

      const data = await parseResponse<OrdersResponse>(
        response,
        "Unable to cancel order.",
      );

      if (!data.success) {
        throw new Error(data.message || "Unable to cancel order.");
      }

      if (data.order) {
        setSelectedOrder((current) =>
          current && getOrderId(current) === orderId ? data.order! : current,
        );
      }

      await fetchOrders();
    } catch (error) {
      setError(getErrorMessage(error, "Unable to cancel order."));
    } finally {
      setActionLoading(false);
    }
  };

  const requestReturn = async (order: Order) => {
    const orderId = getOrderId(order);
    if (!orderId || actionLoading) return;

    if (!canRequestReturn(order.orderStatus)) {
      setError("Return can only be requested for delivered orders.");
      return;
    }

    const reason = window.prompt(
      "Please enter the reason for your return request:",
    );
    if (!reason?.trim()) return;

    try {
      setActionLoading(true);
      setError("");

      const response = await fetch(
        `${API_BASE_URL}/api/orders/${orderId}/return`,
        {
          method: "PUT",
          headers: buildHeaders(),
          credentials: "include",
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );

      const data = await parseResponse<OrdersResponse>(
        response,
        "Unable to request return.",
      );

      if (!data.success) {
        throw new Error(data.message || "Unable to request return.");
      }

      if (data.order) {
        setSelectedOrder((current) =>
          current && getOrderId(current) === orderId ? data.order! : current,
        );
      }

      await fetchOrders();
    } catch (error) {
      setError(getErrorMessage(error, "Unable to request return."));
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <>
      <MainHeader />

      <main className={styles.page}>
        <section className={styles.heroSection}>
          <div className={styles.heroGlow} />
          <div className={styles.container}>
            <div className={styles.headingRow}>
              <div className={styles.headingContent}>
                <p className={styles.eyebrow}>JIHAAN COSMETICS</p>
                <h1 className={styles.title}>
                  Your order,
                  <span> beautifully tracked.</span>
                </h1>
                <p className={styles.subtitle}>
                  Track your purchases, review order details, and stay updated
                  at every step of your beauty journey.
                </p>
              </div>

              <button
                type="button"
                className={styles.refreshButton}
                onClick={() => void fetchOrders()}
                disabled={loading || actionLoading}
              >
                <span>{loading ? "Refreshing..." : "Refresh Orders"}</span>
                <span className={styles.buttonArrow}>↗</span>
              </button>
            </div>

            <div className={styles.heroStats}>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Total Orders</span>
                <strong>{orders.length}</strong>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>Delivered</span>
                <strong>
                  {
                    orders.filter(
                      (order) => order.orderStatus === "DELIVERED",
                    ).length
                  }
                </strong>
              </div>
              <div className={styles.statCard}>
                <span className={styles.statLabel}>In Progress</span>
                <strong>
                  {
                    orders.filter((order) =>
                      [
                        "PLACED",
                        "CONFIRMED",
                        "PROCESSING",
                        "SHIPPED",
                        "OUT_FOR_DELIVERY",
                      ].includes(order.orderStatus || ""),
                    ).length
                  }
                </strong>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.container}>
          {error && (
            <div className={styles.errorBox} role="alert">
              <span>!</span>
              <div>
                <strong>Something went wrong</strong>
                <p>{error}</p>
              </div>
            </div>
          )}

          <div className={styles.toolbar}>
            <div className={styles.toolbarHeading}>
              <p className={styles.eyebrow}>ORDER HISTORY</p>
              <h2>All your purchases</h2>
            </div>

            <div className={styles.toolbarControls}>
              <label className={styles.searchWrapper}>
                <span className={styles.searchIcon} aria-hidden="true">
                  ⌕
                </span>
                <input
                  type="search"
                  placeholder="Search orders or products..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className={styles.searchInput}
                  aria-label="Search orders"
                />
              </label>

              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className={styles.statusSelect}
                aria-label="Filter orders by status"
              >
                <option value="ALL">All Orders</option>
                <option value="PLACED">Placed</option>
                <option value="CONFIRMED">Confirmed</option>
                <option value="PROCESSING">Processing</option>
                <option value="SHIPPED">Shipped</option>
                <option value="OUT_FOR_DELIVERY">Out For Delivery</option>
                <option value="DELIVERED">Delivered</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="RETURN_REQUESTED">Return Requested</option>
                <option value="RETURNED">Returned</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className={styles.stateBox}>
              <div className={styles.loader} />
              <p>Loading your orders...</p>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>🛍</div>
              <h2>No orders found</h2>
              <p>
                {orders.length === 0
                  ? "You have not placed any orders yet."
                  : "Try changing your search or order filter."}
              </p>
              {search || statusFilter !== "ALL" ? (
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={() => {
                    setSearch("");
                    setStatusFilter("ALL");
                  }}
                >
                  Clear Filters
                </button>
              ) : null}
            </div>
          ) : (
            <div className={styles.ordersList}>
              {filteredOrders.map((order, orderIndex) => {
                const orderId = getOrderId(order);
                const items = Array.isArray(order.items) ? order.items : [];
                const trackingId = getActualTrackingId(order);

                return (
                  <article
                    className={styles.orderCard}
                    key={orderId || `${order.orderNumber}-${orderIndex}`}
                  >
                    <div className={styles.orderTop}>
                      <div>
                        <p className={styles.orderLabel}>ORDER NUMBER</p>
                        <h2 className={styles.orderNumber}>
                          {order.orderNumber || "Order number unavailable"}
                        </h2>
                        <p className={styles.orderDate}>
                          Placed on {formatDate(order.createdAt)}
                        </p>
                        <p className={styles.orderDate}>
                          {trackingId
                            ? `Tracking ID: ${trackingId}`
                            : "Courier tracking ID not assigned yet"}
                        </p>
                      </div>

                      <span
                        className={`${styles.statusBadge} ${getStatusClass(
                          order.orderStatus,
                        )}`}
                      >
                        <span className={styles.statusDot} />
                        {getReadableStatus(order.orderStatus)}
                      </span>
                    </div>

                    <div className={styles.productPreview}>
                      {items.slice(0, 3).map((item, index) => (
                        <div
                          className={styles.productRow}
                          key={`${orderId || orderIndex}-${index}`}
                        >
                          <img
                            src={getImageUrl(item.image)}
                            alt={item.name || "Product"}
                            className={styles.productImage}
                            onError={(event) => {
                              event.currentTarget.src =
                                "/images/product-placeholder.jpg";
                            }}
                          />
                          <div className={styles.productInfo}>
                            <h3>{item.name || "Product unavailable"}</h3>
                            <p>
                              Qty: {item.quantity || 0}
                              {item.size ? ` • ${item.size}` : ""}
                            </p>
                          </div>
                          <strong className={styles.itemPrice}>
                            {formatCurrency(item.subtotal)}
                          </strong>
                        </div>
                      ))}

                      {items.length > 3 && (
                        <p className={styles.moreItems}>
                          +{items.length - 3} more item(s)
                        </p>
                      )}
                    </div>

                    <div className={styles.orderBottom}>
                      <div>
                        <p className={styles.totalLabel}>Total Amount</p>
                        <strong className={styles.totalAmount}>
                          {formatCurrency(order.totalAmount)}
                        </strong>
                      </div>

                      <div className={styles.cardActions}>
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          onClick={() => setSelectedOrder(order)}
                        >
                          View Details <span>↗</span>
                        </button>

                        {canCancelOrder(order.orderStatus) && (
                          <button
                            type="button"
                            className={styles.dangerButton}
                            onClick={() => void cancelOrder(order)}
                            disabled={actionLoading}
                          >
                            {actionLoading ? "Please wait..." : "Cancel"}
                          </button>
                        )}

                        {canRequestReturn(order.orderStatus) && (
                          <button
                            type="button"
                            className={styles.secondaryButton}
                            onClick={() => void requestReturn(order)}
                            disabled={actionLoading}
                          >
                            Return
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {selectedOrder && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSelectedOrder(null)}
          role="presentation"
        >
          <div
            className={styles.modal}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-labelledby="order-details-title"
          >
            <div className={styles.modalHeader}>
              <div>
                <p className={styles.eyebrow}>ORDER DETAILS</p>
                <h2 id="order-details-title">
                  {selectedOrder.orderNumber || "Order Details"}
                </h2>
                <p className={styles.detailDate}>
                  {formatDateTime(selectedOrder.createdAt)}
                </p>
              </div>

              <button
                type="button"
                className={styles.closeButton}
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
              >
                ×
              </button>
            </div>

            <div className={styles.detailStatusRow}>
              <span
                className={`${styles.statusBadge} ${getStatusClass(
                  selectedOrder.orderStatus,
                )}`}
              >
                <span className={styles.statusDot} />
                {getReadableStatus(selectedOrder.orderStatus)}
              </span>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionNumber}>01</span>
                <h3>Products</h3>
              </div>

              {(selectedOrder.items || []).length === 0 ? (
                <p>No products available.</p>
              ) : (
                (selectedOrder.items || []).map((item, index) => (
                  <div
                    className={styles.detailProduct}
                    key={`${getOrderId(selectedOrder)}-detail-${index}`}
                  >
                    <img
                      src={getImageUrl(item.image)}
                      alt={item.name || "Product"}
                      className={styles.detailImage}
                      onError={(event) => {
                        event.currentTarget.src =
                          "/images/product-placeholder.jpg";
                      }}
                    />
                    <div className={styles.detailProductInfo}>
                      <h4>{item.name || "Product unavailable"}</h4>
                      <p>
                        Qty: {item.quantity || 0}
                        {item.size ? ` • ${item.size}` : ""}
                      </p>
                      {typeof item.price === "number" && (
                        <small>
                          Unit price: {formatCurrency(item.price)}
                        </small>
                      )}
                    </div>
                    <strong>{formatCurrency(item.subtotal)}</strong>
                  </div>
                ))
              )}
            </div>

            <OrderTracking order={selectedOrder} />

            <ProductTracking order={selectedOrder} />

            <div className={styles.detailSection}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionNumber}>04</span>
                <h3>Shipping Address</h3>
              </div>

              <address className={styles.address}>
                <strong>
                  {selectedOrder.shippingAddress?.fullName || "N/A"}
                </strong>
                <br />
                {selectedOrder.shippingAddress?.addressLine1 || "N/A"}
                <br />
                {selectedOrder.shippingAddress?.addressLine2 && (
                  <>
                    {selectedOrder.shippingAddress.addressLine2}
                    <br />
                  </>
                )}
                {selectedOrder.shippingAddress?.city || "N/A"},{" "}
                {selectedOrder.shippingAddress?.state || "N/A"} -{" "}
                {selectedOrder.shippingAddress?.postalCode || "N/A"}
                <br />
                {selectedOrder.shippingAddress?.country || "India"}
                <br />
                Phone: {selectedOrder.shippingAddress?.phone || "N/A"}
              </address>
            </div>

            <div className={styles.detailSection}>
              <div className={styles.sectionHeading}>
                <span className={styles.sectionNumber}>05</span>
                <h3>Payment Summary</h3>
              </div>

              <div className={styles.summaryRow}>
                <span>Subtotal</span>
                <strong>{formatCurrency(selectedOrder.subtotal)}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Shipping</span>
                <strong>
                  {formatCurrency(selectedOrder.shippingCharge)}
                </strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Discount</span>
                <strong>-{formatCurrency(selectedOrder.discount)}</strong>
              </div>

              {selectedOrder.couponCode && (
                <div className={styles.summaryRow}>
                  <span>Coupon</span>
                  <strong>{selectedOrder.couponCode}</strong>
                </div>
              )}

              <div className={styles.summaryRow}>
                <span>Payment Method</span>
                <strong>{selectedOrder.paymentMethod || "N/A"}</strong>
              </div>
              <div className={styles.summaryRow}>
                <span>Payment Status</span>
                <strong>{selectedOrder.paymentStatus || "N/A"}</strong>
              </div>
              <div
                className={`${styles.summaryRow} ${styles.grandTotal}`}
              >
                <span>Total</span>
                <strong>
                  {formatCurrency(selectedOrder.totalAmount)}
                </strong>
              </div>
            </div>

            {selectedOrder.notes && (
              <div className={styles.detailSection}>
                <div className={styles.sectionHeading}>
                  <span className={styles.sectionNumber}>06</span>
                  <h3>Order Notes</h3>
                </div>
                <p>{selectedOrder.notes}</p>
              </div>
            )}

            <div className={styles.modalActions}>
              {canCancelOrder(selectedOrder.orderStatus) && (
                <button
                  type="button"
                  className={styles.dangerButton}
                  onClick={() => void cancelOrder(selectedOrder)}
                  disabled={actionLoading}
                >
                  {actionLoading ? "Please wait..." : "Cancel Order"}
                </button>
              )}

              {canRequestReturn(selectedOrder.orderStatus) && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={() => void requestReturn(selectedOrder)}
                  disabled={actionLoading}
                >
                  Request Return
                </button>
              )}

              <button
                type="button"
                className={styles.primaryButton}
                onClick={() => setSelectedOrder(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </>
  );
}
