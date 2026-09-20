import {
  useCallback,
  useEffect,
  useState,
} from "react";

import { useNavigate } from "react-router-dom";

import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Download,
  FileSpreadsheet,
  FileText,
  IndianRupee,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  RefreshCw,
  Save,
  Search,
  ShoppingBag,
  User,
  Users,
} from "lucide-react";

import staffApi, {
  getAccountsInventory,
  getAccountsOrders,
  getAccountsOverview,
  getAccountsSales,
  getCurrentStaff,
  staffLogout,
  type AccountOrder,
  type AccountsOverview,
  type InventoryProduct,
  type SalesData,
  type StaffUser,
} from "../../api/staffApi";

import styles from "./AccountsDashboard.module.css";

interface AccountsDashboardProps {
  onLogout: () => void;
}

const money = (value = 0) =>
  `₹${Number(value).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    },
  )}`;

const dateFormat = (
  value?: string,
) => {
  if (!value) return "—";

  return new Date(value).toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    },
  );
};

const errorMessage = (error: unknown) => {
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

  if (
    error instanceof Error &&
    error.message
  ) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
};

const AccountsDashboard = ({
  onLogout,
}: AccountsDashboardProps) => {
  const [activePage, setActivePage] =
    useState("overview");

  const [overview, setOverview] =
    useState<AccountsOverview | null>(
      null,
    );

  const [sales, setSales] =
    useState<SalesData | null>(null);

  const [orders, setOrders] =
    useState<AccountOrder[]>([]);

  const [inventory, setInventory] =
    useState<InventoryProduct[]>([]);

  const [orderSearch, setOrderSearch] =
    useState("");

  const [inventorySearch, setInventorySearch] =
    useState("");

  const [loading, setLoading] =
    useState(true);

  const [ordersLoading, setOrdersLoading] =
    useState(false);

  const [inventoryLoading, setInventoryLoading] =
    useState(false);

  const [page, setPage] =
    useState(1);

  const [inventoryPage, setInventoryPage] =
    useState(1);

  const [pagination, setPagination] =
    useState({
      page: 1,
      limit: 10,
      total: 0,
      pages: 1,
    });

  const [
    inventoryPagination,
    setInventoryPagination,
  ] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 1,
  });

  const [staffUser, setStaffUser] =
    useState<StaffUser | null>(null);

  const [accountName, setAccountName] =
    useState("");

  const [accountEmail, setAccountEmail] =
    useState("");

  const [currentPassword, setCurrentPassword] =
    useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [accountSaving, setAccountSaving] =
    useState(false);

  const [passwordSaving, setPasswordSaving] =
    useState(false);

  const [accountMessage, setAccountMessage] =
    useState("");

  const [accountError, setAccountError] =
    useState("");

  const [passwordMessage, setPasswordMessage] =
    useState("");

  const [passwordError, setPasswordError] =
    useState("");

  const [salesFrom, setSalesFrom] =
    useState("");

  const [salesTo, setSalesTo] =
    useState("");

  const [salesFilterLoading, setSalesFilterLoading] =
    useState(false);

  const [reportExporting, setReportExporting] =
    useState<"pdf" | "excel" | "">("");

  const [logoutLoading, setLogoutLoading] =
    useState(false);


  const navigate = useNavigate();

  // ==================================================
  // LOGOUT
  // ==================================================

  const handleLogout = useCallback(async () => {
    if (logoutLoading) return;

    try {
      setLogoutLoading(true);
      await staffLogout();
    } catch (error) {
      console.error("Accounts staff logout error:", error);
    } finally {
      // Clear every staff/admin fallback key used by the app.
      localStorage.removeItem("staffUser");
      localStorage.removeItem("staffToken");
      localStorage.removeItem("adminUser");
      localStorage.removeItem("adminToken");

      // Clear session-storage fallbacks too.
      sessionStorage.removeItem("staffUser");
      sessionStorage.removeItem("staffToken");
      sessionStorage.removeItem("adminUser");
      sessionStorage.removeItem("adminToken");

      // Keep the parent callback for any app-level state cleanup.
      try {
        onLogout();
      } catch (error) {
        console.error("Parent logout callback error:", error);
      }

      // Force a clean route/state after logout.
      navigate("/staff/login?role=accounts", { replace: true });
    }
  }, [logoutLoading, navigate, onLogout]);


  // ==================================================
  // LOAD OVERVIEW
  // ==================================================

  const loadOverview =
    useCallback(async () => {
      try {
        setLoading(true);

        const [
          overviewData,
          salesData,
        ] = await Promise.all([
          getAccountsOverview(),
          getAccountsSales(),
        ]);

        setOverview(
          overviewData,
        );

        setSales(salesData);
      } catch (error) {
        console.error(
          "Accounts overview error:",
          error,
        );
      } finally {
        setLoading(false);
      }
    }, []);

  // ==================================================
  // LOAD ORDERS
  // ==================================================

  const loadOrders =
    useCallback(async () => {
      try {
        setOrdersLoading(true);

        const response =
          await getAccountsOrders({
            page,
            limit: 10,
            search: orderSearch,
          });

        setOrders(
          response.orders || [],
        );

        setPagination(
          response.pagination || {
            page,
            limit: 10,
            total: 0,
            pages: 1,
          },
        );
      } catch (error) {
        console.error(
          "Accounts orders error:",
          error,
        );
      } finally {
        setOrdersLoading(false);
      }
    }, [page, orderSearch]);

  // ==================================================
  // LOAD INVENTORY
  // ==================================================

  const loadInventory =
    useCallback(async () => {
      try {
        setInventoryLoading(true);

        const response =
          await getAccountsInventory({
            page: inventoryPage,
            limit: 10,
            search: inventorySearch,
          });

        setInventory(
          response.products || [],
        );

        setInventoryPagination(
          response.pagination || {
            page: inventoryPage,
            limit: 10,
            total: 0,
            pages: 1,
          },
        );
      } catch (error) {
        console.error(
          "Accounts inventory error:",
          error,
        );
      } finally {
        setInventoryLoading(false);
      }
    }, [
      inventoryPage,
      inventorySearch,
    ]);

  useEffect(() => {
    void loadOverview();
  }, [loadOverview]);

  useEffect(() => {
    let mounted = true;

    const loadStaff = async () => {
      try {
        const response =
          await getCurrentStaff();

        if (!mounted) return;

        const user = response.user;

        if (user) {
          setStaffUser(user);
          setAccountName(user.name || "");
          setAccountEmail(user.email || "");
        }
      } catch (error) {
        console.error(
          "Current staff error:",
          error,
        );
      }
    };

    void loadStaff();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (activePage === "orders") {
      void loadOrders();
    }
  }, [
    activePage,
    loadOrders,
  ]);

  useEffect(() => {
    if (activePage === "inventory") {
      void loadInventory();
    }
  }, [
    activePage,
    loadInventory,
  ]);

  // ==================================================
  // SALES FILTER
  // ==================================================

  const applySalesFilter =
    useCallback(async () => {
      if (
        salesFrom &&
        salesTo &&
        salesFrom > salesTo
      ) {
        window.alert(
          "From date cannot be after To date.",
        );
        return;
      }

      try {
        setSalesFilterLoading(true);

        const data =
          await getAccountsSales(
            salesFrom || undefined,
            salesTo || undefined,
          );

        setSales(data);
      } catch (error) {
        console.error(
          "Accounts sales filter error:",
          error,
        );

        window.alert(
          errorMessage(error),
        );
      } finally {
        setSalesFilterLoading(false);
      }
    }, [salesFrom, salesTo]);

  const clearSalesFilter = useCallback(
    async () => {
      setSalesFrom("");
      setSalesTo("");

      try {
        setSalesFilterLoading(true);

        const data =
          await getAccountsSales();

        setSales(data);
      } catch (error) {
        console.error(
          "Clear sales filter error:",
          error,
        );

        window.alert(
          errorMessage(error),
        );
      } finally {
        setSalesFilterLoading(false);
      }
    },
    [],
  );

  // ==================================================
  // SALES REPORT DOWNLOAD
  // ==================================================

  const downloadSalesReport =
    useCallback(
      async (
        format: "pdf" | "excel",
      ) => {
        try {
          setReportExporting(format);

          const response =
            await staffApi.get(
              `/accounts-dashboard/sales/export/${format}`,
              {
                params: {
                  ...(salesFrom
                    ? { from: salesFrom }
                    : {}),
                  ...(salesTo
                    ? { to: salesTo }
                    : {}),
                },
                responseType: "blob",
              },
            );

          const blob = new Blob(
            [response.data],
            {
              type:
                format === "pdf"
                  ? "application/pdf"
                  : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            },
          );

          const url =
            window.URL.createObjectURL(blob);

          const link =
            document.createElement("a");

          link.href = url;

          link.download =
            format === "pdf"
              ? "accounts-sales-report.pdf"
              : "accounts-sales-report.xlsx";

          document.body.appendChild(link);
          link.click();
          link.remove();

          window.setTimeout(() => {
            window.URL.revokeObjectURL(url);
          }, 1000);
        } catch (error) {
          console.error(
            `Sales ${format} export error:`,
            error,
          );

          window.alert(
            errorMessage(error),
          );
        } finally {
          setReportExporting("");
        }
      },
      [salesFrom, salesTo],
    );

  // ==================================================
  // ACCOUNT PROFILE
  // ==================================================

  const handleAccountSave =
    async () => {
      try {
        setAccountSaving(true);
        setAccountMessage("");
        setAccountError("");

        const normalizedName =
          accountName.trim();

        const normalizedEmail =
          accountEmail.trim().toLowerCase();

        if (normalizedName.length < 2) {
          setAccountError(
            "Name must contain at least 2 characters.",
          );
          return;
        }

        if (normalizedName.length > 80) {
          setAccountError(
            "Name cannot exceed 80 characters.",
          );
          return;
        }

        if (!normalizedEmail) {
          setAccountError(
            "Email is required.",
          );
          return;
        }

        const response =
          await staffApi.put<{
            success: boolean;
            message?: string;
            user?: StaffUser;
          }>(
            "/auth/staff/profile",
            {
              name: normalizedName,
              email: normalizedEmail,
            },
          );

        const updatedUser =
          response.data.user;

        if (updatedUser) {
          setStaffUser(updatedUser);
          setAccountName(
            updatedUser.name || "",
          );
          setAccountEmail(
            updatedUser.email || "",
          );
        } else {
          setStaffUser((current) =>
            current
              ? {
                  ...current,
                  name: normalizedName,
                  email: normalizedEmail,
                }
              : current,
          );
        }

        setAccountMessage(
          response.data.message ||
            "Account details updated successfully.",
        );
      } catch (error) {
        console.error(
          "Account profile update error:",
          error,
        );

        setAccountError(
          errorMessage(error),
        );
      } finally {
        setAccountSaving(false);
      }
    };

  const handlePasswordSave =
    async () => {
      try {
        setPasswordSaving(true);
        setPasswordMessage("");
        setPasswordError("");

        if (!currentPassword) {
          setPasswordError(
            "Enter your current password.",
          );
          return;
        }

        if (newPassword.length < 6) {
          setPasswordError(
            "New password must contain at least 6 characters.",
          );
          return;
        }

        if (
          newPassword !==
          confirmPassword
        ) {
          setPasswordError(
            "New password and confirm password do not match.",
          );
          return;
        }

        if (
          newPassword ===
          currentPassword
        ) {
          setPasswordError(
            "New password must be different from the current password.",
          );
          return;
        }

        const response =
          await staffApi.put<{
            success: boolean;
            message?: string;
          }>(
            "/auth/staff/change-password",
            {
              currentPassword,
              newPassword,
            },
          );

        setPasswordMessage(
          response.data.message ||
            "Password changed successfully.",
        );

        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } catch (error) {
        console.error(
          "Staff password update error:",
          error,
        );

        setPasswordError(
          errorMessage(error),
        );
      } finally {
        setPasswordSaving(false);
      }
    };

  // ==================================================
  // OVERVIEW
  // ==================================================

  const renderOverview =
    () => {
      if (loading) {
        return (
          <LoadingState />
        );
      }

      return (
        <>
          <PageHeader
            title="Accounts Overview"
            description="Sales, orders, customers and inventory summary"
            onRefresh={
              loadOverview
            }
          />

          <div
            className={
              styles.statsGrid
            }
          >
            <StatCard
              icon={
                <IndianRupee
                  size={20}
                />
              }
              label="Total Sales"
              value={money(
                overview?.totalSales,
              )}
            />

            <StatCard
              icon={
                <ShoppingBag
                  size={20}
                />
              }
              label="Total Orders"
              value={
                overview?.totalOrders ??
                0
              }
            />

            <StatCard
              icon={
                <Users size={20} />
              }
              label="Customers"
              value={
                overview?.totalCustomers ??
                0
              }
            />

            <StatCard
              icon={
                <Boxes size={20} />
              }
              label="Products"
              value={
                overview?.totalProducts ??
                0
              }
            />

            <StatCard
              icon={
                <BarChart3
                  size={20}
                />
              }
              label="Paid Amount"
              value={money(
                overview?.paidAmount,
              )}
            />

            <StatCard
              icon={
                <ClipboardList
                  size={20}
                />
              }
              label="Pending Amount"
              value={money(
                overview?.pendingAmount,
              )}
            />
          </div>

          <div
            className={
              styles.contentGrid
            }
          >
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
                    Sales Summary
                  </h3>
                  <p>
                    Current sales
                    performance
                  </p>
                </div>
              </div>

              <div
                className={
                  styles.summaryRows
                }
              >
                <SummaryRow
                  label="Orders"
                  value={
                    sales?.summary
                      ?.orders ??
                    0
                  }
                />

                <SummaryRow
                  label="Sales"
                  value={money(
                    sales?.summary
                      ?.sales,
                  )}
                />

                <SummaryRow
                  label="Average Order Value"
                  value={money(
                    sales?.summary
                      ?.averageOrderValue,
                  )}
                />

                <SummaryRow
                  label="Refunded"
                  value={money(
                    overview?.refundedAmount,
                  )}
                />

                <SummaryRow
                  label="Cancelled"
                  value={money(
                    overview?.cancelledAmount,
                  )}
                />
              </div>
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
                    Payment Breakdown
                  </h3>
                  <p>
                    Payment status
                  </p>
                </div>
              </div>

              <div
                className={
                  styles.breakdown
                }
              >
                {sales?.paymentBreakdown
                  ?.length ? (
                  sales.paymentBreakdown.map(
                    (item) => (
                      <div
                        className={
                          styles.breakdownRow
                        }
                        key={
                          item.status
                        }
                      >
                        <span>
                          {
                            item.status
                          }
                        </span>

                        <strong>
                          {item.count}
                        </strong>

                        <em>
                          {money(
                            item.amount,
                          )}
                        </em>
                      </div>
                    ),
                  )
                ) : (
                  <EmptyState />
                )}
              </div>
            </div>
          </div>
        </>
      );
    };

  // ==================================================
  // SALES
  // ==================================================

  const renderSales =
    () => {
      return (
        <>
          <PageHeader
            title="Sales"
            description="Sales and payment report"
            onRefresh={
              applySalesFilter
            }
          />

          <div
            className={
              styles.panel
            }
            style={{
              marginBottom: 20,
            }}
          >
            <div
              className={
                styles.panelHeader
              }
              style={{
                flexWrap: "wrap",
                gap: 16,
              }}
            >
              <div>
                <h3>
                  Sales Report
                </h3>

                <p>
                  Select a date range and
                  download the sales report.
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className={
                    styles.refreshButton
                  }
                  onClick={() =>
                    downloadSalesReport(
                      "pdf",
                    )
                  }
                  disabled={
                    reportExporting !== ""
                  }
                  title="Download PDF sales report"
                >
                  <FileText
                    size={16}
                  />

                  {reportExporting ===
                  "pdf"
                    ? "Generating..."
                    : "PDF"}
                </button>

                <button
                  type="button"
                  className={
                    styles.refreshButton
                  }
                  onClick={() =>
                    downloadSalesReport(
                      "excel",
                    )
                  }
                  disabled={
                    reportExporting !== ""
                  }
                  title="Download Excel sales report"
                >
                  <FileSpreadsheet
                    size={16}
                  />

                  {reportExporting ===
                  "excel"
                    ? "Generating..."
                    : "Excel"}
                </button>
              </div>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(2, minmax(0, 1fr)) auto auto",
                gap: 12,
                alignItems: "end",
              }}
            >
              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#667085",
                  }}
                >
                  From
                </span>

                <input
                  type="date"
                  value={salesFrom}
                  onChange={(event) =>
                    setSalesFrom(
                      event.target.value,
                    )
                  }
                  style={{
                    width: "100%",
                    minHeight: 42,
                    padding:
                      "0 12px",
                    border:
                      "1px solid #e4e7ec",
                    borderRadius: 10,
                    background: "#fff",
                    color: "#172033",
                    outline: "none",
                    boxSizing:
                      "border-box",
                  }}
                />
              </label>

              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: "#667085",
                  }}
                >
                  To
                </span>

                <input
                  type="date"
                  value={salesTo}
                  onChange={(event) =>
                    setSalesTo(
                      event.target.value,
                    )
                  }
                  style={{
                    width: "100%",
                    minHeight: 42,
                    padding:
                      "0 12px",
                    border:
                      "1px solid #e4e7ec",
                    borderRadius: 10,
                    background: "#fff",
                    color: "#172033",
                    outline: "none",
                    boxSizing:
                      "border-box",
                  }}
                />
              </label>

              <button
                type="button"
                className={
                  styles.refreshButton
                }
                onClick={() =>
                  void applySalesFilter()
                }
                disabled={
                  salesFilterLoading
                }
              >
                <RefreshCw
                  size={16}
                />

                {salesFilterLoading
                  ? "Loading..."
                  : "Apply"}
              </button>

              <button
                type="button"
                className={
                  styles.refreshButton
                }
                onClick={() =>
                  void clearSalesFilter()
                }
                disabled={
                  salesFilterLoading
                }
              >
                Clear
              </button>
            </div>
          </div>

          <div
            className={
              styles.statsGrid
            }
          >
            <StatCard
              icon={
                <IndianRupee
                  size={20}
                />
              }
              label="Sales"
              value={money(
                sales?.summary
                  ?.sales,
              )}
            />

            <StatCard
              icon={
                <ShoppingBag
                  size={20}
                />
              }
              label="Orders"
              value={
                sales?.summary
                  ?.orders ?? 0
              }
            />

            <StatCard
              icon={
                <BarChart3
                  size={20}
                />
              }
              label="Average Order"
              value={money(
                sales?.summary
                  ?.averageOrderValue,
              )}
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
                  Daily Sales
                </h3>

                <p>
                  Sales activity
                </p>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems:
                    "center",
                  gap: 8,
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  className={
                    styles.refreshButton
                  }
                  onClick={() =>
                    downloadSalesReport(
                      "pdf",
                    )
                  }
                  disabled={
                    reportExporting !== ""
                  }
                >
                  <Download
                    size={15}
                  />
                  PDF
                </button>

                <button
                  type="button"
                  className={
                    styles.refreshButton
                  }
                  onClick={() =>
                    downloadSalesReport(
                      "excel",
                    )
                  }
                  disabled={
                    reportExporting !== ""
                  }
                >
                  <Download
                    size={15}
                  />
                  Excel
                </button>
              </div>
            </div>

            <div
              className={
                styles.tableWrapper
              }
            >
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Orders</th>
                    <th>Sales</th>
                  </tr>
                </thead>

                <tbody>
                  {sales?.dailySales
                    ?.length ? (
                    sales.dailySales.map(
                      (item) => (
                        <tr
                          key={
                            item.date
                          }
                        >
                          <td>
                            {dateFormat(
                              item.date,
                            )}
                          </td>

                          <td>
                            {item.orders}
                          </td>

                          <td>
                            {money(
                              item.sales,
                            )}
                          </td>
                        </tr>
                      ),
                    )
                  ) : (
                    <tr>
                      <td
                        colSpan={3}
                        className={
                          styles.emptyCell
                        }
                      >
                        No sales data
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      );
    };

  // ==================================================
  // ORDERS
  // ==================================================

  const renderOrders =
    () => {
      return (
        <>
          <PageHeader
            title="Orders"
            description="View customer orders and payment information"
            onRefresh={
              loadOrders
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
                  placeholder="Search orders or customers..."
                  value={
                    orderSearch
                  }
                  onChange={(
                    event,
                  ) => {
                    setPage(1);
                    setOrderSearch(
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
                        Amount
                      </th>
                      <th>
                        Payment
                      </th>
                      <th>
                        Status
                      </th>
                      <th>
                        Date
                      </th>
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
                                      ?.email
                                  }
                                </small>
                              </div>
                            </td>

                            <td>
                              {money(
                                order.totalAmount,
                              )}
                            </td>

                            <td>
                              <StatusBadge
                                value={
                                  order.paymentStatus
                                }
                              />
                            </td>

                            <td>
                              <StatusBadge
                                value={
                                  order.orderStatus
                                }
                              />
                            </td>

                            <td>
                              {dateFormat(
                                order.createdAt,
                              )}
                            </td>
                          </tr>
                        ),
                      )
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
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
              page={pagination.page}
              pages={pagination.pages}
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
                      pagination.pages,
                      value + 1,
                    ),
                )
              }
            />
          </div>
        </>
      );
    };

  // ==================================================
  // INVENTORY
  // ==================================================

  const renderInventory =
    () => {
      return (
        <>
          <PageHeader
            title="Inventory"
            description="Read-only product inventory"
            onRefresh={
              loadInventory
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
                  placeholder="Search products..."
                  value={
                    inventorySearch
                  }
                  onChange={(
                    event,
                  ) => {
                    setInventoryPage(
                      1,
                    );

                    setInventorySearch(
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
              {inventoryLoading ? (
                <LoadingState />
              ) : (
                <table>
                  <thead>
                    <tr>
                      <th>
                        Product
                      </th>
                      <th>
                        SKU
                      </th>
                      <th>
                        Price
                      </th>
                      <th>
                        Stock
                      </th>
                      <th>
                        Inventory Value
                      </th>
                      <th>
                        Status
                      </th>
                    </tr>
                  </thead>

                  <tbody>
                    {inventory.length ? (
                      inventory.map(
                        (product) => (
                          <tr
                            key={
                              product._id
                            }
                          >
                            <td>
                              <strong>
                                {
                                  product.name ||
                                  product.title ||
                                  "Product"
                                }
                              </strong>
                            </td>

                            <td>
                              {
                                product.sku ||
                                "—"
                              }
                            </td>

                            <td>
                              {money(
                                product.salePrice ??
                                  product.price,
                              )}
                            </td>

                            <td>
                              <strong
                                className={
                                  product.outOfStock
                                    ? styles.dangerText
                                    : product.lowStock
                                      ? styles.warningText
                                      : ""
                                }
                              >
                                {
                                  product.stock
                                }
                              </strong>
                            </td>

                            <td>
                              {money(
                                product.inventoryValue,
                              )}
                            </td>

                            <td>
                              <StatusBadge
                                value={
                                  product.outOfStock
                                    ? "OUT OF STOCK"
                                    : product.lowStock
                                      ? "LOW STOCK"
                                      : "IN STOCK"
                                }
                              />
                            </td>
                          </tr>
                        ),
                      )
                    ) : (
                      <tr>
                        <td
                          colSpan={6}
                          className={
                            styles.emptyCell
                          }
                        >
                          No products found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}
            </div>

            <Pagination
              page={
                inventoryPagination.page
              }
              pages={
                inventoryPagination.pages
              }
              onPrevious={() =>
                setInventoryPage(
                  (value) =>
                    Math.max(
                      1,
                      value - 1,
                    ),
                )
              }
              onNext={() =>
                setInventoryPage(
                  (value) =>
                    Math.min(
                      inventoryPagination.pages,
                      value + 1,
                    ),
                )
              }
            />
          </div>
        </>
      );
    };

  // ==================================================
  // ACCOUNT
  // ==================================================

  const renderAccount =
    () => {
      return (
        <>
          <PageHeader
            title="Account Settings"
            description="Manage your Accounts staff profile and password"
            onRefresh={async () => {
              try {
                const response =
                  await getCurrentStaff();

                if (response.user) {
                  setStaffUser(
                    response.user,
                  );

                  setAccountName(
                    response.user.name ||
                      "",
                  );

                  setAccountEmail(
                    response.user.email ||
                      "",
                  );
                }
              } catch (error) {
                console.error(
                  "Refresh staff account error:",
                  error,
                );

                setAccountError(
                  errorMessage(error),
                );
              }
            }}
          />

          <div
            className={
              styles.contentGrid
            }
          >
            <section
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
                    Profile Details
                  </h3>

                  <p>
                    Update the name and
                    email used for this staff
                    account.
                  </p>
                </div>

                <div
                  style={{
                    width: 42,
                    height: 42,
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    borderRadius: 12,
                    background:
                      "#f2f4ff",
                    color: "#4f46e5",
                  }}
                >
                  <User
                    size={19}
                  />
                </div>
              </div>

              {accountMessage && (
                <div
                  style={{
                    marginBottom: 14,
                    padding:
                      "11px 13px",
                    borderRadius: 10,
                    border:
                      "1px solid #ccebd7",
                    background:
                      "#f1fbf4",
                    color:
                      "#157347",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {accountMessage}
                </div>
              )}

              {accountError && (
                <div
                  style={{
                    marginBottom: 14,
                    padding:
                      "11px 13px",
                    borderRadius: 10,
                    border:
                      "1px solid #f2caca",
                    background:
                      "#fff6f6",
                    color:
                      "#b42318",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {accountError}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gap: 15,
                }}
              >
                <label
                  style={{
                    display: "grid",
                    gap: 7,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#667085",
                    }}
                  >
                    Full Name
                  </span>

                  <input
                    type="text"
                    value={accountName}
                    onChange={(event) =>
                      setAccountName(
                        event.target
                          .value,
                      )
                    }
                    maxLength={80}
                    autoComplete="name"
                    style={{
                      width: "100%",
                      minHeight: 44,
                      padding:
                        "0 13px",
                      border:
                        "1px solid #e4e7ec",
                      borderRadius: 11,
                      background: "#fff",
                      color:
                        "#172033",
                      outline: "none",
                      boxSizing:
                        "border-box",
                    }}
                  />
                </label>

                <label
                  style={{
                    display: "grid",
                    gap: 7,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      fontWeight: 700,
                      color: "#667085",
                    }}
                  >
                    Email Address
                  </span>

                  <input
                    type="email"
                    value={accountEmail}
                    onChange={(event) =>
                      setAccountEmail(
                        event.target
                          .value,
                      )
                    }
                    autoComplete="email"
                    style={{
                      width: "100%",
                      minHeight: 44,
                      padding:
                        "0 13px",
                      border:
                        "1px solid #e4e7ec",
                      borderRadius: 11,
                      background: "#fff",
                      color:
                        "#172033",
                      outline: "none",
                      boxSizing:
                        "border-box",
                    }}
                  />
                </label>

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "space-between",
                    alignItems:
                      "center",
                    gap: 12,
                    flexWrap:
                      "wrap",
                    paddingTop: 2,
                  }}
                >
                  <span
                    style={{
                      fontSize: 12,
                      color: "#98a2b3",
                    }}
                  >
                    Role:{" "}
                    <strong
                      style={{
                        color:
                          "#344054",
                      }}
                    >
                      {staffUser?.role ||
                        "accounts"}
                    </strong>
                  </span>

                  <button
                    type="button"
                    className={
                      styles.refreshButton
                    }
                    onClick={() =>
                      void handleAccountSave()
                    }
                    disabled={
                      accountSaving
                    }
                  >
                    <Save
                      size={16}
                    />

                    {accountSaving
                      ? "Saving..."
                      : "Save Changes"}
                  </button>
                </div>
              </div>
            </section>

            <section
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
                    Change Password
                  </h3>

                  <p>
                    Keep your staff account
                    secure.
                  </p>
                </div>

                <div
                  style={{
                    width: 42,
                    height: 42,
                    display: "flex",
                    alignItems:
                      "center",
                    justifyContent:
                      "center",
                    borderRadius: 12,
                    background:
                      "#f6f3ff",
                    color: "#6d28d9",
                  }}
                >
                  <LockKeyhole
                    size={19}
                  />
                </div>
              </div>

              {passwordMessage && (
                <div
                  style={{
                    marginBottom: 14,
                    padding:
                      "11px 13px",
                    borderRadius: 10,
                    border:
                      "1px solid #ccebd7",
                    background:
                      "#f1fbf4",
                    color:
                      "#157347",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {passwordMessage}
                </div>
              )}

              {passwordError && (
                <div
                  style={{
                    marginBottom: 14,
                    padding:
                      "11px 13px",
                    borderRadius: 10,
                    border:
                      "1px solid #f2caca",
                    background:
                      "#fff6f6",
                    color:
                      "#b42318",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  {passwordError}
                </div>
              )}

              <div
                style={{
                  display: "grid",
                  gap: 15,
                }}
              >
                {[
                  {
                    label:
                      "Current Password",
                    value:
                      currentPassword,
                    setValue:
                      setCurrentPassword,
                    autoComplete:
                      "current-password",
                  },
                  {
                    label:
                      "New Password",
                    value:
                      newPassword,
                    setValue:
                      setNewPassword,
                    autoComplete:
                      "new-password",
                  },
                  {
                    label:
                      "Confirm New Password",
                    value:
                      confirmPassword,
                    setValue:
                      setConfirmPassword,
                    autoComplete:
                      "new-password",
                  },
                ].map(
                  (field) => (
                    <label
                      key={field.label}
                      style={{
                        display:
                          "grid",
                        gap: 7,
                      }}
                    >
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight:
                            700,
                          color:
                            "#667085",
                        }}
                      >
                        {field.label}
                      </span>

                      <input
                        type="password"
                        value={
                          field.value
                        }
                        onChange={(
                          event,
                        ) =>
                          field.setValue(
                            event
                              .target
                              .value,
                          )
                        }
                        autoComplete={
                          field.autoComplete
                        }
                        style={{
                          width:
                            "100%",
                          minHeight:
                            44,
                          padding:
                            "0 13px",
                          border:
                            "1px solid #e4e7ec",
                          borderRadius:
                            11,
                          background:
                            "#fff",
                          color:
                            "#172033",
                          outline:
                            "none",
                          boxSizing:
                            "border-box",
                        }}
                      />
                    </label>
                  ),
                )}

                <div
                  style={{
                    display:
                      "flex",
                    justifyContent:
                      "flex-end",
                    paddingTop: 2,
                  }}
                >
                  <button
                    type="button"
                    className={
                      styles.refreshButton
                    }
                    onClick={() =>
                      void handlePasswordSave()
                    }
                    disabled={
                      passwordSaving
                    }
                  >
                    <LockKeyhole
                      size={16}
                    />

                    {passwordSaving
                      ? "Updating..."
                      : "Update Password"}
                  </button>
                </div>
              </div>
            </section>
          </div>
        </>
      );
    };

  // ==================================================
  // MAIN
  // ==================================================

  return (
    <div
      className={
        styles.dashboard
      }
    >
      <AccountsSidebar
        active={activePage}
        onNavigate={setActivePage}
        onLogout={handleLogout}
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
          "sales" &&
          renderSales()}

        {activePage ===
          "orders" &&
          renderOrders()}

        {activePage ===
          "inventory" &&
          renderInventory()}

        {activePage ===
          "account" &&
          renderAccount()}
      </main>
    </div>
  );
};

/* =========================================================
   INLINE ACCOUNTS SIDEBAR
   Kept inside this file so the Accounts dashboard does not
   depend on a separate StaffSidebar component.
========================================================= */

const AccountsSidebar = ({
  active,
  onNavigate,
  onLogout,
}: {
  active: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}) => {
  const menu = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "sales",
      label: "Sales",
      icon: BarChart3,
    },
    {
      id: "orders",
      label: "Orders",
      icon: ShoppingBag,
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Boxes,
    },
    {
      id: "account",
      label: "Account",
      icon: User,
    },
  ];

  return (
    <aside className="accountsInlineSidebar">
      <style>{`
        .accountsInlineSidebar {
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
          box-sizing: border-box;
        }

        .accountsInlineBrand {
          display: flex;
          align-items: center;
          gap: 12px;
          min-height: 54px;
          padding: 0 10px;
          margin-bottom: 26px;
        }

        .accountsInlineBrandMark {
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
          box-sizing: border-box;
        }

        .accountsInlineBrandMark img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
        }

        .accountsInlineBrandText {
          min-width: 0;
        }

        .accountsInlineBrandText strong {
          display: block;
          margin: 0;
          color: #111827;
          font-size: 18px;
          line-height: 1.1;
          font-weight: 800;
        }

        .accountsInlineBrandText span {
          display: block;
          margin-top: 4px;
          color: #7b8494;
          font-size: 12px;
          line-height: 1.2;
          font-weight: 500;
        }

        .accountsInlineRole {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          min-height: 68px;
          padding: 12px;
          margin-bottom: 28px;
          border: 1px solid #e9ebf1;
          border-radius: 16px;
          background: linear-gradient(
            180deg,
            #fafaff 0%,
            #f7f7fb 100%
          );
          box-sizing: border-box;
        }

        .accountsInlineRoleIcon {
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

        .accountsInlineRoleText {
          min-width: 0;
        }

        .accountsInlineRoleText small {
          display: block;
          margin-bottom: 4px;
          color: #8a93a3;
          font-size: 11px;
          line-height: 1.2;
        }

        .accountsInlineRoleText strong {
          display: block;
          color: #172033;
          font-size: 13px;
          line-height: 1.2;
          font-weight: 800;
        }

        .accountsInlineSectionTitle {
          padding: 0 13px;
          margin: 0 0 9px;
          color: #8992a3;
          font-size: 10px;
          line-height: 1.2;
          font-weight: 800;
          letter-spacing: 0.1em;
          text-transform: uppercase;
        }

        .accountsInlineNavigation {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .accountsInlineNavItem {
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
          cursor: pointer;
          transition:
            background 0.18s ease,
            color 0.18s ease,
            transform 0.18s ease;
          box-sizing: border-box;
        }

        .accountsInlineNavItem:hover {
          background: #f5f6fa;
          color: #252e3d;
        }

        .accountsInlineNavItem:active {
          transform: translateY(1px);
        }

        .accountsInlineNavItem.isActive {
          background: #111827;
          color: #ffffff;
          box-shadow: 0 8px 18px rgba(17, 24, 39, 0.12);
        }

        .accountsInlineNavIcon {
          width: 20px;
          height: 20px;
          flex: 0 0 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .accountsInlineNavLabel {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .accountsInlineActiveDot {
          width: 5px;
          height: 5px;
          margin-left: auto;
          border-radius: 50%;
          background: #ffffff;
          box-shadow: 0 0 0 4px rgba(255, 255, 255, 0.08);
        }

        .accountsInlineBottom {
          margin-top: auto;
          padding-top: 18px;
          border-top: 1px solid #edf0f4;
        }

        .accountsInlineLogout {
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
          cursor: pointer;
          transition:
            background 0.18s ease,
            color 0.18s ease;
          box-sizing: border-box;
        }

        .accountsInlineLogout:hover {
          background: #fff5f5;
          color: #dc2626;
        }

        .accountsInlineLogout:focus-visible,
        .accountsInlineNavItem:focus-visible {
          outline: 2px solid #111827;
          outline-offset: 2px;
        }

        .accountsInlineLogoutLabel {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        @media (max-width: 900px) {
          .accountsInlineSidebar {
            width: 80px;
            padding: 20px 10px;
          }

          .accountsInlineBrand {
            justify-content: center;
            padding: 0;
            margin-bottom: 22px;
          }

          .accountsInlineBrandText,
          .accountsInlineRoleText,
          .accountsInlineSectionTitle,
          .accountsInlineNavLabel,
          .accountsInlineActiveDot,
          .accountsInlineLogoutLabel {
            display: none;
          }

          .accountsInlineRole {
            justify-content: center;
            padding: 8px;
            margin-bottom: 20px;
          }

          .accountsInlineNavItem {
            justify-content: center;
            padding: 0;
          }

          .accountsInlineLogout {
            justify-content: center;
            padding: 0;
          }
        }
      `}</style>

      <div className="accountsInlineBrand">
        <div className="accountsInlineBrandMark">
          <img
            src="/jihaan-logo.png"
            alt="Jihaan Beauty"
            onError={(event) => {
              event.currentTarget.style.display = "none";

              const parent =
                event.currentTarget.parentElement;

              if (parent) {
                parent.textContent = "J";
              }
            }}
          />
        </div>

        <div className="accountsInlineBrandText">
          <strong>Jihaan</strong>
          <span>Beauty</span>
        </div>
      </div>

      <div className="accountsInlineRole">
        <div className="accountsInlineRoleIcon">
          <IndianRupee size={19} />
        </div>

        <div className="accountsInlineRoleText">
          <small>Logged in as</small>
          <strong>Accounts</strong>
        </div>
      </div>

      <div className="accountsInlineSectionTitle">
        Dashboard
      </div>

      <nav className="accountsInlineNavigation">
        {menu.map((item) => {
          const Icon = item.icon;
          const isActive = active === item.id;

          return (
            <button
              key={item.id}
              type="button"
              className={`accountsInlineNavItem${
                isActive ? " isActive" : ""
              }`}
              onClick={() => onNavigate(item.id)}
              aria-current={
                isActive ? "page" : undefined
              }
            >
              <span className="accountsInlineNavIcon">
                <Icon size={19} />
              </span>

              <span className="accountsInlineNavLabel">
                {item.label}
              </span>

              {isActive && (
                <span className="accountsInlineActiveDot" />
              )}
            </button>
          );
        })}
      </nav>

      <div className="accountsInlineBottom">
        <button
          type="button"
          className="accountsInlineLogout"
          onClick={() => void onLogout()}
          title="Logout"
        >
          <LogOut size={19} />

          <span className="accountsInlineLogoutLabel">
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
};

// ==================================================
// COMPONENTS
// ==================================================

const PageHeader = ({
  title,
  description,
  onRefresh,
}: {
  title: string;
  description: string;
  onRefresh: () => void;
}) => (
  <header
    className={
      styles.pageHeader
    }
  >
    <div>
      <span className={styles.eyebrow}>
        ACCOUNTS
      </span>

      <h1>{title}</h1>

      <p>{description}</p>
    </div>

    <button
      type="button"
      className={styles.refreshButton}
      onClick={onRefresh}
    >
      <RefreshCw size={16} />
      Refresh
    </button>
  </header>
);

const StatCard = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
}) => (
  <div className={styles.statCard}>
    <div className={styles.statIcon}>
      {icon}
    </div>

    <div>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  </div>
);

const SummaryRow = ({
  label,
  value,
}: {
  label: string;
  value: string | number;
}) => (
  <div className={styles.summaryRow}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const StatusBadge = ({
  value,
}: {
  value?: string;
}) => {
  const normalized =
    String(value || "UNKNOWN")
      .toLowerCase()
      .replace(/\s+/g, "-");

  return (
    <span
      className={`${styles.status} ${styles[normalized] || ""}`}
    >
      {value || "—"}
    </span>
  );
};

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
  <div className={styles.pagination}>
    <span>
      Page {page} of {pages}
    </span>

    <div>
      <button
        type="button"
        disabled={page <= 1}
        onClick={onPrevious}
      >
        <ChevronLeft size={17} />
      </button>

      <button
        type="button"
        disabled={page >= pages}
        onClick={onNext}
      >
        <ChevronRight size={17} />
      </button>
    </div>
  </div>
);

const LoadingState = () => (
  <div className={styles.loading}>
    <LoaderCircle
      size={28}
      className={styles.spinner}
    />

    <span>
      Loading...
    </span>
  </div>
);

const EmptyState = () => (
  <div className={styles.empty}>
    No data available
  </div>
);

export default AccountsDashboard;