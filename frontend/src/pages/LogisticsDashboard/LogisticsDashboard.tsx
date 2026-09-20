import {
  useCallback,
  useEffect,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";

import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LoaderCircle,
  LayoutDashboard,
  LockKeyhole,
  LogOut,
  MapPin,
  Package,
  PackageCheck,
  RefreshCw,
  Search,
  Truck,
  User,
  X,
} from "lucide-react";

import staffApi, {
  getExpectedDeliveries,
  getLogisticsOrderById,
  getLogisticsOrders,
  getLogisticsOverview,
  getLogisticsShipments,
  staffLogout,
  updateOrderStatus,
  updateOrderTracking,
  type LogisticsOrder,
  type LogisticsOverview,
} from "../../api/staffApi";

import styles from "./LogisticsDashboard.module.css";

interface LogisticsDashboardProps {
  onLogout: () => void;
}

interface LogisticsAccount {
  id: string;
  _id?: string;
  name?: string;
  email?: string;
  phone?: string;
  profileImage?: string;
  role?: string;
  isActive?: boolean;
  isBlocked?: boolean;
  isEmailVerified?: boolean;
  createdAt?: string;
  updatedAt?: string;
  lastLoginAt?: string;
}

interface AccountForm {
  name: string;
  email: string;
  phone: string;
}

interface PasswordForm {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const money = (value = 0) =>
  `₹${Number(value).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const formatDate = (value?: string | null) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const toDateTimeLocal = (value?: string | null) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const offset = date.getTimezoneOffset();
  const localDate = new Date(
    date.getTime() - offset * 60 * 1000,
  );

  return localDate.toISOString().slice(0, 16);
};

const getErrorMessage = (
  error: unknown,
  fallback: string,
) => {
  if (
    typeof error === "object" &&
    error !== null &&
    "response" in error
  ) {
    const response = (
      error as {
        response?: {
          data?: {
            message?: string;
          };
        };
      }
    ).response;

    if (response?.data?.message) {
      return response.data.message;
    }
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const LogisticsDashboard = ({
  onLogout,
}: LogisticsDashboardProps) => {
  const [activePage, setActivePage] =
    useState("overview");

  const [overview, setOverview] =
    useState<LogisticsOverview | null>(null);

  const [orders, setOrders] =
    useState<LogisticsOrder[]>([]);

  const [shipments, setShipments] =
    useState<LogisticsOrder[]>([]);

  const [deliveries, setDeliveries] =
    useState<LogisticsOrder[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [ordersLoading, setOrdersLoading] =
    useState(false);

  const [search, setSearch] =
    useState("");

  const [page, setPage] =
    useState(1);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 10,
      total: 0,
      totalPages: 1,
    });

  const [selectedOrder, setSelectedOrder] =
    useState<LogisticsOrder | null>(null);

  const [detailLoading, setDetailLoading] =
    useState(false);

  const [actionLoading, setActionLoading] =
    useState(false);

  const [deliveryDays, setDeliveryDays] =
    useState(30);

  const [shipmentStatus, setShipmentStatus] =
    useState("");

  const [account, setAccount] =
    useState<LogisticsAccount | null>(null);

  const [accountLoading, setAccountLoading] =
    useState(false);

  const [accountSaving, setAccountSaving] =
    useState(false);

  const [passwordSaving, setPasswordSaving] =
    useState(false);

  const [accountMessage, setAccountMessage] =
    useState("");

  const [accountError, setAccountError] =
    useState("");

  const [accountForm, setAccountForm] =
    useState<AccountForm>({
      name: "",
      email: "",
      phone: "",
    });

  const [passwordForm, setPasswordForm] =
    useState<PasswordForm>({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });

  const [logoutLoading, setLogoutLoading] =
    useState(false);

  /* ======================================================
     OVERVIEW
  ====================================================== */

  const loadOverview =
    useCallback(async () => {
      try {
        setLoading(true);

        const data =
          await getLogisticsOverview();

        setOverview(data);
      } catch (error) {
        console.error(
          "Logistics overview error:",
          error,
        );
      } finally {
        setLoading(false);
      }
    }, []);

  /* ======================================================
     ORDERS
  ====================================================== */

  const loadOrders =
    useCallback(async () => {
      try {
        setOrdersLoading(true);

        const response =
          await getLogisticsOrders({
            page,
            limit: 10,
            search: search.trim(),
          });

        setOrders(
          Array.isArray(response.orders)
            ? response.orders
            : [],
        );

        const backendPagination =
          response.pagination;

        setPagination({
          page:
            Number(
              backendPagination?.page,
            ) || page,
          limit:
            Number(
              backendPagination?.limit,
            ) || 10,
          total:
            Number(
              backendPagination?.total,
            ) || 0,
          totalPages:
            backendPagination?.total
              ? Math.ceil(
                  Number(
                    backendPagination.total,
                  ) /
                    Math.max(
                      1,
                      Number(
                        backendPagination.limit,
                      ) || 10,
                    ),
                )
              : 1,
        });
      } catch (error) {
        console.error(
          "Logistics orders error:",
          error,
        );
      } finally {
        setOrdersLoading(false);
      }
    }, [page, search]);

  /* ======================================================
     SHIPMENTS
  ====================================================== */

  const loadShipments =
    useCallback(async () => {
      try {
        setOrdersLoading(true);

        const response =
          await getLogisticsShipments();

        const backendShipments =
          (
            response as unknown as {
              shipments?: LogisticsOrder[];
            }
          ).shipments || [];

        setShipments(
          shipmentStatus
            ? backendShipments.filter(
                (order) =>
                  order.orderStatus ===
                  shipmentStatus,
              )
            : backendShipments,
        );
      } catch (error) {
        console.error(
          "Shipments error:",
          error,
        );
      } finally {
        setOrdersLoading(false);
      }
    }, [shipmentStatus]);

  /* ======================================================
     EXPECTED DELIVERIES
  ====================================================== */

  const loadDeliveries =
    useCallback(async () => {
      try {
        setOrdersLoading(true);

        const response =
          await getExpectedDeliveries(
            deliveryDays,
          );

        const backendDeliveries =
          (
            response as unknown as {
              deliveries?: LogisticsOrder[];
            }
          ).deliveries || [];

        setDeliveries(
          backendDeliveries,
        );
      } catch (error) {
        console.error(
          "Deliveries error:",
          error,
        );
      } finally {
        setOrdersLoading(false);
      }
    }, [deliveryDays]);

  /* ======================================================
     ACCOUNT
  ====================================================== */

  const loadAccount =
    useCallback(async () => {
      try {
        setAccountLoading(true);
        setAccountError("");

        const response =
          await staffApi.get<{
            success: boolean;
            user: LogisticsAccount;
          }>(
            "/logistics-dashboard/account",
          );

        const user =
          response.data?.user;

        if (!user) {
          throw new Error(
            "Unable to load account details.",
          );
        }

        setAccount(user);

        setAccountForm({
          name: user.name || "",
          email: user.email || "",
          phone: user.phone || "",
        });
      } catch (error) {
        console.error(
          "Logistics account error:",
          error,
        );

        setAccountError(
          getErrorMessage(
            error,
            "Unable to load account details.",
          ),
        );
      } finally {
        setAccountLoading(false);
      }
    }, []);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    if (activePage === "orders") {
      void loadOrders();
    }
  }, [
    activePage,
    loadOrders,
  ]);

  useEffect(() => {
    if (activePage === "shipments") {
      void loadShipments();
    }
  }, [
    activePage,
    loadShipments,
  ]);

  useEffect(() => {
    if (activePage === "deliveries") {
      void loadDeliveries();
    }
  }, [
    activePage,
    loadDeliveries,
  ]);

  useEffect(() => {
    if (activePage === "account") {
      void loadAccount();
    }
  }, [
    activePage,
    loadAccount,
  ]);

  /* ======================================================
     OPEN ORDER
  ====================================================== */

  const openOrder = async (
    orderId: string,
  ) => {
    try {
      setDetailLoading(true);

      const response =
        await getLogisticsOrderById(
          orderId,
        );

      setSelectedOrder(
        response.order,
      );
    } catch (error) {
      console.error(
        "Order detail error:",
        error,
      );

      alert(
        getErrorMessage(
          error,
          "Unable to load order details.",
        ),
      );
    } finally {
      setDetailLoading(false);
    }
  };

  /* ======================================================
     UPDATE STATUS
  ====================================================== */

  const handleStatusUpdate =
    async (
      status: string,
    ) => {
      if (!selectedOrder) {
        return;
      }

      try {
        setActionLoading(true);

        await updateOrderStatus(
          selectedOrder._id,
          {
            orderStatus: status,
          },
        );

        const response =
          await getLogisticsOrderById(
            selectedOrder._id,
          );

        setSelectedOrder(
          response.order,
        );

        await Promise.all([
          loadOverview(),
          loadOrders(),
          loadShipments(),
          loadDeliveries(),
        ]);
      } catch (error) {
        console.error(
          "Status update error:",
          error,
        );

        alert(
          getErrorMessage(
            error,
            "Unable to update order status.",
          ),
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* ======================================================
     CANCEL ORDER

     IMPORTANT:
     Backend order management uses:
     PUT /api/admin/orders/:id/status

     Therefore cancellation is sent through the
     status endpoint instead of a separate /cancel route.
  ====================================================== */

  const handleCancel =
    async () => {
      if (!selectedOrder) {
        return;
      }

      const reason =
        window.prompt(
          "Enter cancellation reason:",
        );

      if (!reason?.trim()) {
        return;
      }

      try {
        setActionLoading(true);

        await updateOrderStatus(
          selectedOrder._id,
          {
            orderStatus:
              "CANCELLED",
            cancellationReason:
              reason.trim(),
          },
        );

        const response =
          await getLogisticsOrderById(
            selectedOrder._id,
          );

        setSelectedOrder(
          response.order,
        );

        await Promise.all([
          loadOverview(),
          loadOrders(),
          loadShipments(),
          loadDeliveries(),
        ]);
      } catch (error) {
        console.error(
          "Cancel order error:",
          error,
        );

        alert(
          getErrorMessage(
            error,
            "Unable to cancel order.",
          ),
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* ======================================================
     UPDATE TRACKING
  ====================================================== */

  const handleTrackingUpdate =
    async (
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      if (!selectedOrder) {
        return;
      }

      const form =
        new FormData(
          event.currentTarget,
        );

      const expectedDeliveryAt =
        String(
          form.get(
            "expectedDeliveryAt",
          ) || "",
        );

      try {
        setActionLoading(true);

        await updateOrderTracking(
          selectedOrder._id,
          {
            trackingId:
              String(
                form.get(
                  "trackingId",
                ) || "",
              ).trim(),

            courierName:
              String(
                form.get(
                  "courierName",
                ) || "",
              ).trim(),

            trackingUrl:
              String(
                form.get(
                  "trackingUrl",
                ) || "",
              ).trim(),

            expectedDeliveryAt:
              expectedDeliveryAt
                ? new Date(
                    expectedDeliveryAt,
                  ).toISOString()
                : "",

            location:
              String(
                form.get(
                  "location",
                ) || "",
              ).trim(),

            note:
              String(
                form.get("note") ||
                  "",
              ).trim(),
          },
        );

        const response =
          await getLogisticsOrderById(
            selectedOrder._id,
          );

        setSelectedOrder(
          response.order,
        );

        await Promise.all([
          loadOverview(),
          loadOrders(),
          loadShipments(),
          loadDeliveries(),
        ]);
      } catch (error) {
        console.error(
          "Tracking update error:",
          error,
        );

        alert(
          getErrorMessage(
            error,
            "Unable to update tracking.",
          ),
        );
      } finally {
        setActionLoading(false);
      }
    };

  /* ======================================================
     UPDATE ACCOUNT
  ====================================================== */

  const handleAccountUpdate =
    async (
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      setAccountError("");
      setAccountMessage("");

      if (
        accountForm.name.trim().length <
        2
      ) {
        setAccountError(
          "Name must contain at least 2 characters.",
        );
        return;
      }

      if (!accountForm.email.trim()) {
        setAccountError(
          "Email address is required.",
        );
        return;
      }

      try {
        setAccountSaving(true);

        const response =
          await staffApi.put<{
            success: boolean;
            message?: string;
            user: LogisticsAccount;
          }>(
            "/logistics-dashboard/account/profile",
            {
              name:
                accountForm.name.trim(),
              email:
                accountForm.email
                  .trim()
                  .toLowerCase(),
              phone:
                accountForm.phone.trim(),
            },
          );

        const updatedUser =
          response.data?.user;

        if (updatedUser) {
          setAccount(
            updatedUser,
          );

          setAccountForm({
            name:
              updatedUser.name ||
              "",
            email:
              updatedUser.email ||
              "",
            phone:
              updatedUser.phone ||
              "",
          });

          const storedStaff =
            localStorage.getItem(
              "staffUser",
            );

          if (storedStaff) {
            try {
              const parsed =
                JSON.parse(
                  storedStaff,
                );

              localStorage.setItem(
                "staffUser",
                JSON.stringify({
                  ...parsed,
                  ...updatedUser,
                }),
              );
            } catch {
              // Ignore invalid old local storage data.
            }
          }
        }

        setAccountMessage(
          response.data?.message ||
            "Account updated successfully.",
        );
      } catch (error) {
        console.error(
          "Account update error:",
          error,
        );

        setAccountError(
          getErrorMessage(
            error,
            "Unable to update account.",
          ),
        );
      } finally {
        setAccountSaving(false);
      }
    };

  /* ======================================================
     CHANGE PASSWORD
  ====================================================== */

  const handlePasswordChange =
    async (
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      setAccountError("");
      setAccountMessage("");

      if (
        !passwordForm.currentPassword
      ) {
        setAccountError(
          "Current password is required.",
        );
        return;
      }

      if (
        passwordForm.newPassword.length <
        8
      ) {
        setAccountError(
          "New password must contain at least 8 characters.",
        );
        return;
      }

      if (
        passwordForm.newPassword !==
        passwordForm.confirmPassword
      ) {
        setAccountError(
          "New passwords do not match.",
        );
        return;
      }

      try {
        setPasswordSaving(true);

        const response =
          await staffApi.put<{
            success: boolean;
            message?: string;
          }>(
            "/logistics-dashboard/account/password",
            {
              currentPassword:
                passwordForm.currentPassword,
              newPassword:
                passwordForm.newPassword,
              confirmPassword:
                passwordForm.confirmPassword,
            },
          );

        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });

        setAccountMessage(
          response.data?.message ||
            "Password changed successfully.",
        );
      } catch (error) {
        console.error(
          "Password change error:",
          error,
        );

        setAccountError(
          getErrorMessage(
            error,
            "Unable to change password.",
          ),
        );
      } finally {
        setPasswordSaving(false);
      }
    };

  /* ======================================================
     LOGOUT

     Always clear local staff state even if the server
     logout request fails.
  ====================================================== */

  const handleLogout =
    async () => {
      if (logoutLoading) {
        return;
      }

      setLogoutLoading(true);

      try {
        await staffLogout();
      } catch (error) {
        // Even if the server logout request fails,
        // the local staff session must still be cleared.
        console.error(
          "Staff logout API error:",
          error,
        );
      } finally {
        localStorage.removeItem(
          "staffUser",
        );

        localStorage.removeItem(
          "staffToken",
        );

        localStorage.removeItem(
          "adminUser",
        );

        localStorage.removeItem(
          "adminToken",
        );

        // Always send the staff member to the login page.
        // replace() also prevents returning to the dashboard
        // with the browser Back button.
        window.location.replace(
          "/staff/login",
        );
      }
    };

  /* ======================================================
     OVERVIEW
  ====================================================== */

  const renderOverview =
    () => {
      if (loading) {
        return <LoadingState />;
      }

      return (
        <>
          <PageHeader
            title="Logistics Overview"
            description="Monitor shipments, deliveries and order movement"
            onRefresh={
              loadOverview
            }
            onAccount={() =>
              setActivePage(
                "account",
              )
            }
          />

          <div
            className={
              styles.statsGrid
            }
          >
            <LogisticsStat
              icon={
                <ClipboardList
                  size={20}
                />
              }
              label="Total Orders"
              value={
                overview?.totalOrders ??
                0
              }
            />

            <LogisticsStat
              icon={
                <Package size={20} />
              }
              label="Pending"
              value={
                overview?.pendingOrders ??
                0
              }
            />

            <LogisticsStat
              icon={
                <PackageCheck
                  size={20}
                />
              }
              label="Processing"
              value={
                overview?.processingOrders ??
                0
              }
            />

            <LogisticsStat
              icon={
                <Truck size={20} />
              }
              label="Shipped"
              value={
                overview?.shippedOrders ??
                0
              }
            />

            <LogisticsStat
              icon={
                <MapPin size={20} />
              }
              label="Out for Delivery"
              value={
                overview?.outForDeliveryOrders ??
                0
              }
            />

            <LogisticsStat
              icon={
                <CheckCircle2
                  size={20}
                />
              }
              label="Delivered"
              value={
                overview?.deliveredOrders ??
                0
              }
            />

            <LogisticsStat
              icon={
                <X size={20} />
              }
              label="Cancelled"
              value={
                overview?.cancelledOrders ??
                0
              }
            />

            <LogisticsStat
              icon={
                <RefreshCw
                  size={20}
                />
              }
              label="Returns"
              value={
                overview?.returnOrders ??
                0
              }
            />
          </div>

          <div
            className={
              styles.panel
            }
          >
            <div
              className={
                styles.panelHeader
              }
            >
              <div>
                <h3>
                  Logistics Workflow
                </h3>

                <p>
                  Current order
                  distribution
                </p>
              </div>
            </div>

            <div
              className={
                styles.workflow
              }
            >
              <WorkflowItem
                label="Pending"
                value={
                  overview?.pendingOrders ??
                  0
                }
              />

              <WorkflowItem
                label="Processing"
                value={
                  overview?.processingOrders ??
                  0
                }
              />

              <WorkflowItem
                label="Shipped"
                value={
                  overview?.shippedOrders ??
                  0
                }
              />

              <WorkflowItem
                label="Out for Delivery"
                value={
                  overview?.outForDeliveryOrders ??
                  0
                }
              />

              <WorkflowItem
                label="Delivered"
                value={
                  overview?.deliveredOrders ??
                  0
                }
              />
            </div>
          </div>
        </>
      );
    };

  /* ======================================================
     ORDERS
  ====================================================== */

  const renderOrders =
    () => (
      <>
        <PageHeader
          title="Orders"
          description="Manage order logistics and delivery status"
          onRefresh={
            loadOrders
          }
          onAccount={() =>
            setActivePage(
              "account",
            )
          }
        />

        <div
          className={
            styles.panel
          }
        >
          <div
            className={
              styles.toolbar
            }
          >
            <div
              className={
                styles.search
              }
            >
              <Search size={17} />

              <input
                placeholder="Search order, customer, courier, tracking or location..."
                value={search}
                onChange={(
                  event,
                ) => {
                  setPage(1);
                  setSearch(
                    event.target
                      .value,
                  );
                }}
              />
            </div>
          </div>

          <div
            className={
              styles.tableWrapper
            }
          >
            {ordersLoading ? (
              <LoadingState />
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>
                      Order
                    </th>
                    <th>
                      Customer
                    </th>
                    <th>
                      Status
                    </th>
                    <th>
                      Courier
                    </th>
                    <th>
                      Location
                    </th>
                    <th>
                      Delivery
                    </th>
                    <th />
                  </tr>
                </thead>

                <tbody>
                  {orders.length ? (
                    orders.map(
                      (
                        order,
                      ) => (
                        <tr
                          key={
                            order._id
                          }
                        >
                          <td>
                            <strong>
                              #
                              {order.orderNumber ||
                                order._id.slice(
                                  -6,
                                )}
                            </strong>
                          </td>

                          <td>
                            <div
                              className={
                                styles.customer
                              }
                            >
                              <strong>
                                {
                                  order
                                    .user
                                    ?.name
                                }
                              </strong>

                              <small>
                                {
                                  order
                                    .user
                                    ?.phone
                                }
                              </small>
                            </div>
                          </td>

                          <td>
                            <StatusBadge
                              value={
                                order.orderStatus
                              }
                            />
                          </td>

                          <td>
                            {
                              order.courierName ||
                              "—"
                            }
                          </td>

                          <td>
                            {
                              order.currentLocation ||
                              "—"
                            }
                          </td>

                          <td>
                            {formatDate(
                              order.expectedDeliveryAt,
                            )}
                          </td>

                          <td>
                            <button
                              type="button"
                              className={
                                styles.viewButton
                              }
                              onClick={() =>
                                void openOrder(
                                  order._id,
                                )
                              }
                            >
                              Manage
                            </button>
                          </td>
                        </tr>
                      ),
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan={7}
                        className={
                          styles.emptyCell
                        }
                      >
                        No orders found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

          <Pagination
            page={
              pagination.page
            }
            pages={
              pagination.totalPages
            }
            onPrevious={() =>
              setPage(
                (value) =>
                  Math.max(
                    1,
                    value - 1,
                  ),
              )
            }
            onNext={() =>
              setPage(
                (value) =>
                  Math.min(
                    pagination.totalPages,
                    value + 1,
                  ),
              )
            }
          />
        </div>
      </>
    );

  /* ======================================================
     SHIPMENTS
  ====================================================== */

  const renderShipments =
    () => (
      <>
        <PageHeader
          title="Shipments"
          description="Orders currently moving through delivery"
          onRefresh={
            loadShipments
          }
          onAccount={() =>
            setActivePage(
              "account",
            )
          }
        />

        <div
          className={
            styles.panel
          }
        >
          <div
            className={
              styles.toolbar
            }
          >
            <select
              value={
                shipmentStatus
              }
              onChange={(
                event,
              ) =>
                setShipmentStatus(
                  event.target
                    .value,
                )
              }
              aria-label="Shipment status"
            >
              <option value="">
                Active Shipments
              </option>
              <option value="SHIPPED">
                Shipped
              </option>
              <option value="OUT_FOR_DELIVERY">
                Out for Delivery
              </option>
            </select>
          </div>

          <ShipmentTable
            orders={
              shipments
            }
            loading={
              ordersLoading
            }
            onManage={
              openOrder
            }
          />
        </div>
      </>
    );

  /* ======================================================
     EXPECTED DELIVERIES
  ====================================================== */

  const renderDeliveries =
    () => (
      <>
        <PageHeader
          title="Expected Deliveries"
          description={`Expected deliveries for the next ${deliveryDays} days`}
          onRefresh={
            loadDeliveries
          }
          onAccount={() =>
            setActivePage(
              "account",
            )
          }
        />

        <div
          className={
            styles.panel
          }
        >
          <div
            className={
              styles.toolbar
            }
          >
            <select
              value={
                deliveryDays
              }
              onChange={(
                event,
              ) =>
                setDeliveryDays(
                  Number(
                    event.target
                      .value,
                  ),
                )
              }
              aria-label="Delivery range"
            >
              <option value={7}>
                Next 7 days
              </option>

              <option value={15}>
                Next 15 days
              </option>

              <option value={30}>
                Next 30 days
              </option>
            </select>
          </div>
        </div>

        <div
          className={
            styles.deliveryGrid
          }
        >
          {ordersLoading ? (
            <div
              className={
                styles.panel
              }
            >
              <LoadingState />
            </div>
          ) : deliveries.length ? (
            deliveries.map(
              (order) => (
                <div
                  className={
                    styles.deliveryCard
                  }
                  key={
                    order._id
                  }
                >
                  <div
                    className={
                      styles.deliveryTop
                    }
                  >
                    <span>
                      #
                      {order.orderNumber ||
                        order._id.slice(
                          -6,
                        )}
                    </span>

                    <StatusBadge
                      value={
                        order.orderStatus
                      }
                    />
                  </div>

                  <h3>
                    {
                      order.user
                        ?.name
                    }
                  </h3>

                  <p>
                    {
                      order.currentLocation ||
                      "Location not updated"
                    }
                  </p>

                  <div
                    className={
                      styles.deliveryDate
                    }
                  >
                    <CalendarDays
                      size={16}
                    />

                    <strong>
                      {
                        formatDate(
                          order.expectedDeliveryAt,
                        )
                      }
                    </strong>
                  </div>

                  <button
                    type="button"
                    className={
                      styles.viewButton
                    }
                    onClick={() =>
                      void openOrder(
                        order._id,
                      )
                    }
                  >
                    Manage Order
                  </button>
                </div>
              ),
            )
          ) : (
            <div
              className={
                styles.empty
              }
            >
              No expected deliveries
              found for this period.
            </div>
          )}
        </div>
      </>
    );

  /* ======================================================
     ACCOUNT
  ====================================================== */

  const renderAccount =
    () => (
      <>
        <PageHeader
          title="Account Settings"
          description="Manage your logistics account information and password"
          onRefresh={
            loadAccount
          }
          onAccount={() =>
            setActivePage(
              "account",
            )
          }
        />

        {accountLoading ? (
          <div
            className={
              styles.panel
            }
          >
            <LoadingState />
          </div>
        ) : (
          <>
            {accountError && (
              <div
                className={
                  styles.errorMessage
                }
              >
                {accountError}
              </div>
            )}

            {accountMessage && (
              <div
                className={
                  styles.successMessage
                }
              >
                {accountMessage}
              </div>
            )}

            <div
              className={
                styles.panel
              }
            >
              <div
                className={
                  styles.panelHeader
                }
              >
                <div>
                  <span
                    className={
                      styles.eyebrow
                    }
                  >
                    PROFILE
                  </span>

                  <h3>
                    Personal Information
                  </h3>

                  <p>
                    Update the details
                    associated with your
                    logistics account.
                  </p>
                </div>
              </div>

              <form
                onSubmit={
                  handleAccountUpdate
                }
              >
                <div
                  className={
                    styles.formGrid
                  }
                >
                  <label>
                    Full Name
                    <input
                      value={
                        accountForm.name
                      }
                      onChange={(
                        event,
                      ) =>
                        setAccountForm(
                          (
                            previous,
                          ) => ({
                            ...previous,
                            name:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      autoComplete="name"
                      required
                    />
                  </label>

                  <label>
                    Email Address
                    <input
                      type="email"
                      value={
                        accountForm.email
                      }
                      onChange={(
                        event,
                      ) =>
                        setAccountForm(
                          (
                            previous,
                          ) => ({
                            ...previous,
                            email:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      autoComplete="email"
                      required
                    />
                  </label>

                  <label>
                    Phone Number
                    <input
                      type="tel"
                      value={
                        accountForm.phone
                      }
                      onChange={(
                        event,
                      ) =>
                        setAccountForm(
                          (
                            previous,
                          ) => ({
                            ...previous,
                            phone:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      inputMode="numeric"
                      maxLength={10}
                      autoComplete="tel"
                    />
                  </label>

                  <Info
                    label="Role"
                    value={
                      account?.role
                        ?.toUpperCase()
                    }
                  />
                </div>

                <div
                  className={
                    styles.accountMeta
                  }
                >
                  <Info
                    label="Account Created"
                    value={formatDate(
                      account?.createdAt,
                    )}
                  />

                  <Info
                    label="Last Login"
                    value={formatDateTime(
                      account?.lastLoginAt,
                    )}
                  />

                  <Info
                    label="Account Status"
                    value={
                      account?.isActive ===
                      false
                        ? "Inactive"
                        : account?.isBlocked
                          ? "Blocked"
                          : "Active"
                    }
                  />
                </div>

                <button
                  type="submit"
                  className={
                    styles.saveButton
                  }
                  disabled={
                    accountSaving
                  }
                >
                  {accountSaving ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className={
                          styles.spinner
                        }
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <User
                        size={16}
                      />
                      Save Account
                    </>
                  )}
                </button>
              </form>
            </div>

            <div
              className={
                styles.panel
              }
            >
              <div
                className={
                  styles.panelHeader
                }
              >
                <div>
                  <span
                    className={
                      styles.eyebrow
                    }
                  >
                    SECURITY
                  </span>

                  <h3>
                    Change Password
                  </h3>

                  <p>
                    Use your current
                    password to create a
                    new password.
                  </p>
                </div>
              </div>

              <form
                onSubmit={
                  handlePasswordChange
                }
              >
                <div
                  className={
                    styles.formGrid
                  }
                >
                  <label>
                    Current Password
                    <input
                      type="password"
                      value={
                        passwordForm.currentPassword
                      }
                      onChange={(
                        event,
                      ) =>
                        setPasswordForm(
                          (
                            previous,
                          ) => ({
                            ...previous,
                            currentPassword:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      autoComplete="current-password"
                      required
                    />
                  </label>

                  <label>
                    New Password
                    <input
                      type="password"
                      value={
                        passwordForm.newPassword
                      }
                      onChange={(
                        event,
                      ) =>
                        setPasswordForm(
                          (
                            previous,
                          ) => ({
                            ...previous,
                            newPassword:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </label>

                  <label>
                    Confirm New Password
                    <input
                      type="password"
                      value={
                        passwordForm.confirmPassword
                      }
                      onChange={(
                        event,
                      ) =>
                        setPasswordForm(
                          (
                            previous,
                          ) => ({
                            ...previous,
                            confirmPassword:
                              event
                                .target
                                .value,
                          }),
                        )
                      }
                      autoComplete="new-password"
                      minLength={8}
                      required
                    />
                  </label>
                </div>

                <button
                  type="submit"
                  className={
                    styles.saveButton
                  }
                  disabled={
                    passwordSaving
                  }
                >
                  {passwordSaving ? (
                    <>
                      <LoaderCircle
                        size={16}
                        className={
                          styles.spinner
                        }
                      />
                      Updating...
                    </>
                  ) : (
                    <>
                      <LockKeyhole
                        size={16}
                      />
                      Change Password
                    </>
                  )}
                </button>
              </form>
            </div>

            <div
              className={
                styles.panel
              }
            >
              <div
                className={
                  styles.panelHeader
                }
              >
                <div>
                  <span
                    className={
                      styles.eyebrow
                    }
                  >
                    ACCOUNT
                  </span>

                  <h3>
                    Contact Information
                  </h3>

                  <p>
                    Your current
                    logistics account
                    contact details.
                  </p>
                </div>
              </div>

              <div
                className={
                  styles.orderInfoGrid
                }
              >
                <Info
                  label="Name"
                  value={
                    account?.name
                  }
                />

                <Info
                  label="Email"
                  value={
                    account?.email
                  }
                />

                <Info
                  label="Phone"
                  value={
                    account?.phone
                  }
                />

                <Info
                  label="Email Verification"
                  value={
                    account?.isEmailVerified
                      ? "Verified"
                      : "Not Verified"
                  }
                />
              </div>
            </div>
          </>
        )}
      </>
    );

  /* ======================================================
     MAIN
  ====================================================== */

  return (
    <div
      className={
        styles.dashboard
      }
    >
      <LogisticsSidebar
        active={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
        logoutLoading={logoutLoading}
      />

      <main
        className={
          styles.main
        }
      >
        {activePage ===
          "overview" &&
          renderOverview()}

        {activePage ===
          "orders" &&
          renderOrders()}

        {activePage ===
          "shipments" &&
          renderShipments()}

        {activePage ===
          "deliveries" &&
          renderDeliveries()}

        {activePage ===
          "account" &&
          renderAccount()}
      </main>

      {selectedOrder && (
        <OrderModal
          order={
            selectedOrder
          }
          loading={
            detailLoading ||
            actionLoading
          }
          onClose={() =>
            setSelectedOrder(
              null,
            )
          }
          onStatusUpdate={
            handleStatusUpdate
          }
          onCancel={
            handleCancel
          }
          onTrackingUpdate={
            handleTrackingUpdate
          }
        />
      )}
    </div>
  );
};

/* =========================================================
   INLINE LOGISTICS SIDEBAR
   Kept inside this file so no separate StaffSidebar file is needed.
========================================================= */

const LogisticsSidebar = ({
  active,
  onNavigate,
  onLogout,
  logoutLoading,
}: {
  active: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  logoutLoading: boolean;
}) => {
  const menu = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "orders",
      label: "Orders",
      icon: ClipboardList,
    },
    {
      id: "shipments",
      label: "Shipments",
      icon: Truck,
    },
    {
      id: "deliveries",
      label: "Expected Deliveries",
      icon: PackageCheck,
    },
  ];

  return (
    <aside className="logisticsInlineSidebar">
      <style>{`
        .logisticsInlineSidebar {
          position: fixed;
          top: 0;
          left: 0;
          bottom: 0;
          z-index: 100;
          width: 280px;
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          padding: 24px 16px;
          background: #ffffff;
          border-right: 1px solid #e8ebf1;
          box-shadow: 4px 0 20px rgba(15, 23, 42, 0.025);
          overflow-y: auto;
          overflow-x: hidden;
        }

        .logisticsInlineBrand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 54px;
          padding: 0 10px;
          margin-bottom: 26px;
        }

        .logisticsInlineBrandMark {
          width: 46px;
          height: 46px;
          flex: 0 0 46px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 13px;
          background: #111827;
          color: #ffffff;
          font-size: 20px;
          font-weight: 800;
          letter-spacing: -0.03em;
          overflow: hidden;
        }

        .logisticsInlineBrandMark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .logisticsInlineBrandText {
          min-width: 0;
        }

        .logisticsInlineBrandText strong {
          display: block;
          margin: 0;
          color: #111827;
          font-size: 18px;
          line-height: 1.1;
          font-weight: 800;
        }

        .logisticsInlineBrandText span {
          display: block;
          margin-top: 4px;
          color: #7b8494;
          font-size: 12px;
          line-height: 1.2;
          font-weight: 500;
        }

        .logisticsInlineRole {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          min-height: 68px;
          padding: 12px;
          margin-bottom: 28px;
          border: 1px solid #e9ebf1;
          border-radius: 16px;
          background: linear-gradient(180deg, #fafaff 0%, #f7f7fb 100%);
        }

        .logisticsInlineRoleIcon {
          width: 40px;
          height: 40px;
          flex: 0 0 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 11px;
          background: #ffffff;
          color: #4f46e5;
          box-shadow: 0 2px 8px rgba(79, 70, 229, 0.08);
        }

        .logisticsInlineRoleText {
          min-width: 0;
        }

        .logisticsInlineRoleText small {
          display: block;
          margin-bottom: 4px;
          color: #8a93a3;
          font-size: 11px;
          line-height: 1.2;
        }

        .logisticsInlineRoleText strong {
          display: block;
          color: #172033;
          font-size: 13px;
          line-height: 1.2;
          font-weight: 800;
        }

        .logisticsInlineSectionTitle {
          padding: 0 13px;
          margin: 0 0 9px;
          color: #8992a3;
          font-size: 10px;
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .logisticsInlineNavigation {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .logisticsInlineNavItem {
          position: relative;
          display: flex;
          align-items: center;
          gap: 13px;
          width: 100%;
          min-height: 47px;
          padding: 0 13px;
          border: 0;
          border-radius: 12px;
          background: transparent;
          color: #5e6879;
          font-size: 13px;
          font-weight: 600;
          text-align: left;
          transition: background 0.18s ease, color 0.18s ease, transform 0.18s ease;
        }

        .logisticsInlineNavItem:hover {
          background: #f5f6fa;
          color: #252e3d;
        }

        .logisticsInlineNavItem:active {
          transform: translateY(1px);
        }

        .logisticsInlineNavItem.isActive {
          background: #111827;
          color: #ffffff;
          box-shadow: 0 8px 18px rgba(17, 24, 39, 0.12);
        }

        .logisticsInlineNavIcon {
          width: 20px;
          height: 20px;
          flex: 0 0 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .logisticsInlineNavLabel {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .logisticsInlineActiveDot {
          width: 5px;
          height: 5px;
          margin-left: auto;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(255,255,255,0.08);
        }

        .logisticsInlineBottom {
          margin-top: auto;
          padding-top: 18px;
          border-top: 1px solid #edf0f4;
        }

        .logisticsInlineLogout {
          display: flex;
          align-items: center;
          gap: 13px;
          width: 100%;
          min-height: 46px;
          padding: 0 13px;
          border: 0;
          border-radius: 11px;
          background: transparent;
          color: #667085;
          font-size: 13px;
          font-weight: 600;
          text-align: left;
          transition: background 0.18s ease, color 0.18s ease;
        }

        .logisticsInlineLogout:hover:not(:disabled) {
          background: #fff5f5;
          color: #dc2626;
        }

        .logisticsInlineLogout:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .logisticsInlineLogoutLabel {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 900px) {
          .logisticsInlineSidebar {
            width: 80px;
            padding: 20px 10px;
          }

          .logisticsInlineBrand {
            justify-content: center;
            padding: 0;
            margin-bottom: 22px;
          }

          .logisticsInlineBrandMark {
            width: 46px;
            height: 46px;
          }

          .logisticsInlineBrandText,
          .logisticsInlineRoleText,
          .logisticsInlineSectionTitle,
          .logisticsInlineNavLabel,
          .logisticsInlineActiveDot,
          .logisticsInlineLogoutLabel {
            display: none;
          }

          .logisticsInlineRole {
            justify-content: center;
            padding: 8px;
            margin-bottom: 20px;
          }

          .logisticsInlineRoleIcon {
            width: 40px;
            height: 40px;
          }

          .logisticsInlineNavItem {
            justify-content: center;
            padding: 0;
          }

          .logisticsInlineLogout {
            justify-content: center;
            padding: 0;
          }
        }
      `}</style>

      <div className="logisticsInlineBrand">
        <div className="logisticsInlineBrandMark">
          <img
            src="/jihaan-logo.png"
            alt="Jihaan Beauty"
            onError={(event) => {
              event.currentTarget.style.display = "none";
              const parent = event.currentTarget.parentElement;
              if (parent) {
                parent.textContent = "J";
              }
            }}
          />
        </div>

        <div className="logisticsInlineBrandText">
          <strong>Jihaan</strong>
          <span>Beauty</span>
        </div>
      </div>

      <div className="logisticsInlineRole">
        <div className="logisticsInlineRoleIcon">
          <Truck size={19} />
        </div>
        <div className="logisticsInlineRoleText">
          <small>Logged in as</small>
          <strong>Logistics</strong>
        </div>
      </div>

      <div className="logisticsInlineSectionTitle">
        Dashboard
      </div>

      <nav className="logisticsInlineNavigation">
        {menu.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={`logisticsInlineNavItem${
                isActive ? " isActive" : ""
              }`}
              onClick={() => onNavigate(item.id)}
            >
              <span className="logisticsInlineNavIcon">
                <Icon size={19} />
              </span>
              <span className="logisticsInlineNavLabel">
                {item.label}
              </span>
              {isActive && (
                <span className="logisticsInlineActiveDot" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="logisticsInlineBottom">
        <button
          type="button"
          className="logisticsInlineLogout"
          onClick={onLogout}
          disabled={logoutLoading}
          title="Logout"
        >
          <LogOut size={19} />
          <span className="logisticsInlineLogoutLabel">
            {logoutLoading ? "Logging out..." : "Logout"}
          </span>
        </button>
      </div>
    </aside>
  );
};

/* =========================================================
   PAGE HEADER
========================================================= */

const PageHeader = ({
  title,
  description,
  onRefresh,
  onAccount,
}: {
  title: string;
  description: string;
  onRefresh: () => void;
  onAccount: () => void;
}) => (
  <header
    className={
      styles.pageHeader
    }
  >
    <div>
      <span
        className={
          styles.eyebrow
        }
      >
        LOGISTICS
      </span>

      <h1>{title}</h1>

      <p>{description}</p>
    </div>

    <div
      className={
        styles.headerActions
      }
    >
      <button
        type="button"
        className={
          styles.refreshButton
        }
        onClick={onAccount}
      >
        <User size={16} />
        Account
      </button>

      <button
        type="button"
        className={
          styles.refreshButton
        }
        onClick={onRefresh}
      >
        <RefreshCw size={16} />
        Refresh
      </button>
    </div>
  </header>
);

/* =========================================================
   STAT
========================================================= */

const LogisticsStat = ({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: number;
}) => (
  <div
    className={
      styles.statCard
    }
  >
    <div
      className={
        styles.statIcon
      }
    >
      {icon}
    </div>

    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  </div>
);

/* =========================================================
   WORKFLOW
========================================================= */

const WorkflowItem = ({
  label,
  value,
}: {
  label: string;
  value: number;
}) => (
  <div
    className={
      styles.workflowItem
    }
  >
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

/* =========================================================
   STATUS BADGE
========================================================= */

const StatusBadge = ({
  value,
}: {
  value?: string;
}) => {
  const normalized =
    String(value || "UNKNOWN")
      .toLowerCase()
      .replace(/_/g, "-")
      .replace(/\s+/g, "-");

  const label =
    value
      ? String(value).replace(
          /_/g,
          " ",
        )
      : "—";

  return (
    <span
      className={`${styles.status} ${
        styles[normalized] || ""
      }`}
    >
      {label}
    </span>
  );
};

/* =========================================================
   SHIPMENT TABLE
========================================================= */

const ShipmentTable = ({
  orders,
  loading,
  onManage,
}: {
  orders: LogisticsOrder[];
  loading: boolean;
  onManage: (
    id: string,
  ) => void;
}) => {
  if (loading) {
    return <LoadingState />;
  }

  return (
    <div
      className={
        styles.tableWrapper
      }
    >
      <table>
        <thead>
          <tr>
            <th>
              Order
            </th>
            <th>
              Customer
            </th>
            <th>
              Status
            </th>
            <th>
              Courier
            </th>
            <th>
              Tracking
            </th>
            <th>
              Location
            </th>
            <th>
              Expected
            </th>
            <th />
          </tr>
        </thead>

        <tbody>
          {orders.length ? (
            orders.map(
              (order) => (
                <tr
                  key={
                    order._id
                  }
                >
                  <td>
                    <strong>
                      #
                      {order.orderNumber ||
                        order._id.slice(
                          -6,
                        )}
                    </strong>
                  </td>

                  <td>
                    {
                      order.user
                        ?.name
                    }
                  </td>

                  <td>
                    <StatusBadge
                      value={
                        order.orderStatus
                      }
                    />
                  </td>

                  <td>
                    {
                      order.courierName ||
                      "—"
                    }
                  </td>

                  <td>
                    {
                      order.trackingId ||
                      "—"
                    }
                  </td>

                  <td>
                    {
                      order.currentLocation ||
                      "—"
                    }
                  </td>

                  <td>
                    {formatDate(
                      order.expectedDeliveryAt,
                    )}
                  </td>

                  <td>
                    <button
                      type="button"
                      className={
                        styles.viewButton
                      }
                      onClick={() =>
                        void onManage(
                          order._id,
                        )
                      }
                    >
                      Manage
                    </button>
                  </td>
                </tr>
              ),
            )
          ) : (
            <tr>
              <td
                colSpan={8}
                className={
                  styles.emptyCell
                }
              >
                No shipments found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

/* =========================================================
   ORDER MODAL
========================================================= */

const OrderModal = ({
  order,
  loading,
  onClose,
  onStatusUpdate,
  onCancel,
  onTrackingUpdate,
}: {
  order: LogisticsOrder;
  loading: boolean;
  onClose: () => void;
  onStatusUpdate: (
    status: string,
  ) => void;
  onCancel: () => void;
  onTrackingUpdate: (
    event: FormEvent<HTMLFormElement>,
  ) => void;
}) => {
  const [status, setStatus] =
    useState(
      order.orderStatus ||
        "PROCESSING",
    );

  useEffect(() => {
    setStatus(
      order.orderStatus ||
        "PROCESSING",
    );
  }, [
    order._id,
    order.orderStatus,
  ]);

  return (
    <div
      className={
        styles.modalOverlay
      }
      onMouseDown={(
        event,
      ) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <div
        className={
          styles.modal
        }
      >
        <div
          className={
            styles.modalHeader
          }
        >
          <div>
            <span>
              ORDER
            </span>

            <h2>
              #
              {order.orderNumber ||
                order._id.slice(
                  -8,
                )}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className={
              styles.closeButton
            }
          >
            <X size={19} />
          </button>
        </div>

        <div
          className={
            styles.modalBody
          }
        >
          <div
            className={
              styles.orderInfoGrid
            }
          >
            <Info
              label="Customer"
              value={
                order.user?.name
              }
            />

            <Info
              label="Phone"
              value={
                order.user?.phone
              }
            />

            <Info
              label="Amount"
              value={money(
                order.totalAmount,
              )}
            />

            <Info
              label="Payment"
              value={
                order.paymentStatus
              }
            />

            <Info
              label="Courier"
              value={
                order.courierName
              }
            />

            <Info
              label="Tracking ID"
              value={
                order.trackingId
              }
            />

            <Info
              label="Current Location"
              value={
                order.currentLocation
              }
            />

            <Info
              label="Expected Delivery"
              value={formatDateTime(
                order.expectedDeliveryAt,
              )}
            />
          </div>

          {order.trackingUrl && (
            <div
              className={
                styles.trackingLink
              }
            >
              <a
                href={
                  order.trackingUrl
                }
                target="_blank"
                rel="noreferrer"
              >
                Open Courier Tracking
              </a>
            </div>
          )}

          <div
            className={
              styles.section
            }
          >
            <h3>
              Update Order Status
            </h3>

            <div
              className={
                styles.statusActions
              }
            >
              {[
                "CONFIRMED",
                "PROCESSING",
                "SHIPPED",
                "OUT_FOR_DELIVERY",
                "DELIVERED",
              ].map(
                (item) => (
                  <button
                    type="button"
                    key={item}
                    className={
                      status ===
                      item
                        ? styles.selectedStatus
                        : styles.statusButton
                    }
                    disabled={
                      loading
                    }
                    onClick={() => {
                      setStatus(
                        item,
                      );

                      void onStatusUpdate(
                        item,
                      );
                    }}
                  >
                    {item.replace(
                      /_/g,
                      " ",
                    )}
                  </button>
                ),
              )}
            </div>

            <button
              type="button"
              className={
                styles.cancelButton
              }
              disabled={
                loading ||
                order.orderStatus ===
                  "CANCELLED"
              }
              onClick={
                onCancel
              }
            >
              Cancel Order
            </button>
          </div>

          <div
            className={
              styles.section
            }
          >
            <h3>
              Tracking Details
            </h3>

            <form
              onSubmit={
                onTrackingUpdate
              }
              className={
                styles.trackingForm
              }
            >
              <div
                className={
                  styles.formGrid
                }
              >
                <label>
                  Tracking ID
                  <input
                    name="trackingId"
                    defaultValue={
                      order.trackingId ||
                      ""
                    }
                  />
                </label>

                <label>
                  Courier Partner
                  <input
                    name="courierName"
                    defaultValue={
                      order.courierName ||
                      ""
                    }
                  />
                </label>

                <label>
                  Tracking URL
                  <input
                    type="url"
                    name="trackingUrl"
                    defaultValue={
                      order.trackingUrl ||
                      ""
                    }
                    placeholder="https://..."
                  />
                </label>

                <label>
                  Expected Delivery
                  <input
                    type="datetime-local"
                    name="expectedDeliveryAt"
                    defaultValue={toDateTimeLocal(
                      order.expectedDeliveryAt,
                    )}
                  />
                </label>

                <label>
                  Current Location
                  <input
                    name="location"
                    defaultValue={
                      order.currentLocation ||
                      ""
                    }
                  />
                </label>

                <label>
                  Note
                  <input
                    name="note"
                    placeholder="Tracking update note"
                  />
                </label>
              </div>

              <button
                type="submit"
                className={
                  styles.saveButton
                }
                disabled={
                  loading
                }
              >
                {loading ? (
                  <>
                    <LoaderCircle
                      size={16}
                      className={
                        styles.spinner
                      }
                    />
                    Updating...
                  </>
                ) : (
                  "Update Tracking"
                )}
              </button>
            </form>
          </div>

          <div
            className={
              styles.section
            }
          >
            <h3>
              Order Status History
            </h3>

            {order.orderStatusHistory
              ?.length ? (
              <div
                className={
                  styles.history
                }
              >
                {[
                  ...order.orderStatusHistory,
                ]
                  .reverse()
                  .map(
                    (
                      item,
                      index,
                    ) => (
                      <div
                        className={
                          styles.historyItem
                        }
                        key={`${item.updatedAt}-${index}`}
                      >
                        <div
                          className={
                            styles.historyDot
                          }
                        />

                        <div>
                          <strong>
                            {String(
                              item.status ||
                                "STATUS",
                            ).replace(
                              /_/g,
                              " ",
                            )}
                          </strong>

                          <p>
                            {item.note ||
                              "Order status updated"}
                          </p>

                          <small>
                            {formatDateTime(
                              item.updatedAt,
                            )}
                          </small>
                        </div>
                      </div>
                    ),
                  )}
              </div>
            ) : (
              <p
                className={
                  styles.muted
                }
              >
                No order status history
                available.
              </p>
            )}
          </div>

          <div
            className={
              styles.section
            }
          >
            <h3>
              Tracking History
            </h3>

            {order.trackingHistory
              ?.length ? (
              <div
                className={
                  styles.history
                }
              >
                {[
                  ...order.trackingHistory,
                ]
                  .reverse()
                  .map(
                    (
                      item,
                      index,
                    ) => (
                      <div
                        className={
                          styles.historyItem
                        }
                        key={`${item.updatedAt}-${index}`}
                      >
                        <div
                          className={
                            styles.historyDot
                          }
                        />

                        <div>
                          <strong>
                            {item.location ||
                              "Location updated"}
                          </strong>

                          <p>
                            {item.note ||
                              item.status?.replace(
                                /_/g,
                                " ",
                              ) ||
                              "Tracking updated"}
                          </p>

                          <small>
                            {formatDateTime(
                              item.updatedAt,
                            )}
                          </small>
                        </div>
                      </div>
                    ),
                  )}
              </div>
            ) : (
              <p
                className={
                  styles.muted
                }
              >
                No tracking history
                available.
              </p>
            )}
          </div>

          <div
            className={
              styles.section
            }
          >
            <h3>
              Shipment Milestones
            </h3>

            <div
              className={
                styles.orderInfoGrid
              }
            >
              <Info
                label="Shipped"
                value={formatDateTime(
                  order.shippedAt,
                )}
              />

              <Info
                label="Out for Delivery"
                value={formatDateTime(
                  order.outForDeliveryAt,
                )}
              />

              <Info
                label="Delivered"
                value={formatDateTime(
                  order.deliveredAt,
                )}
              />

              <Info
                label="Location Updated"
                value={formatDateTime(
                  order.locationUpdatedAt,
                )}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   INFO
========================================================= */

const Info = ({
  label,
  value,
}: {
  label: string;
  value?: string;
}) => (
  <div
    className={
      styles.info
    }
  >
    <span>{label}</span>

    <strong>
      {value || "—"}
    </strong>
  </div>
);

/* =========================================================
   PAGINATION
========================================================= */

const Pagination = ({
  page,
  pages,
  onPrevious,
  onNext,
}: {
  page: number;
  pages: number;
  onPrevious: () => void;
  onNext: () => void;
}) => (
  <div
    className={
      styles.pagination
    }
  >
    <span>
      Page {page} of{" "}
      {Math.max(1, pages)}
    </span>

    <div>
      <button
        type="button"
        disabled={
          page <= 1
        }
        onClick={
          onPrevious
        }
      >
        <ChevronLeft
          size={17}
        />
      </button>

      <button
        type="button"
        disabled={
          page >= pages
        }
        onClick={
          onNext
        }
      >
        <ChevronRight
          size={17}
        />
      </button>
    </div>
  </div>
);

/* =========================================================
   LOADING
========================================================= */

const LoadingState = () => (
  <div
    className={
      styles.loading
    }
  >
    <LoaderCircle
      size={28}
      className={
        styles.spinner
      }
    />

    Loading...
  </div>
);

export default LogisticsDashboard;
