import {
  useCallback,
  useEffect,
  useState,
} from "react";

import {
  Bell,
  Check,
  Edit3,
  ExternalLink,
  Link as LinkIcon,
  Loader2,
  MessageSquare,
  Plus,
  RefreshCw,
  Save,
  Trash2,
  X,
} from "lucide-react";

import "./NotificationsManager.css";

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  link?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  createdBy?: {
    _id?: string;
    name?: string;
    email?: string;
  };
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  notifications?: NotificationItem[];
  notification?: NotificationItem;
  data?: unknown;
}

interface NotificationForm {
  title: string;
  message: string;
  link: string;
  isActive: boolean;
}

const EMPTY_FORM: NotificationForm = {
  title: "",
  message: "",
  link: "",
  isActive: true,
};

const RAW_API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.VITE_API_URL ||
    "https://jihaan-cosmetics.onrender.com",
).replace(/\/+$/, "");

const API_BASE_URL = RAW_API_BASE_URL.endsWith(
  "/api",
)
  ? RAW_API_BASE_URL
  : `${RAW_API_BASE_URL}/api`;

const getToken = (): string => {
  return (
    localStorage.getItem("adminToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem(
      "accessToken",
    ) ||
    localStorage.getItem(
      "jihaan_auth_token",
    ) ||
    ""
  );
};

const getAuthHeaders = (): HeadersInit => {
  const token = getToken();

  return {
    Accept: "application/json",
    "Content-Type": "application/json",
    ...(token
      ? {
          Authorization: `Bearer ${token}`,
        }
      : {}),
  };
};

async function apiRequest<T = ApiResponse>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(
    `${API_BASE_URL}${endpoint}`,
    {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...(options.headers || {}),
      },
      credentials: "include",
    },
  );

  const data = (await response
    .json()
    .catch(() => ({}))) as ApiResponse;

  if (!response.ok) {
    throw new Error(
      data.message ||
        `Request failed with status ${response.status}`,
    );
  }

  return data as T;
}

const formatDate = (
  value: string,
): string => {
  if (!value) {
    return "—";
  }

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

const isExternalLink = (
  link: string,
): boolean => {
  return /^https?:\/\//i.test(link);
};

export default function NotificationsManager() {
  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [form, setForm] =
    useState<NotificationForm>(
      EMPTY_FORM,
    );

  const [editingId, setEditingId] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [refreshing, setRefreshing] =
    useState(false);

  const [deletingId, setDeletingId] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [showForm, setShowForm] =
    useState(false);

  const fetchNotifications =
    useCallback(
      async (
        isRefresh = false,
      ) => {
        try {
          if (isRefresh) {
            setRefreshing(true);
          } else {
            setLoading(true);
          }

          setError("");

          const response =
            await apiRequest<ApiResponse>(
              "/notifications/admin",
            );

          const notificationList =
            Array.isArray(
              response.notifications,
            )
              ? response.notifications
              : Array.isArray(
                    response.data,
                  )
                ? (response.data as NotificationItem[])
                : [];

          setNotifications(
            notificationList,
          );
        } catch (requestError) {
          console.error(
            "Notifications fetch error:",
            requestError,
          );

          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load notifications.",
          );
        } finally {
          setLoading(false);
          setRefreshing(false);
        }
      },
      [],
    );

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const resetForm = () => {
    setForm(EMPTY_FORM);
    setEditingId(null);
    setShowForm(false);
  };

  const openCreateForm = () => {
    setSuccess("");
    setError("");
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEditForm = (
    notification: NotificationItem,
  ) => {
    setSuccess("");
    setError("");

    setEditingId(
      notification._id,
    );

    setForm({
      title: notification.title || "",
      message:
        notification.message || "",
      link: notification.link || "",
      isActive:
        notification.isActive !== false,
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleInputChange = (
    field: keyof NotificationForm,
    value: string | boolean,
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const validateForm = (): boolean => {
    if (!form.title.trim()) {
      setError(
        "Notification title is required.",
      );
      return false;
    }

    if (!form.message.trim()) {
      setError(
        "Notification message is required.",
      );
      return false;
    }

    if (form.title.trim().length > 150) {
      setError(
        "Notification title cannot exceed 150 characters.",
      );
      return false;
    }

    if (
      form.message.trim().length >
      500
    ) {
      setError(
        "Notification message cannot exceed 500 characters.",
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);

      const payload = {
        title: form.title.trim(),
        message: form.message.trim(),
        link: form.link.trim(),
        isActive: form.isActive,
      };

      if (editingId) {
        const response =
          await apiRequest<ApiResponse>(
            `/notifications/admin/${editingId}`,
            {
              method: "PUT",
              body: JSON.stringify(
                payload,
              ),
            },
          );

        setSuccess(
          response.message ||
            "Notification updated successfully.",
        );
      } else {
        const response =
          await apiRequest<ApiResponse>(
            "/notifications/admin",
            {
              method: "POST",
              body: JSON.stringify(
                payload,
              ),
            },
          );

        setSuccess(
          response.message ||
            "Notification created successfully.",
        );
      }

      resetForm();

      await fetchNotifications();
    } catch (requestError) {
      console.error(
        "Notification save error:",
        requestError,
      );

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save notification.",
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (
    notification: NotificationItem,
  ) => {
    const confirmed =
      window.confirm(
        `Delete "${notification.title}"? This action cannot be undone.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(
        notification._id,
      );

      setError("");
      setSuccess("");

      const response =
        await apiRequest<ApiResponse>(
          `/notifications/admin/${notification._id}`,
          {
            method: "DELETE",
          },
        );

      setSuccess(
        response.message ||
          "Notification deleted successfully.",
      );

      if (
        editingId === notification._id
      ) {
        resetForm();
      }

      await fetchNotifications();
    } catch (requestError) {
      console.error(
        "Notification delete error:",
        requestError,
      );

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete notification.",
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive =
    async (
      notification: NotificationItem,
    ) => {
      try {
        setError("");
        setSuccess("");

        const response =
          await apiRequest<ApiResponse>(
            `/notifications/admin/${notification._id}`,
            {
              method: "PUT",
              body: JSON.stringify({
                title:
                  notification.title,
                message:
                  notification.message,
                link:
                  notification.link ||
                  "",
                isActive:
                  !notification.isActive,
              }),
            },
          );

        setSuccess(
          response.message ||
            `Notification ${
              notification.isActive
                ? "deactivated"
                : "activated"
            } successfully.`,
        );

        await fetchNotifications();
      } catch (requestError) {
        console.error(
          "Notification status error:",
          requestError,
        );

        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to update notification status.",
        );
      }
    };

  const activeCount =
    notifications.filter(
      (notification) =>
        notification.isActive,
    ).length;

  const inactiveCount =
    notifications.length -
    activeCount;

  return (
    <section className="notificationsManager">
      {/* ---------------------------------------------------------
          PAGE HEADER
      --------------------------------------------------------- */}

      <div className="notificationsPageHeader">
        <div>
          <div className="notificationsEyebrow">
            CUSTOMER COMMUNICATION
          </div>

          <h2>
            Notification Management
          </h2>

          <p>
            Create and manage notifications
            that appear in the customer
            header.
          </p>
        </div>

        <div className="notificationsHeaderActions">
          <button
            type="button"
            className="notificationRefreshButton"
            onClick={() =>
              void fetchNotifications(
                true,
              )
            }
            disabled={
              loading || refreshing
            }
            title="Refresh notifications"
          >
            <RefreshCw
              size={17}
              className={
                refreshing
                  ? "notificationSpin"
                  : ""
              }
            />

            {refreshing
              ? "Refreshing..."
              : "Refresh"}
          </button>

          <button
            type="button"
            className="notificationCreateButton"
            onClick={openCreateForm}
          >
            <Plus size={18} />

            Create Notification
          </button>
        </div>
      </div>

      {/* ---------------------------------------------------------
          ALERTS
      --------------------------------------------------------- */}

      {error && (
        <div className="notificationAlert notificationAlertError">
          <AlertTriangleIcon />

          <span>{error}</span>

          <button
            type="button"
            onClick={() =>
              setError("")
            }
            aria-label="Close error"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="notificationAlert notificationAlertSuccess">
          <Check size={18} />

          <span>{success}</span>

          <button
            type="button"
            onClick={() =>
              setSuccess("")
            }
            aria-label="Close success message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ---------------------------------------------------------
          SUMMARY
      --------------------------------------------------------- */}

      <div className="notificationSummaryGrid">
        <div className="notificationSummaryCard">
          <div className="notificationSummaryIcon">
            <Bell size={21} />
          </div>

          <div>
            <span>
              Total Notifications
            </span>

            <strong>
              {loading
                ? "..."
                : notifications.length}
            </strong>
          </div>
        </div>

        <div className="notificationSummaryCard">
          <div className="notificationSummaryIcon notificationActiveIcon">
            <Check size={21} />
          </div>

          <div>
            <span>Active</span>

            <strong>
              {loading
                ? "..."
                : activeCount}
            </strong>
          </div>
        </div>

        <div className="notificationSummaryCard">
          <div className="notificationSummaryIcon notificationInactiveIcon">
            <X size={21} />
          </div>

          <div>
            <span>Inactive</span>

            <strong>
              {loading
                ? "..."
                : inactiveCount}
            </strong>
          </div>
        </div>
      </div>

      {/* ---------------------------------------------------------
          CREATE / EDIT FORM
      --------------------------------------------------------- */}

      {showForm && (
        <div className="notificationFormCard">
          <div className="notificationFormHeader">
            <div>
              <span className="notificationFormEyebrow">
                {editingId
                  ? "EDIT NOTIFICATION"
                  : "NEW NOTIFICATION"}
              </span>

              <h3>
                {editingId
                  ? "Edit Notification"
                  : "Create Notification"}
              </h3>

              <p>
                This notification will
                appear in the customer
                header when it is active.
              </p>
            </div>

            <button
              type="button"
              className="notificationCloseButton"
              onClick={resetForm}
              aria-label="Close form"
            >
              <X size={19} />
            </button>
          </div>

          <form
            className="notificationForm"
            onSubmit={handleSubmit}
          >
            <div className="notificationFormGrid">
              <div className="notificationField notificationFieldFull">
                <label htmlFor="notification-title">
                  Notification Name / Title
                  <span>*</span>
                </label>

                <div className="notificationInputWrapper">
                  <Bell size={17} />

                  <input
                    id="notification-title"
                    type="text"
                    value={form.title}
                    onChange={(event) =>
                      handleInputChange(
                        "title",
                        event.target.value,
                      )
                    }
                    placeholder="e.g. New Collection Available"
                    maxLength={150}
                    required
                  />
                </div>

                <small>
                  {form.title.length}/150
                </small>
              </div>

              <div className="notificationField notificationFieldFull">
                <label htmlFor="notification-message">
                  Message / Subject
                  <span>*</span>
                </label>

                <div className="notificationTextareaWrapper">
                  <MessageSquare
                    size={17}
                  />

                  <textarea
                    id="notification-message"
                    value={form.message}
                    onChange={(event) =>
                      handleInputChange(
                        "message",
                        event.target.value,
                      )
                    }
                    placeholder="Write the notification message..."
                    maxLength={500}
                    rows={4}
                    required
                  />
                </div>

                <small>
                  {form.message.length}/500
                </small>
              </div>

              <div className="notificationField notificationFieldFull">
                <label htmlFor="notification-link">
                  Notification Link
                </label>

                <div className="notificationInputWrapper">
                  <LinkIcon size={17} />

                  <input
                    id="notification-link"
                    type="text"
                    value={form.link}
                    onChange={(event) =>
                      handleInputChange(
                        "link",
                        event.target.value,
                      )
                    }
                    placeholder="/offers or https://example.com"
                  />
                </div>

                <small>
                  Example: /offers, /new-arrivals,
                  /products/123 or an external
                  URL.
                </small>
              </div>

              <div className="notificationToggleField">
                <div>
                  <strong>
                    Active Notification
                  </strong>

                  <span>
                    Customers can see this
                    notification when active.
                  </span>
                </div>

                <button
                  type="button"
                  className={[
                    "notificationToggle",
                    form.isActive
                      ? "toggleActive"
                      : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                  onClick={() =>
                    handleInputChange(
                      "isActive",
                      !form.isActive,
                    )
                  }
                  aria-pressed={
                    form.isActive
                  }
                >
                  <span />
                </button>
              </div>
            </div>

            <div className="notificationFormActions">
              <button
                type="button"
                className="notificationCancelButton"
                onClick={resetForm}
                disabled={saving}
              >
                <X size={17} />
                Cancel
              </button>

              <button
                type="submit"
                className="notificationSaveButton"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2
                      size={17}
                      className="notificationSpin"
                    />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={17} />

                    {editingId
                      ? "Update Notification"
                      : "Create Notification"}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ---------------------------------------------------------
          NOTIFICATION LIST
      --------------------------------------------------------- */}

      <div className="notificationListCard">
        <div className="notificationListHeader">
          <div>
            <span className="notificationFormEyebrow">
              MANAGE NOTIFICATIONS
            </span>

            <h3>
              All Notifications
            </h3>

            <p>
              Notifications created by
              Admin and Super Admin.
            </p>
          </div>

          <div className="notificationListCount">
            {notifications.length}{" "}
            {notifications.length === 1
              ? "notification"
              : "notifications"}
          </div>
        </div>

        {loading ? (
          <div className="notificationLoadingState">
            <Loader2
              size={28}
              className="notificationSpin"
            />

            <span>
              Loading notifications...
            </span>
          </div>
        ) : notifications.length ===
          0 ? (
          <div className="notificationEmptyState">
            <div className="notificationEmptyIcon">
              <Bell size={30} />
            </div>

            <h3>
              No notifications yet
            </h3>

            <p>
              Create your first customer
              notification to display it
              in the website header.
            </p>

            <button
              type="button"
              className="notificationCreateButton"
              onClick={openCreateForm}
            >
              <Plus size={17} />
              Create Notification
            </button>
          </div>
        ) : (
          <div className="notificationTableWrapper">
            <table className="notificationTable">
              <thead>
                <tr>
                  <th>Notification</th>
                  <th>Link</th>
                  <th>Status</th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {notifications.map(
                  (notification) => (
                    <tr
                      key={
                        notification._id
                      }
                    >
                      <td>
                        <div className="notificationTableTitle">
                          <div className="notificationTableIcon">
                            <Bell
                              size={17}
                            />
                          </div>

                          <div>
                            <strong>
                              {
                                notification.title
                              }
                            </strong>

                            <p>
                              {
                                notification.message
                              }
                            </p>
                          </div>
                        </div>
                      </td>

                      <td>
                        {notification.link ? (
                          <a
                            href={
                              notification.link
                            }
                            target={
                              isExternalLink(
                                notification.link,
                              )
                                ? "_blank"
                                : undefined
                            }
                            rel={
                              isExternalLink(
                                notification.link,
                              )
                                ? "noopener noreferrer"
                                : undefined
                            }
                            className="notificationLinkPreview"
                          >
                            <LinkIcon
                              size={14}
                            />

                            <span>
                              {
                                notification.link
                              }
                            </span>

                            {isExternalLink(
                              notification.link,
                            ) && (
                              <ExternalLink
                                size={13}
                              />
                            )}
                          </a>
                        ) : (
                          <span className="notificationNoLink">
                            No link
                          </span>
                        )}
                      </td>

                      <td>
                        <button
                          type="button"
                          className={[
                            "notificationStatusBadge",
                            notification.isActive
                              ? "statusActive"
                              : "statusInactive",
                          ].join(" ")}
                          onClick={() =>
                            void handleToggleActive(
                              notification,
                            )
                          }
                          title={
                            notification.isActive
                              ? "Click to deactivate"
                              : "Click to activate"
                          }
                        >
                          <span />

                          {notification.isActive
                            ? "Active"
                            : "Inactive"}
                        </button>
                      </td>

                      <td>
                        <span className="notificationDate">
                          {formatDate(
                            notification.createdAt,
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="notificationActions">
                          <button
                            type="button"
                            className="notificationActionButton notificationEditButton"
                            onClick={() =>
                              openEditForm(
                                notification,
                              )
                            }
                            title="Edit notification"
                          >
                            <Edit3
                              size={16}
                            />
                          </button>

                          <button
                            type="button"
                            className="notificationActionButton notificationDeleteButton"
                            onClick={() =>
                              void handleDelete(
                                notification,
                              )
                            }
                            disabled={
                              deletingId ===
                              notification._id
                            }
                            title="Delete notification"
                          >
                            {deletingId ===
                            notification._id ? (
                              <Loader2
                                size={16}
                                className="notificationSpin"
                              />
                            ) : (
                              <Trash2
                                size={16}
                              />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function AlertTriangleIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}