import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle2,
  Clock3,
  Eye,
  Package,
  RefreshCw,
  Search,
  Truck,
  X,
  XCircle,
} from "lucide-react";

import "./OrdersManager.css";

type OrderStatus =
  | "PLACED"
  | "CONFIRMED"
  | "PROCESSING"
  | "SHIPPED"
  | "OUT_FOR_DELIVERY"
  | "DELIVERED"
  | "CANCELLED"
  | "RETURN_REQUESTED"
  | "RETURNED";

type PaymentStatus =
  | "PENDING"
  | "RECEIVED"
  | "PAID"
  | "FAILED"
  | "REFUNDED";

interface OrderItem {
  product?: string;
  name: string;
  image?: string;
  price: number;
  quantity: number;
  size?: string;
  subtotal: number;
}

interface ShippingAddress {
  fullName: string;
  phone: string;
  email?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
}

interface OrderUser {
  _id?: string;
  name?: string;
  email?: string;
}

interface Order {
  _id: string;
  orderNumber: string;
  user?: OrderUser;
  items: OrderItem[];
  shippingAddress: ShippingAddress;
  paymentMethod: "COD" | "ONLINE";
  paymentStatus: PaymentStatus;
  paymentReceivedAt?: string | null;
  paymentReceiptUrl?: string;
  paymentNote?: string;
  orderStatus: OrderStatus;
  subtotal: number;
  shippingCharge: number;
  discount: number;
  totalAmount: number;
  trackingId?: string;
  courierName?: string;
  trackingUrl?: string;
  shippedAt?: string | null;
  expectedDeliveryAt?: string | null;
  deliveredAt?: string | null;
  createdAt: string;
  adminNote?: string;
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const ORDER_STATUSES: OrderStatus[] = [
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

const PAYMENT_STATUSES: PaymentStatus[] = [
  "PENDING",
  "RECEIVED",
  "PAID",
  "FAILED",
  "REFUNDED",
];

const formatCurrency = (amount = 0) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (date?: string | null) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (date?: string | null) => {
  if (!date) return "—";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "—";
  }

  return parsedDate.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const statusLabel = (status: string) => {
  return status
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const statusClass = (status: string) => {
  return status.toLowerCase().replaceAll("_", "-");
};

const getToken = () => {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    ""
  );
};

export default function OrdersManager() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [paymentFilter, setPaymentFilter] = useState("ALL");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const [selectedStatus, setSelectedStatus] =
    useState<OrderStatus>("PLACED");

  const [selectedPaymentStatus, setSelectedPaymentStatus] =
    useState<PaymentStatus>("PENDING");

  const [trackingId, setTrackingId] = useState("");
  const [courierName, setCourierName] = useState("");
  const [trackingUrl, setTrackingUrl] = useState("");
  const [expectedDeliveryAt, setExpectedDeliveryAt] = useState("");

  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState("");
  const [paymentNote, setPaymentNote] = useState("");

  const requestHeaders = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };

  const showError = (message: string) => {
    setError(message);
    setSuccessMessage("");
  };

  const showSuccess = (message: string) => {
    setSuccessMessage(message);
    setError("");
  };

  const extractOrders = (data: unknown): Order[] => {
    if (!data || typeof data !== "object") {
      return [];
    }

    const responseData = data as {
      orders?: Order[];
      data?: Order[] | { orders?: Order[] };
    };

    if (Array.isArray(responseData.orders)) {
      return responseData.orders;
    }

    if (Array.isArray(responseData.data)) {
      return responseData.data;
    }

    if (
      responseData.data &&
      typeof responseData.data === "object" &&
      Array.isArray(responseData.data.orders)
    ) {
      return responseData.data.orders;
    }

    return [];
  };

  const extractOrder = (data: unknown): Order | null => {
    if (!data || typeof data !== "object") {
      return null;
    }

    const responseData = data as {
      order?: Order;
      data?: Order;
    };

    if (responseData.order) {
      return responseData.order;
    }

    if (responseData.data && !Array.isArray(responseData.data)) {
      return responseData.data;
    }

    return null;
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError("");
      setSuccessMessage("");

      const response = await fetch(`${API_BASE_URL}/admin/orders`, {
        method: "GET",
        headers: requestHeaders,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load orders");
      }

      setOrders(extractOrders(data));
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to load orders",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return orders.filter((order) => {
      const searchableText = [
        order.orderNumber,
        order.user?.name,
        order.user?.email,
        order.shippingAddress?.fullName,
        order.shippingAddress?.phone,
        order.trackingId,
        order.courierName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !search || searchableText.includes(search);

      const matchesStatus =
        statusFilter === "ALL" || order.orderStatus === statusFilter;

      const matchesPayment =
        paymentFilter === "ALL" ||
        order.paymentStatus === paymentFilter;

      return matchesSearch && matchesStatus && matchesPayment;
    });
  }, [orders, searchTerm, statusFilter, paymentFilter]);

  const statistics = useMemo(() => {
    return {
      total: orders.length,
      placed: orders.filter((order) => order.orderStatus === "PLACED").length,
      processing: orders.filter((order) =>
        ["CONFIRMED", "PROCESSING"].includes(order.orderStatus),
      ).length,
      delivery: orders.filter((order) =>
        ["SHIPPED", "OUT_FOR_DELIVERY"].includes(order.orderStatus),
      ).length,
      delivered: orders.filter(
        (order) => order.orderStatus === "DELIVERED",
      ).length,
      pendingPayment: orders.filter(
        (order) => order.paymentStatus === "PENDING",
      ).length,
    };
  }, [orders]);

  const openOrder = (order: Order) => {
    setSelectedOrder(order);

    setSelectedStatus(order.orderStatus);
    setSelectedPaymentStatus(order.paymentStatus);

    setTrackingId(order.trackingId || "");
    setCourierName(order.courierName || "");
    setTrackingUrl(order.trackingUrl || "");
    setExpectedDeliveryAt(
      order.expectedDeliveryAt
        ? order.expectedDeliveryAt.substring(0, 10)
        : "",
    );

    setPaymentReceiptUrl(order.paymentReceiptUrl || "");
    setPaymentNote(order.paymentNote || "");

    setError("");
    setSuccessMessage("");
  };

  const updateLocalOrder = (updatedOrder: Order | null, fallback: Partial<Order>) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) =>
        order._id === selectedOrder?._id
          ? updatedOrder || { ...order, ...fallback }
          : order,
      ),
    );

    setSelectedOrder((currentOrder) =>
      currentOrder
        ? updatedOrder || { ...currentOrder, ...fallback }
        : null,
    );
  };

  const updateOrderStatus = async () => {
    if (!selectedOrder) return;

    try {
      setSaving(true);

      const response = await fetch(
        `${API_BASE_URL}/admin/orders/${selectedOrder._id}/status`,
        {
          method: "PUT",
          headers: requestHeaders,
          body: JSON.stringify({
            orderStatus: selectedStatus,
            note: `Order status updated to ${statusLabel(selectedStatus)}`,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update order status");
      }

      updateLocalOrder(extractOrder(data), {
        orderStatus: selectedStatus,
      });

      showSuccess("Order status updated successfully.");
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update order status",
      );
    } finally {
      setSaving(false);
    }
  };

  const updatePayment = async () => {
    if (!selectedOrder) return;

    try {
      setSaving(true);

      const response = await fetch(
        `${API_BASE_URL}/admin/orders/${selectedOrder._id}/payment`,
        {
          method: "PUT",
          headers: requestHeaders,
          body: JSON.stringify({
            paymentStatus: selectedPaymentStatus,
            paymentReceiptUrl,
            paymentNote,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update payment");
      }

      updateLocalOrder(extractOrder(data), {
        paymentStatus: selectedPaymentStatus,
        paymentReceiptUrl,
        paymentNote,
      });

      showSuccess("Payment details updated successfully.");
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update payment",
      );
    } finally {
      setSaving(false);
    }
  };

  const updateTracking = async () => {
    if (!selectedOrder) return;

    try {
      setSaving(true);

      const response = await fetch(
        `${API_BASE_URL}/admin/orders/${selectedOrder._id}/tracking`,
        {
          method: "PUT",
          headers: requestHeaders,
          body: JSON.stringify({
            trackingId,
            courierName,
            trackingUrl,
            expectedDeliveryAt: expectedDeliveryAt || null,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update tracking");
      }

      updateLocalOrder(extractOrder(data), {
        trackingId,
        courierName,
        trackingUrl,
        expectedDeliveryAt: expectedDeliveryAt || null,
      });

      showSuccess("Tracking details updated successfully.");
    } catch (requestError) {
      showError(
        requestError instanceof Error
          ? requestError.message
          : "Failed to update tracking",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="ordersManager">
      <div className="ordersManagerHeader">
        <div>
          <span className="ordersManagerEyebrow">ADMIN PANEL</span>
          <h1>Order Management</h1>
          <p>
            Manage customer orders, payment receipts, order confirmation and
            courier tracking.
          </p>
        </div>

        <button
          type="button"
          className="ordersRefreshButton"
          onClick={fetchOrders}
          disabled={loading}
        >
          <RefreshCw size={17} />
          Refresh
        </button>
      </div>

      {error && <div className="ordersAlert ordersAlertError">{error}</div>}

      {successMessage && (
        <div className="ordersAlert ordersAlertSuccess">
          {successMessage}
        </div>
      )}

      <div className="ordersStatsGrid">
        <div className="ordersStatCard">
          <span className="ordersStatIcon">
            <Package size={20} />
          </span>
          <div>
            <span>Total Orders</span>
            <strong>{statistics.total}</strong>
          </div>
        </div>

        <div className="ordersStatCard">
          <span className="ordersStatIcon pending">
            <Clock3 size={20} />
          </span>
          <div>
            <span>New Orders</span>
            <strong>{statistics.placed}</strong>
          </div>
        </div>

        <div className="ordersStatCard">
          <span className="ordersStatIcon processing">
            <RefreshCw size={20} />
          </span>
          <div>
            <span>Processing</span>
            <strong>{statistics.processing}</strong>
          </div>
        </div>

        <div className="ordersStatCard">
          <span className="ordersStatIcon shipping">
            <Truck size={20} />
          </span>
          <div>
            <span>In Delivery</span>
            <strong>{statistics.delivery}</strong>
          </div>
        </div>

        <div className="ordersStatCard">
          <span className="ordersStatIcon delivered">
            <CheckCircle2 size={20} />
          </span>
          <div>
            <span>Delivered</span>
            <strong>{statistics.delivered}</strong>
          </div>
        </div>

        <div className="ordersStatCard">
          <span className="ordersStatIcon payment">
            <Clock3 size={20} />
          </span>
          <div>
            <span>Pending Payment</span>
            <strong>{statistics.pendingPayment}</strong>
          </div>
        </div>
      </div>

      <div className="ordersFilters">
        <div className="ordersSearch">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search order, customer or tracking ID..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
        >
          <option value="ALL">All Order Status</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>

        <select
          value={paymentFilter}
          onChange={(event) => setPaymentFilter(event.target.value)}
        >
          <option value="ALL">All Payment Status</option>
          {PAYMENT_STATUSES.map((status) => (
            <option key={status} value={status}>
              {statusLabel(status)}
            </option>
          ))}
        </select>
      </div>

      <div className="ordersTableCard">
        <div className="ordersTableHeading">
          <div>
            <h2>All Orders</h2>
            <p>{filteredOrders.length} order(s) found</p>
          </div>
        </div>

        {loading ? (
          <div className="ordersEmptyState">Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div className="ordersEmptyState">
            <Package size={42} />
            <h3>No orders found</h3>
            <p>Try changing your search or filters.</p>
          </div>
        ) : (
          <div className="ordersTableScroll">
            <table className="ordersTable">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Date</th>
                  <th>Total</th>
                  <th>Payment</th>
                  <th>Order Status</th>
                  <th>Tracking</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredOrders.map((order) => (
                  <tr key={order._id}>
                    <td>
                      <strong>{order.orderNumber}</strong>
                      <small>
                        {order.items?.length || 0} item(s)
                      </small>
                    </td>

                    <td>
                      <strong>
                        {order.user?.name ||
                          order.shippingAddress?.fullName ||
                          "Customer"}
                      </strong>
                      <small>
                        {order.user?.email ||
                          order.shippingAddress?.phone ||
                          "—"}
                      </small>
                    </td>

                    <td>{formatDate(order.createdAt)}</td>

                    <td>
                      <strong>{formatCurrency(order.totalAmount)}</strong>
                    </td>

                    <td>
                      <span
                        className={`ordersStatusBadge ${statusClass(
                          order.paymentStatus,
                        )}`}
                      >
                        {statusLabel(order.paymentStatus)}
                      </span>
                      <small>{order.paymentMethod}</small>
                    </td>

                    <td>
                      <span
                        className={`ordersStatusBadge ${statusClass(
                          order.orderStatus,
                        )}`}
                      >
                        {statusLabel(order.orderStatus)}
                      </span>
                    </td>

                    <td>
                      {order.trackingId ? (
                        <span className="trackingAvailable">
                          <Truck size={14} />
                          {order.trackingId}
                        </span>
                      ) : (
                        <span className="trackingMissing">Not added</span>
                      )}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="ordersViewButton"
                        onClick={() => openOrder(order)}
                      >
                        <Eye size={16} />
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedOrder && (
        <div
          className="ordersModalOverlay"
          onClick={() => setSelectedOrder(null)}
        >
          <div
            className="ordersModal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="ordersModalHeader">
              <div>
                <span className="ordersManagerEyebrow">ORDER DETAILS</span>
                <h2>{selectedOrder.orderNumber}</h2>
                <p>
                  Created on {formatDateTime(selectedOrder.createdAt)}
                </p>
              </div>

              <button
                type="button"
                className="ordersCloseButton"
                onClick={() => setSelectedOrder(null)}
                aria-label="Close order details"
              >
                <X size={21} />
              </button>
            </div>

            <div className="ordersModalBody">
              <div className="ordersDetailsGrid">
                <div className="ordersDetailsCard">
                  <h3>Customer Details</h3>
                  <p>
                    <strong>
                      {selectedOrder.shippingAddress.fullName}
                    </strong>
                  </p>
                  <p>{selectedOrder.shippingAddress.phone}</p>
                  {selectedOrder.shippingAddress.email && (
                    <p>{selectedOrder.shippingAddress.email}</p>
                  )}
                </div>

                <div className="ordersDetailsCard">
                  <h3>Shipping Address</h3>
                  <p>{selectedOrder.shippingAddress.addressLine1}</p>

                  {selectedOrder.shippingAddress.addressLine2 && (
                    <p>{selectedOrder.shippingAddress.addressLine2}</p>
                  )}

                  <p>
                    {selectedOrder.shippingAddress.city},{" "}
                    {selectedOrder.shippingAddress.state}
                  </p>

                  <p>
                    {selectedOrder.shippingAddress.postalCode},{" "}
                    {selectedOrder.shippingAddress.country || "India"}
                  </p>
                </div>
              </div>

              <div className="ordersDetailsCard">
                <h3>Order Items</h3>

                <div className="adminOrderItems">
                  {selectedOrder.items.map((item, index) => (
                    <div
                      className="adminOrderItem"
                      key={`${item.name}-${index}`}
                    >
                      {item.image ? (
                        <img src={item.image} alt={item.name} />
                      ) : (
                        <div className="adminOrderItemPlaceholder">
                          No Image
                        </div>
                      )}

                      <div className="adminOrderItemInfo">
                        <strong>{item.name}</strong>
                        <span>
                          Quantity: {item.quantity} · Size:{" "}
                          {item.size || "Standard"}
                        </span>
                      </div>

                      <strong>{formatCurrency(item.subtotal)}</strong>
                    </div>
                  ))}
                </div>

                <div className="ordersAmountSummary">
                  <div>
                    <span>Subtotal</span>
                    <strong>
                      {formatCurrency(selectedOrder.subtotal)}
                    </strong>
                  </div>

                  <div>
                    <span>Shipping</span>
                    <strong>
                      {formatCurrency(selectedOrder.shippingCharge)}
                    </strong>
                  </div>

                  <div>
                    <span>Discount</span>
                    <strong>
                      -{formatCurrency(selectedOrder.discount)}
                    </strong>
                  </div>

                  <div className="ordersGrandTotal">
                    <span>Total Amount</span>
                    <strong>
                      {formatCurrency(selectedOrder.totalAmount)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="ordersEditGrid">
                <div className="ordersDetailsCard">
                  <h3>Order Confirmation & Status</h3>

                  <label htmlFor="adminOrderStatus">
                    Order status
                  </label>

                  <select
                    id="adminOrderStatus"
                    value={selectedStatus}
                    onChange={(event) =>
                      setSelectedStatus(
                        event.target.value as OrderStatus,
                      )
                    }
                  >
                    {ORDER_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>

                  <div className="orderCurrentStatus">
                    Current:{" "}
                    <strong>
                      {statusLabel(selectedOrder.orderStatus)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="ordersPrimaryButton"
                    onClick={updateOrderStatus}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Update Order Status"}
                  </button>
                </div>

                <div className="ordersDetailsCard">
                  <h3>Payment Receipt</h3>

                  <label htmlFor="adminPaymentStatus">
                    Payment status
                  </label>

                  <select
                    id="adminPaymentStatus"
                    value={selectedPaymentStatus}
                    onChange={(event) =>
                      setSelectedPaymentStatus(
                        event.target.value as PaymentStatus,
                      )
                    }
                  >
                    {PAYMENT_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {statusLabel(status)}
                      </option>
                    ))}
                  </select>

                  <label htmlFor="paymentReceiptUrl">
                    Receipt URL
                  </label>

                  <input
                    id="paymentReceiptUrl"
                    type="url"
                    placeholder="https://example.com/receipt"
                    value={paymentReceiptUrl}
                    onChange={(event) =>
                      setPaymentReceiptUrl(event.target.value)
                    }
                  />

                  <label htmlFor="paymentNote">Payment note</label>

                  <textarea
                    id="paymentNote"
                    rows={3}
                    placeholder="Enter payment details..."
                    value={paymentNote}
                    onChange={(event) =>
                      setPaymentNote(event.target.value)
                    }
                  />

                  <button
                    type="button"
                    className="ordersPrimaryButton"
                    onClick={updatePayment}
                    disabled={saving}
                  >
                    {saving ? "Saving..." : "Update Payment"}
                  </button>
                </div>
              </div>

              <div className="ordersDetailsCard">
                <h3>Courier Tracking</h3>

                <div className="trackingFieldsGrid">
                  <div>
                    <label htmlFor="trackingId">Tracking ID</label>
                    <input
                      id="trackingId"
                      type="text"
                      placeholder="Enter tracking ID"
                      value={trackingId}
                      onChange={(event) =>
                        setTrackingId(event.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label htmlFor="courierName">Courier Name</label>
                    <input
                      id="courierName"
                      type="text"
                      placeholder="Delhivery, Blue Dart..."
                      value={courierName}
                      onChange={(event) =>
                        setCourierName(event.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label htmlFor="trackingUrl">Tracking URL</label>
                    <input
                      id="trackingUrl"
                      type="url"
                      placeholder="https://courier.com/track"
                      value={trackingUrl}
                      onChange={(event) =>
                        setTrackingUrl(event.target.value)
                      }
                    />
                  </div>

                  <div>
                    <label htmlFor="expectedDeliveryAt">
                      Expected Delivery
                    </label>
                    <input
                      id="expectedDeliveryAt"
                      type="date"
                      value={expectedDeliveryAt}
                      onChange={(event) =>
                        setExpectedDeliveryAt(event.target.value)
                      }
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className="ordersPrimaryButton"
                  onClick={updateTracking}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Tracking Details"}
                </button>

                {selectedOrder.trackingUrl && (
                  <a
                    className="ordersTrackingLink"
                    href={selectedOrder.trackingUrl}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open tracking website
                  </a>
                )}
              </div>

              <div className="ordersTimelineCard">
                <h3>Delivery Timeline</h3>

                <div className="ordersTimeline">
                  <div className="timelineItem completed">
                    <span />
                    <div>
                      <strong>Order Placed</strong>
                      <small>{formatDateTime(selectedOrder.createdAt)}</small>
                    </div>
                  </div>

                  <div
                    className={`timelineItem ${
                      ["CONFIRMED", "PROCESSING", "SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
                        selectedOrder.orderStatus,
                      )
                        ? "completed"
                        : ""
                    }`}
                  >
                    <span />
                    <div>
                      <strong>Order Confirmed</strong>
                      <small>
                        {selectedOrder.orderStatus === "PLACED"
                          ? "Waiting for confirmation"
                          : "Confirmed or processing"}
                      </small>
                    </div>
                  </div>

                  <div
                    className={`timelineItem ${
                      ["SHIPPED", "OUT_FOR_DELIVERY", "DELIVERED"].includes(
                        selectedOrder.orderStatus,
                      )
                        ? "completed"
                        : ""
                    }`}
                  >
                    <span />
                    <div>
                      <strong>Shipped</strong>
                      <small>{formatDateTime(selectedOrder.shippedAt)}</small>
                    </div>
                  </div>

                  <div
                    className={`timelineItem ${
                      selectedOrder.orderStatus === "DELIVERED"
                        ? "completed"
                        : ""
                    }`}
                  >
                    <span />
                    <div>
                      <strong>Delivered</strong>
                      <small>
                        {formatDateTime(selectedOrder.deliveredAt)}
                      </small>
                    </div>
                  </div>
                </div>
              </div>

              {selectedOrder.orderStatus === "CANCELLED" && (
                <div className="ordersCancelledNotice">
                  <XCircle size={18} />
                  This order has been cancelled.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}