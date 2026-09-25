import axios from "axios";

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/+$/, "");

const staffApi = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
  },
});

// ==================================================
// TYPES
// ==================================================

export type StaffRole =
  | "superadmin"
  | "admin"
  | "accounts"
  | "logistics";

export interface StaffUser {
  id: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  role: StaffRole;
  isActive: boolean;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LoginResponse {
  success: boolean;
  message: string;
  token?: string;
  user: StaffUser;
}

// ==================================================
// ACCOUNTS TYPES
// ==================================================

export interface AccountsOverview {
  totalOrders: number;
  totalSales: number;
  paidAmount: number;
  pendingAmount: number;
  refundedAmount: number;
  cancelledAmount: number;
  totalCustomers: number;
  totalProducts: number;
}

export interface SalesData {
  summary: {
    orders: number;
    sales: number;
    averageOrderValue: number;
  };

  dailySales: Array<{
    date?: string;
    _id?: string | { date?: string };
    orders: number;
    sales: number;
  }>;

  paymentBreakdown: Array<{
    status?: string;
    _id?: string;
    count?: number;
    orders?: number;
    amount: number;
  }>;

  statusBreakdown: Array<{
    status?: string;
    _id?: string;
    count?: number;
    orders?: number;
  }>;
}

// ==================================================
// ORDER TYPES
// ==================================================

export interface AccountOrder {
  _id: string;
  orderNumber?: string;

  user?: {
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };

  totalAmount?: number;
  subtotal?: number;
  shippingFee?: number;
  discountAmount?: number;

  paymentStatus?: string;
  paymentMethod?: string;
  orderStatus?: string;

  createdAt?: string;
  updatedAt?: string;

  currentLocation?: string;
  locationUpdatedAt?: string;

  trackingId?: string;
  courierName?: string;
  trackingUrl?: string;

  expectedDeliveryAt?: string;
  shippedAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;

  orderStatusHistory?: Array<{
    status?: string;
    note?: string;
    updatedBy?: {
      _id?: string;
      name?: string;
      email?: string;
    };
    updatedAt?: string;
  }>;

  trackingHistory?: Array<{
    location?: string;
    note?: string;
    status?: string;
    updatedBy?: {
      _id?: string;
      name?: string;
      email?: string;
    };
    updatedAt?: string;
  }>;
}

export interface InventoryProduct {
  _id: string;
  name?: string;
  title?: string;
  sku?: string;

  price?: number;
  salePrice?: number;
  discountPrice?: number;

  stock: number;

  isActive?: boolean;
  active?: boolean;

  inventoryValue?: number;
  lowStock?: boolean;
  outOfStock?: boolean;

  images?: string[];
  image?: string;
}

// ==================================================
// LOGISTICS TYPES
// ==================================================

export interface LogisticsOverview {
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  shippedOrders: number;
  outForDeliveryOrders: number;
  deliveredOrders: number;
  cancelledOrders: number;
  returnOrders: number;
}

export interface LogisticsOrder {
  _id: string;
  orderNumber?: string;

  user?: {
    _id?: string;
    name?: string;
    email?: string;
    phone?: string;
  };

  orderStatus?: string;

  totalAmount?: number;

  paymentStatus?: string;
  paymentMethod?: string;

  trackingId?: string;
  courierName?: string;
  trackingUrl?: string;

  currentLocation?: string;
  locationUpdatedAt?: string;

  expectedDeliveryAt?: string;
  shippedAt?: string;
  outForDeliveryAt?: string;
  deliveredAt?: string;

  createdAt?: string;
  updatedAt?: string;

  orderStatusHistory?: Array<{
    status?: string;
    note?: string;
    updatedBy?: {
      _id?: string;
      name?: string;
      email?: string;
    };
    updatedAt?: string;
  }>;

  trackingHistory?: Array<{
    location?: string;
    note?: string;
    status?: string;
    updatedBy?: {
      _id?: string;
      name?: string;
      email?: string;
    };
    updatedAt?: string;
  }>;
}

// ==================================================
// PAGINATION
// ==================================================

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

// ==================================================
// RESPONSE UNWRAPPER
// ==================================================

const unwrap = <T>(response: {
  data: T;
}): T => {
  return response.data;
};

// ==================================================
// STAFF LOGIN
// ==================================================

export const staffLogin = async (data: {
  email: string;
  password: string;
}) => {
  const response = await staffApi.post<LoginResponse>(
    "/auth/admin-login",
    {
      email: data.email.trim().toLowerCase(),
      password: data.password,
    },
  );

  return unwrap(response);
};

// ==================================================
// STAFF LOGOUT
// ==================================================

export const staffLogout = async () => {
  const response = await staffApi.post(
    "/auth/logout",
  );

  return unwrap(response);
};

// ==================================================
// CURRENT STAFF
// ==================================================

export const getCurrentStaff = async () => {
  const response = await staffApi.get<{
    success: boolean;
    user: StaffUser;
  }>("/auth/staff/me");

  return unwrap(response);
};

// ==================================================
// STAFF ACCOUNT - UPDATE NAME / EMAIL
// ==================================================

export const updateStaffProfile = async (data: {
  name: string;
  email: string;
}) => {
  const response = await staffApi.put<{
    success: boolean;
    message: string;
    user: StaffUser;
  }>("/auth/staff/profile", {
    name: data.name.trim(),
    email: data.email.trim().toLowerCase(),
  });

  return unwrap(response);
};

// ==================================================
// STAFF ACCOUNT - CHANGE PASSWORD
// ==================================================

export const changeStaffPassword = async (data: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}) => {
  const response = await staffApi.put<{
    success: boolean;
    message: string;
  }>("/auth/staff/change-password", data);

  return unwrap(response);
};

// ==================================================
// ACCOUNTS - OVERVIEW
// ==================================================

export const getAccountsOverview = async () => {
  const response = await staffApi.get<{
    success: boolean;
    data?: AccountsOverview;
    overview?: AccountsOverview;
  }>("/accounts-dashboard/overview");

  const data = response.data;

  return (
    data.data ||
    data.overview ||
    ({} as AccountsOverview)
  );
};

// ==================================================
// ACCOUNTS - SALES
// ==================================================

export const getAccountsSales = async (
  from?: string,
  to?: string,
) => {
  const response = await staffApi.get<{
    success: boolean;
    data?: SalesData;

    summary?: SalesData["summary"];
    dailySales?: SalesData["dailySales"];
    paymentBreakdown?: SalesData["paymentBreakdown"];
    statusBreakdown?: SalesData["statusBreakdown"];
  }>("/accounts-dashboard/sales", {
    params: {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    },
  });

  const payload = response.data;

  // Supports both:
  // { success, data: { summary, ... } }
  // and:
  // { success, summary, dailySales, ... }
  if (payload.data) {
    return payload.data;
  }

  return {
    summary:
      payload.summary || {
        orders: 0,
        sales: 0,
        averageOrderValue: 0,
      },

    dailySales:
      payload.dailySales || [],

    paymentBreakdown:
      payload.paymentBreakdown || [],

    statusBreakdown:
      payload.statusBreakdown || [],
  };
};

// ==================================================
// ACCOUNTS - ORDERS
// ==================================================

export const getAccountsOrders = async (
  params: {
    page?: number;
    limit?: number;
    status?: string;
    paymentStatus?: string;
    search?: string;
  } = {},
) => {
  const response = await staffApi.get<{
    success: boolean;
    orders: AccountOrder[];
    pagination: Pagination;
  }>("/accounts-dashboard/orders", {
    params,
  });

  return response.data;
};

// ==================================================
// ACCOUNTS - ORDER DETAIL
// ==================================================

export const getAccountsOrderById = async (
  id: string,
) => {
  const response = await staffApi.get<{
    success: boolean;
    order: AccountOrder;
  }>(`/accounts-dashboard/orders/${id}`);

  return response.data;
};

// ==================================================
// ACCOUNTS - INVENTORY
// ==================================================

export const getAccountsInventory = async (
  params: {
    page?: number;
    limit?: number;
    search?: string;
    lowStock?: boolean;
  } = {},
) => {
  const response = await staffApi.get<{
    success: boolean;
    products?: InventoryProduct[];
    inventory?: InventoryProduct[];
    pagination: Pagination;
  }>("/accounts-dashboard/inventory", {
    params,
  });

  const payload = response.data;

  return {
    ...payload,

    // Backend compatibility:
    // some versions return "inventory",
    // frontend expects "products".
    products:
      payload.products ||
      payload.inventory ||
      [],
  };
};

// ==================================================
// ACCOUNTS - SALES REPORT DOWNLOAD
// ==================================================

const downloadReportFile = async (
  url: string,
  filename: string,
  params?: {
    from?: string;
    to?: string;
  },
) => {
  const response = await staffApi.get(url, {
    params,
    responseType: "blob",
  });

  const contentType =
    response.headers["content-type"] ||
    "application/octet-stream";

  const blob = new Blob(
    [response.data],
    {
      type: contentType,
    },
  );

  const objectUrl =
    window.URL.createObjectURL(blob);

  const anchor =
    document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = filename;

  document.body.appendChild(anchor);

  anchor.click();

  document.body.removeChild(anchor);

  window.URL.revokeObjectURL(objectUrl);
};

export const downloadAccountsSalesPdf = async (
  from?: string,
  to?: string,
) => {
  const date = new Date()
    .toISOString()
    .slice(0, 10);

  await downloadReportFile(
    "/accounts-dashboard/sales/export/pdf",
    `accounts-sales-report-${date}.pdf`,
    {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    },
  );
};

export const downloadAccountsSalesExcel = async (
  from?: string,
  to?: string,
) => {
  const date = new Date()
    .toISOString()
    .slice(0, 10);

  await downloadReportFile(
    "/accounts-dashboard/sales/export/excel",
    `accounts-sales-report-${date}.xlsx`,
    {
      ...(from ? { from } : {}),
      ...(to ? { to } : {}),
    },
  );
};

// ==================================================
// LOGISTICS - OVERVIEW
// ==================================================

// ==================================================

export const getLogisticsOverview = async () => {
  const response = await staffApi.get<{
    success: boolean;
    data?: LogisticsOverview;
    overview?: LogisticsOverview;
  }>("/logistics-dashboard/overview");

  const data = response.data;

  return (
    data.data ||
    data.overview ||
    ({} as LogisticsOverview)
  );
};

// ==================================================
// LOGISTICS - ORDERS
// ==================================================

export const getLogisticsOrders = async (
  params: {
    page?: number;
    limit?: number;
    status?: string;
    search?: string;
  } = {},
) => {
  const response = await staffApi.get<{
    success: boolean;
    orders: LogisticsOrder[];
    pagination: Pagination;
  }>("/logistics-dashboard/orders", {
    params,
  });

  return response.data;
};

// ==================================================
// LOGISTICS - ORDER DETAIL
// ==================================================

export const getLogisticsOrderById = async (
  id: string,
) => {
  const response = await staffApi.get<{
    success: boolean;
    order: LogisticsOrder;
  }>(
    `/logistics-dashboard/orders/${id}`,
  );

  return response.data;
};

// ==================================================
// LOGISTICS - SHIPMENTS
// ==================================================

export const getLogisticsShipments = async () => {
  const response = await staffApi.get<{
    success: boolean;
    orders: LogisticsOrder[];
  }>("/logistics-dashboard/shipments");

  return response.data;
};

// ==================================================
// LOGISTICS - DELIVERIES
// ==================================================

export const getExpectedDeliveries = async (
  days = 7,
) => {
  const response = await staffApi.get<{
    success: boolean;
    orders: LogisticsOrder[];
  }>("/logistics-dashboard/deliveries", {
    params: {
      days,
    },
  });

  return response.data;
};

// ==================================================
// LOGISTICS - UPDATE ORDER STATUS
// ==================================================

export const updateOrderStatus = async (
  orderId: string,
  data: {
    orderStatus: string;
    note?: string;
    cancellationReason?: string;
  },
) => {
  const response = await staffApi.put(
    `/admin/orders/${orderId}/status`,
    data,
  );

  return response.data;
};

// ==================================================
// LOGISTICS - CANCEL ORDER
// ==================================================

export const cancelOrder = async (
  orderId: string,
  cancellationReason: string,
) => {
  const response = await staffApi.put(
    `/admin/orders/${orderId}/cancel`,
    {
      cancellationReason,
    },
  );

  return response.data;
};

// ==================================================
// LOGISTICS - UPDATE TRACKING
// ==================================================

export const updateOrderTracking = async (
  orderId: string,
  data: {
    trackingId?: string;
    courierName?: string;
    trackingUrl?: string;
    expectedDeliveryAt?: string;
    location?: string;
    note?: string;
  },
) => {
  const response = await staffApi.put(
    `/admin/orders/${orderId}/tracking`,
    data,
  );

  return response.data;
};

// ==================================================
// EXPORT AXIOS INSTANCE
// ==================================================

export default staffApi;