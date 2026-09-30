import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Bell,
  Check,
  CheckCheck,
  ChevronRight,
  Clock3,
  LoaderCircle,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import MainHeader from "../MainHeader";
import Footer from "../../../footer/Footer";
import "./NotificationsPage.css";

interface NotificationItem {
  _id: string;
  title: string;
  message: string;
  link?: string;
  isActive?: boolean;
  isRead?: boolean;
  createdAt: string;
}

interface NotificationResponse {
  success?: boolean;
  message?: string;
  notifications?: NotificationItem[];
  data?: NotificationItem[];
  unreadCount?: number;
  count?: number;
}

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/+$/, "");

const AUTH_TOKEN_KEY = "jihaan_auth_token";

const getToken = () => {
  return (
    localStorage.getItem(AUTH_TOKEN_KEY) ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    ""
  );
};

function formatNotificationDate(
  value: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date unavailable";
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatRelativeDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = Date.now();
  const difference = now - date.getTime();

  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (difference < minute) {
    return "Just now";
  }

  if (difference < hour) {
    const minutes = Math.floor(
      difference / minute,
    );

    return `${minutes} ${
      minutes === 1 ? "minute" : "minutes"
    } ago`;
  }

  if (difference < day) {
    const hours = Math.floor(
      difference / hour,
    );

    return `${hours} ${
      hours === 1 ? "hour" : "hours"
    } ago`;
  }

  if (difference < 7 * day) {
    const days = Math.floor(
      difference / day,
    );

    return `${days} ${
      days === 1 ? "day" : "days"
    } ago`;
  }

  return formatNotificationDate(value);
}

export default function NotificationsPage() {
  const navigate = useNavigate();

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [unreadCount, setUnreadCount] =
    useState(0);

  const [isLoading, setIsLoading] =
    useState(true);

  const [isRefreshing, setIsRefreshing] =
    useState(false);

  const [isMarkingAll, setIsMarkingAll] =
    useState(false);

  const [error, setError] =
    useState("");

  const [filter, setFilter] = useState<
    "all" | "unread"
  >("all");

  const fetchNotifications = async (
    refresh = false,
  ) => {
    const token = getToken();

    if (!token) {
      navigate("/login", {
        replace: true,
      });

      return;
    }

    try {
      if (refresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      setError("");

      const [
        notificationResponse,
        countResponse,
      ] = await Promise.all([
        fetch(
          `${API_BASE_URL}/notifications`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          },
        ),

        fetch(
          `${API_BASE_URL}/notifications/unread-count`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          },
        ),
      ]);

      const notificationData =
        (await notificationResponse
          .json()
          .catch(() => ({}))) as NotificationResponse;

      const countData =
        (await countResponse
          .json()
          .catch(() => ({}))) as NotificationResponse;

      if (!notificationResponse.ok) {
        throw new Error(
          notificationData.message ||
            "Unable to load notifications.",
        );
      }

      const receivedNotifications =
        Array.isArray(
          notificationData.notifications,
        )
          ? notificationData.notifications
          : Array.isArray(
                notificationData.data,
              )
            ? notificationData.data
            : [];

      setNotifications(
        receivedNotifications.filter(
          (notification) =>
            notification.isActive !== false,
        ),
      );

      if (countResponse.ok) {
        setUnreadCount(
          Number(
            countData.unreadCount ??
              countData.count ??
              0,
          ),
        );
      }
    } catch (fetchError) {
      console.error(
        "Notifications page error:",
        fetchError,
      );

      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Unable to load notifications.",
      );
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchNotifications();
  }, []);

  const markAsRead = async (
    notification: NotificationItem,
  ) => {
    const token = getToken();

    if (!token) {
      navigate("/login");
      return;
    }

    try {
      if (!notification.isRead) {
        const response = await fetch(
          `${API_BASE_URL}/notifications/${notification._id}/read`,
          {
            method: "PATCH",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error(
            "Unable to mark notification as read.",
          );
        }

        setNotifications((previous) =>
          previous.map((item) =>
            item._id === notification._id
              ? {
                  ...item,
                  isRead: true,
                }
              : item,
          ),
        );

        setUnreadCount((previous) =>
          Math.max(0, previous - 1),
        );
      }

      if (notification.link?.trim()) {
        const link =
          notification.link.trim();

        if (/^https?:\/\//i.test(link)) {
          window.location.href = link;
        } else {
          navigate(link);
        }
      }
    } catch (readError) {
      console.error(
        "Mark notification read error:",
        readError,
      );
    }
  };

  const markAllAsRead = async () => {
    const token = getToken();

    if (!token || unreadCount === 0) {
      return;
    }

    try {
      setIsMarkingAll(true);

      const response = await fetch(
        `${API_BASE_URL}/notifications/read-all`,
        {
          method: "PATCH",
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error(
          "Unable to mark all notifications as read.",
        );
      }

      setNotifications((previous) =>
        previous.map((notification) => ({
          ...notification,
          isRead: true,
        })),
      );

      setUnreadCount(0);
    } catch (markError) {
      console.error(
        "Mark all notifications error:",
        markError,
      );

      setError(
        markError instanceof Error
          ? markError.message
          : "Unable to mark notifications as read.",
      );
    } finally {
      setIsMarkingAll(false);
    }
  };

  const filteredNotifications = useMemo(() => {
    if (filter === "unread") {
      return notifications.filter(
        (notification) =>
          !notification.isRead,
      );
    }

    return notifications;
  }, [filter, notifications]);

  return (
    <>
      <MainHeader />

      <main className="notificationsPage">
      <div className="notificationsPageContainer">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="notificationsPageHeader">

          <div className="notificationsPageHeading">

            <div className="notificationsPageIcon">
              <Bell size={25} />
            </div>

            <div>
              <div className="notificationsBreadcrumb">
                <button
                  type="button"
                  onClick={() => navigate("/")}
                >
                  Home
                </button>

                <ChevronRight size={14} />

                <span>Notifications</span>
              </div>

              <h1>Notifications</h1>

              <p>
                Stay updated with the latest
                updates from Jini Cosmetics.
              </p>
            </div>

          </div>

          <button
            type="button"
            className="notificationsRefreshButton"
            onClick={() =>
              void fetchNotifications(true)
            }
            disabled={isRefreshing}
          >
            <RefreshCw
              size={17}
              className={
                isRefreshing
                  ? "notificationsSpin"
                  : ""
              }
            />

            Refresh
          </button>

        </header>

        {/* =====================================================
            TOOLBAR
        ====================================================== */}

        <div className="notificationsToolbar">

          <div className="notificationsFilters">

            <button
              type="button"
              className={
                filter === "all"
                  ? "notificationsFilter active"
                  : "notificationsFilter"
              }
              onClick={() =>
                setFilter("all")
              }
            >
              All
              <span>
                {notifications.length}
              </span>
            </button>

            <button
              type="button"
              className={
                filter === "unread"
                  ? "notificationsFilter active"
                  : "notificationsFilter"
              }
              onClick={() =>
                setFilter("unread")
              }
            >
              Unread
              <span>
                {unreadCount}
              </span>
            </button>

          </div>

          {unreadCount > 0 && (
            <button
              type="button"
              className="notificationsMarkAllButton"
              onClick={() =>
                void markAllAsRead()
              }
              disabled={isMarkingAll}
            >
              {isMarkingAll ? (
                <LoaderCircle
                  size={16}
                  className="notificationsSpin"
                />
              ) : (
                <CheckCheck size={16} />
              )}

              {isMarkingAll
                ? "Marking..."
                : "Mark all as read"}
            </button>
          )}

        </div>

        {/* =====================================================
            ERROR
        ====================================================== */}

        {error && (
          <div className="notificationsError">
            <AlertCircle size={18} />

            <span>{error}</span>

            <button
              type="button"
              onClick={() =>
                void fetchNotifications()
              }
            >
              Try again
            </button>
          </div>
        )}

        {/* =====================================================
            LOADING
        ====================================================== */}

        {isLoading ? (
          <div className="notificationsLoading">

            <LoaderCircle
              size={32}
              className="notificationsSpin"
            />

            <p>
              Loading notifications...
            </p>

          </div>
        ) : filteredNotifications.length ===
          0 ? (
          /* =================================================
             EMPTY
          ================================================== */

          <div className="notificationsEmpty">

            <div className="notificationsEmptyIcon">
              <Bell size={30} />
            </div>

            <h2>
              {filter === "unread"
                ? "No unread notifications"
                : "No notifications yet"}
            </h2>

            <p>
              {filter === "unread"
                ? "You're all caught up."
                : "We'll show important updates here when they become available."}
            </p>

            {filter === "unread" && (
              <button
                type="button"
                onClick={() =>
                  setFilter("all")
                }
              >
                View all notifications
              </button>
            )}

          </div>
        ) : (
          /* =================================================
             NOTIFICATION LIST
          ================================================== */

          <section className="notificationsList">

            {filteredNotifications.map(
              (notification) => (
                <article
                  key={notification._id}
                  className={
                    notification.isRead
                      ? "notificationPageItem read"
                      : "notificationPageItem unread"
                  }
                  onClick={() =>
                    void markAsRead(
                      notification,
                    )
                  }
                >

                  <div className="notificationPageIcon">
                    <Bell size={19} />
                  </div>

                  <div className="notificationPageContent">

                    <div className="notificationPageTop">

                      <h2>
                        {notification.title}
                      </h2>

                      {!notification.isRead && (
                        <span className="notificationUnreadLabel">
                          New
                        </span>
                      )}

                    </div>

                    <p>
                      {notification.message}
                    </p>

                    <div className="notificationPageMeta">

                      <span>
                        <Clock3 size={14} />

                        {formatRelativeDate(
                          notification.createdAt,
                        )}
                      </span>

                      <span>
                        {formatNotificationDate(
                          notification.createdAt,
                        )}
                      </span>

                    </div>

                  </div>

                  <div className="notificationPageAction">

                    {notification.isRead ? (
                      <Check
                        size={17}
                        aria-label="Read"
                      />
                    ) : (
                      <span className="notificationPageDot" />
                    )}

                    {notification.link && (
                      <ChevronRight
                        size={19}
                      />
                    )}

                  </div>

                </article>
              ),
            )}

          </section>
        )}

      </div>
      </main>

      <Footer />
    </>
  );
}