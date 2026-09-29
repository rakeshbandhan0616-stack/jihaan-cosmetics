import {
  ChevronDown,
  ChevronRight,
  LoaderCircle,
  Search,
  ShoppingBag,
  Bell,
  UserRound,
  LogOut,
  User,
  Package,
  X,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import type {
  ChangeEvent,
  FormEvent,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import styles from "./MainHeader.module.css";

import jihaanLogo from "../../../assets/images/jihaan-logo.jpeg";

/* =========================================================
   TYPES
========================================================= */

type Category = {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  image?: string;
  description?: string;
  isActive?: boolean;
  parentCategory?: string;
  sortOrder?: number;
};

type Product = {
  _id: string;
  name: string;
  slug?: string;
  image?: string;
  images?: string[];
  price?: number;
  oldPrice?: number;
  brand?: string;
};

type CurrentUser = {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  role?: string;
  profileImage?: string;
  isActive?: boolean;
};

type CategoryResponse = {
  success?: boolean;
  data?: Category[];
  categories?: Category[];
  message?: string;
};

type ProductResponse = {
  success?: boolean;
  products?: Product[];
  data?: Product[];
  message?: string;
};

type CartResponse = {
  success?: boolean;
  message?: string;
  cart?: {
    items?: Array<{
      quantity?: number;
    }>;
    totalItems?: number;
  };
};

type NotificationItem = {
  _id: string;
  title: string;
  message: string;
  link?: string;
  isActive?: boolean;
  isRead?: boolean;
  createdAt: string;
};

type NotificationResponse = {
  success?: boolean;
  message?: string;
  notifications?: NotificationItem[];
  data?: NotificationItem[];
  count?: number;
  unreadCount?: number;
};

/* =========================================================
   API
========================================================= */

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/+$/, "");

const SERVER_URL =
  API_BASE_URL.replace(/\/api\/?$/, "");

const AUTH_TOKEN_STORAGE_KEY =
  "jihaan_auth_token";

const CURRENT_USER_STORAGE_KEY =
  "jihaan_current_user";

/* =========================================================
   HELPERS
========================================================= */

function getImageUrl(image?: string): string {
  if (!image) {
    return jihaanLogo;
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  if (image.startsWith("/")) {
    return `${SERVER_URL}${image}`;
  }

  return `${SERVER_URL}/${image}`;
}

function getProductImage(
  product: Product,
): string {
  return (
    product.image ||
    product.images?.[0] ||
    ""
  );
}

function getCategoryId(
  category: Category,
): string {
  return String(
    category._id ||
      category.id ||
      category.slug ||
      category.name,
  );
}

function getCategorySlug(
  category: Category,
): string {
  if (category.slug) {
    return category.slug;
  }

  return category.name
    .trim()
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* =========================================================
   COMPONENT
========================================================= */

function MainHeader() {
  const navigate = useNavigate();

  const searchRef =
    useRef<HTMLDivElement | null>(null);

  const accountRef =
    useRef<HTMLDivElement | null>(null);

  const notificationRef =
    useRef<HTMLDivElement | null>(null);

  const searchRequestRef =
    useRef<AbortController | null>(null);

  const searchTimerRef =
    useRef<number | null>(null);

  /* -------------------------------------------------------
     CATEGORY STATE
  ------------------------------------------------------- */

  const [categories, setCategories] =
    useState<Category[]>([]);

  const [categoriesLoading, setCategoriesLoading] =
    useState(true);

  /* -------------------------------------------------------
     SEARCH STATE
  ------------------------------------------------------- */

  const [searchValue, setSearchValue] =
    useState("");

  const [searchResults, setSearchResults] =
    useState<Product[]>([]);

  const [isSearchOpen, setIsSearchOpen] =
    useState(false);

  const [isSearching, setIsSearching] =
    useState(false);

  /* -------------------------------------------------------
     ACCOUNT STATE
  ------------------------------------------------------- */

  const [currentUser, setCurrentUser] =
    useState<CurrentUser | null>(null);

  const [isAccountOpen, setIsAccountOpen] =
    useState(false);

  /* -------------------------------------------------------
     NOTIFICATION STATE
  ------------------------------------------------------- */

  const [notifications, setNotifications] =
    useState<NotificationItem[]>([]);

  const [notificationCount, setNotificationCount] =
    useState(0);

  const [isNotificationOpen, setIsNotificationOpen] =
    useState(false);

  const [notificationsLoading, setNotificationsLoading] =
    useState(false);

  /* -------------------------------------------------------
     MOBILE MENU
  ------------------------------------------------------- */

  const [isMobileMenuOpen, setIsMobileMenuOpen] =
    useState(false);

  const [isCategoryMenuOpen, setIsCategoryMenuOpen] =
    useState(false);

  /* -------------------------------------------------------
     CART
  ------------------------------------------------------- */

  const [cartCount, setCartCount] =
    useState(0);

  /* =======================================================
     FETCH CATEGORIES
  ======================================================= */

  useEffect(() => {
    let mounted = true;

    const fetchCategories = async () => {
      try {
        setCategoriesLoading(true);

        const response = await fetch(
          `${API_BASE_URL}/categories`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          },
        );

        const data =
          (await response
            .json()
            .catch(() => ({}))) as CategoryResponse;

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load categories.",
          );
        }

        const receivedCategories =
          Array.isArray(data.data)
            ? data.data
            : Array.isArray(data.categories)
              ? data.categories
              : [];

        const activeCategories =
          receivedCategories
            .filter(
              (category) =>
                category.isActive !== false,
            )
            .sort(
              (a, b) =>
                Number(a.sortOrder || 0) -
                Number(b.sortOrder || 0),
            );

        if (mounted) {
          setCategories(activeCategories);
        }
      } catch (error) {
        console.error(
          "Header category error:",
          error,
        );

        if (mounted) {
          setCategories([]);
        }
      } finally {
        if (mounted) {
          setCategoriesLoading(false);
        }
      }
    };

    void fetchCategories();

    return () => {
      mounted = false;
    };
  }, []);

  /* =======================================================
     CATEGORY CLICK
  ======================================================= */

  const handleCategoryClick = (
    category: Category,
  ) => {
    const slug =
      getCategorySlug(category);

    setIsMobileMenuOpen(false);
    setIsCategoryMenuOpen(false);

    navigate(
      `/category/${encodeURIComponent(slug)}`,
    );
  };

  /* =======================================================
     OPEN SEARCH
  ======================================================= */

  const openSearch = () => {
    setIsSearchOpen(true);

    window.setTimeout(() => {
      const input =
        document.querySelector(
          `.${styles.searchInput}`,
        ) as HTMLInputElement | null;

      input?.focus();
    }, 50);
  };

  /* =======================================================
     CLOSE SEARCH
  ======================================================= */

  const closeSearch = () => {
    searchRequestRef.current?.abort();

    if (searchTimerRef.current !== null) {
      window.clearTimeout(
        searchTimerRef.current,
      );

      searchTimerRef.current = null;
    }

    setIsSearchOpen(false);
    setSearchResults([]);
    setIsSearching(false);
  };

  /* =======================================================
     SEARCH SUBMIT
  ======================================================= */

  const handleSearch = (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const query =
      searchValue.trim();

    if (!query) {
      return;
    }

    closeSearch();

    setSearchValue("");

    navigate(
      `/search?q=${encodeURIComponent(query)}`,
    );
  };

  /* =======================================================
     LIVE PRODUCT SEARCH
  ======================================================= */

  const searchProducts = async (
    query: string,
  ) => {
    const trimmedQuery =
      query.trim();

    if (!trimmedQuery) {
      searchRequestRef.current?.abort();

      setSearchResults([]);
      setIsSearching(false);

      return;
    }

    searchRequestRef.current?.abort();

    const controller =
      new AbortController();

    searchRequestRef.current =
      controller;

    setIsSearching(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/products?search=${encodeURIComponent(
          trimmedQuery,
        )}`,
        {
          method: "GET",

          headers: {
            Accept:
              "application/json",
          },

          signal:
            controller.signal,
        },
      );

      const data =
        (await response
          .json()
          .catch(() => ({}))) as ProductResponse;

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to search products.",
        );
      }

      const products =
        Array.isArray(data.products)
          ? data.products
          : Array.isArray(data.data)
            ? data.data
            : [];

      if (
        !controller.signal.aborted
      ) {
        setSearchResults(
          products.slice(0, 8),
        );
      }
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === "AbortError"
      ) {
        return;
      }

      console.error(
        "Product search error:",
        error,
      );

      if (
        !controller.signal.aborted
      ) {
        setSearchResults([]);
      }
    } finally {
      if (
        !controller.signal.aborted
      ) {
        setIsSearching(false);
      }
    }
  };

  /* =======================================================
     SEARCH INPUT
  ======================================================= */

  const handleSearchChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const value =
      event.target.value;

    setSearchValue(value);

    if (
      searchTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        searchTimerRef.current,
      );

      searchTimerRef.current = null;
    }

    const trimmedValue =
      value.trim();

    if (!trimmedValue) {
      searchRequestRef.current?.abort();

      setSearchResults([]);
      setIsSearching(false);

      return;
    }

    setIsSearching(true);

    searchTimerRef.current =
      window.setTimeout(() => {
        void searchProducts(
          trimmedValue,
        );
      }, 280);
  };

  /* =======================================================
     CLICK SEARCH RESULT
  ======================================================= */

  const handleProductClick = (
    product: Product,
  ) => {
    searchRequestRef.current?.abort();

    if (
      searchTimerRef.current !==
      null
    ) {
      window.clearTimeout(
        searchTimerRef.current,
      );

      searchTimerRef.current = null;
    }

    setIsSearchOpen(false);
    setSearchResults([]);
    setSearchValue("");

    if (product.slug) {
      navigate(
        `/product/${product.slug}`,
      );

      return;
    }

    navigate(
      `/product/${product._id}`,
    );
  };

  /* =======================================================
     LOAD USER
  ======================================================= */

  const loadCurrentUser = () => {
    try {
      const savedUser =
        localStorage.getItem(
          CURRENT_USER_STORAGE_KEY,
        );

      if (!savedUser) {
        setCurrentUser(null);
        return;
      }

      const parsedUser =
        JSON.parse(
          savedUser,
        ) as CurrentUser;

      setCurrentUser(
        parsedUser,
      );
    } catch {
      localStorage.removeItem(
        CURRENT_USER_STORAGE_KEY,
      );

      setCurrentUser(null);
    }
  };

  /* =======================================================
     CART COUNT
  ======================================================= */

  const updateCartCount =
    async (): Promise<void> => {
      const token =
        localStorage.getItem(
          AUTH_TOKEN_STORAGE_KEY,
        );

      if (!token) {
        setCartCount(0);
        return;
      }

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/cart`,
            {
              method: "GET",

              headers: {
                Accept:
                  "application/json",

                Authorization:
                  `Bearer ${token}`,
              },

              credentials:
                "include",
            },
          );

        const data =
          (await response
            .json()
            .catch(() => ({}))) as CartResponse;

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to load cart.",
          );
        }

        const total =
          Number(
            data.cart
              ?.totalItems || 0,
          );

        setCartCount(total);
      } catch (error) {
        console.error(
          "Cart count error:",
          error,
        );

        setCartCount(0);
      }
    };

  /* =======================================================
     NOTIFICATIONS
  ======================================================= */

  const fetchNotifications = async (
    showList = false,
  ) => {
    const token = localStorage.getItem(
      AUTH_TOKEN_STORAGE_KEY,
    );

    if (!token) {
      setNotifications([]);
      setNotificationCount(0);
      return;
    }

    try {
      if (showList) {
        setNotificationsLoading(true);
      }

      const [countResponse, listResponse] =
        await Promise.all([
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
          showList
            ? fetch(
                `${API_BASE_URL}/notifications`,
                {
                  method: "GET",
                  headers: {
                    Accept:
                      "application/json",
                    Authorization: `Bearer ${token}`,
                  },
                  credentials: "include",
                },
              )
            : Promise.resolve(null),
        ]);

      const countData =
        (await countResponse
          .json()
          .catch(() => ({}))) as NotificationResponse;

      if (countResponse.ok) {
        setNotificationCount(
          Number(
            countData.unreadCount ??
              countData.count ??
              0,
          ),
        );
      }

      if (listResponse) {
        const listData =
          (await listResponse
            .json()
            .catch(() => ({}))) as NotificationResponse;

        if (listResponse.ok) {
          const received =
            Array.isArray(
              listData.notifications,
            )
              ? listData.notifications
              : Array.isArray(listData.data)
                ? listData.data
                : [];

          setNotifications(
            received.filter(
              (notification) =>
                notification.isActive !== false,
            ),
          );
        }
      }
    } catch (error) {
      console.error(
        "Notification fetch error:",
        error,
      );
    } finally {
      if (showList) {
        setNotificationsLoading(false);
      }
    }
  };

  const toggleNotifications = async () => {
    if (!currentUser) {
      navigate("/login");
      return;
    }

    const nextOpen =
      !isNotificationOpen;

    setIsNotificationOpen(nextOpen);
    setIsAccountOpen(false);

    if (nextOpen) {
      await fetchNotifications(true);
    }
  };

  const markNotificationAsRead = async (
    notification: NotificationItem,
  ) => {
    const token = localStorage.getItem(
      AUTH_TOKEN_STORAGE_KEY,
    );

    if (!token) {
      return;
    }

    try {
      if (!notification.isRead) {
        await fetch(
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

        setNotificationCount(
          (previous) =>
            Math.max(0, previous - 1),
        );
      }

      setIsNotificationOpen(false);

      if (notification.link?.trim()) {
        const link =
          notification.link.trim();

        if (/^https?:\/\//i.test(link)) {
          window.location.href = link;
        } else {
          navigate(link);
        }
      }
    } catch (error) {
      console.error(
        "Notification read error:",
        error,
      );
    }
  };

  const markAllNotificationsAsRead =
    async () => {
      const token = localStorage.getItem(
        AUTH_TOKEN_STORAGE_KEY,
      );

      if (!token || notificationCount === 0) {
        return;
      }

      try {
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
            "Unable to mark notifications as read.",
          );
        }

        setNotifications((previous) =>
          previous.map((item) => ({
            ...item,
            isRead: true,
          })),
        );

        setNotificationCount(0);
      } catch (error) {
        console.error(
          "Mark all notifications error:",
          error,
        );
      }
    };

  const formatNotificationDate = (
    value: string,
  ) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return "";
    }

    return date.toLocaleDateString(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
      },
    );
  };

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout =
    async () => {
      const token =
        localStorage.getItem(
          AUTH_TOKEN_STORAGE_KEY,
        );

      try {
        await fetch(
          `${API_BASE_URL}/auth/logout`,
          {
            method: "POST",

            headers: token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : undefined,

            credentials:
              "include",
          },
        );
      } catch (error) {
        console.error(
          "Logout error:",
          error,
        );
      } finally {
        localStorage.removeItem(
          AUTH_TOKEN_STORAGE_KEY,
        );

        localStorage.removeItem(
          CURRENT_USER_STORAGE_KEY,
        );

        setCurrentUser(null);
        setCartCount(0);
        setNotifications([]);
        setNotificationCount(0);
        setIsAccountOpen(false);
        setIsNotificationOpen(false);

        navigate("/login", {
          replace: true,
        });
      }
    };

  /* =======================================================
     INITIAL EVENTS
  ======================================================= */

  useEffect(() => {
    loadCurrentUser();

    void updateCartCount();
    void fetchNotifications();

    const handleStorage =
      () => {
        loadCurrentUser();
        void updateCartCount();
        void fetchNotifications();
      };

    const handleCartUpdated =
      () => {
        void updateCartCount();
      };

    window.addEventListener(
      "storage",
      handleStorage,
    );

    window.addEventListener(
      "cartUpdated",
      handleCartUpdated,
    );

    return () => {
      window.removeEventListener(
        "storage",
        handleStorage,
      );

      window.removeEventListener(
        "cartUpdated",
        handleCartUpdated,
      );
    };
  }, []);

  /* =======================================================
     CLICK OUTSIDE
  ======================================================= */

  useEffect(() => {
    const handleDocumentClick =
      (event: MouseEvent) => {
        const target =
          event.target as Node;

        if (
          searchRef.current &&
          !searchRef.current.contains(
            target,
          )
        ) {
          closeSearch();
        }

        if (
          accountRef.current &&
          !accountRef.current.contains(
            target,
          )
        ) {
          setIsAccountOpen(false);
        }

        if (
          notificationRef.current &&
          !notificationRef.current.contains(
            target,
          )
        ) {
          setIsNotificationOpen(false);
        }
      };

    document.addEventListener(
      "mousedown",
      handleDocumentClick,
    );

    return () => {
      document.removeEventListener(
        "mousedown",
        handleDocumentClick,
      );
    };
  }, []);

  /* =======================================================
     CLEANUP
  ======================================================= */

  useEffect(() => {
    return () => {
      searchRequestRef.current?.abort();

      if (
        searchTimerRef.current !==
        null
      ) {
        window.clearTimeout(
          searchTimerRef.current,
        );
      }
    };
  }, []);

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <header className={styles.header}>
      <div
        className={
          styles.headerInner
        }
      >
        {/* =================================================
            LOGO
        ================================================= */}

        <Link
          to="/"
          className={styles.logo}
          aria-label="Jihaan Cosmetics home"
        >
          <img
            src={jihaanLogo}
            alt="Jihaan Cosmetics"
            className={
              styles.logoImage
            }
          />

          <span
            className={
              styles.logoText
            }
          >
            <span
              className={
                styles.logoMain
              }
            >
              JINI
            </span>

            <span
              className={
                styles.logoSub
              }
            >
              COSMETICS
            </span>
          </span>
        </Link>

        {/* =================================================
            CATEGORY NAVIGATION
        ================================================= */}

        <nav
          className={
            styles.desktopNavigation
          }
          aria-label="Product categories"
        >
          {categoriesLoading ? (
            <div
              className={
                styles.categoryLoading
              }
            >
              <LoaderCircle
                size={15}
                className={
                  styles.loadingIcon
                }
              />
            </div>
          ) : (
            <div
              className={
                styles.categoryScroller
              }
            >
              {categories.map(
                (category) => (
                  <button
                    type="button"
                    key={getCategoryId(
                      category,
                    )}
                    className={
                      styles.navLink
                    }
                    onClick={() =>
                      handleCategoryClick(
                        category,
                      )
                    }
                  >
                    {category.name}
                  </button>
                ),
              )}

              {/* <button
                type="button"
                className={`${styles.navLink} ${styles.offerNavLink}`}
                onClick={() =>
                  navigate(
                    "/offers",
                  )
                }
              >
                OFFERS
              </button> */}
            </div>
          )}
        </nav>

        {/* =================================================
            SEARCH
        ================================================= */}

        <div
          className={`${styles.searchContainer} ${
            isSearchOpen ? styles.mobileSearchOpen : ""
          }`}
          ref={searchRef}
        >
          {!isSearchOpen ? (
            <button
              type="button"
              className={
                styles.searchIconButton
              }
              onClick={openSearch}
              aria-label="Search products"
              title="Search"
            >
              <Search
                size={23}
                strokeWidth={1.7}
              />
            </button>
          ) : (
            <form
              className={
                styles.searchForm
              }
              onSubmit={
                handleSearch
              }
              role="search"
            >
              <Search
                size={19}
                className={
                  styles.searchInputIcon
                }
              />

              <input
                type="search"
                className={
                  styles.searchInput
                }
                value={searchValue}
                onChange={
                  handleSearchChange
                }
                autoFocus
                placeholder="Search products..."
                aria-label="Search products"
              />

              <button
                type="button"
                className={
                  styles.closeSearchButton
                }
                onClick={() => {
                  setSearchValue("");
                  closeSearch();
                }}
                aria-label="Close search"
              >
                <X size={18} />
              </button>
            </form>
          )}

          {/* =================================================
              SEARCH RESULTS
          ================================================= */}

          {isSearchOpen && (
            <div
              className={
                styles.searchDropdown
              }
            >
              {isSearching && (
                <div
                  className={
                    styles.searchStatus
                  }
                >
                  <LoaderCircle
                    size={17}
                    className={
                      styles.loadingIcon
                    }
                  />

                  Searching products...
                </div>
              )}

              {!isSearching &&
                searchValue.trim() &&
                searchResults.length ===
                  0 && (
                  <div
                    className={
                      styles.searchStatus
                    }
                  >
                    No products found.
                  </div>
                )}

              {!isSearching &&
                searchResults.length >
                  0 && (
                  <>
                    <div
                      className={
                        styles.searchResultTitle
                      }
                    >
                      PRODUCTS
                    </div>

                    {searchResults.map(
                      (product) => (
                        <button
                          type="button"
                          key={
                            product._id
                          }
                          className={
                            styles.searchResult
                          }
                          onClick={() =>
                            handleProductClick(
                              product,
                            )
                          }
                        >
                          <img
                            src={getImageUrl(
                              getProductImage(
                                product,
                              ),
                            )}
                            alt={
                              product.name
                            }
                            className={
                              styles.searchResultImage
                            }
                          />

                          <span
                            className={
                              styles.searchResultDetails
                            }
                          >
                            <strong>
                              {
                                product.name
                              }
                            </strong>

                            {product.brand && (
                              <small>
                                {
                                  product.brand
                                }
                              </small>
                            )}

                            {typeof product.price ===
                              "number" && (
                              <span
                                className={
                                  styles.searchResultPrice
                                }
                              >
                                ₹
                                {product.price.toLocaleString(
                                  "en-IN",
                                )}
                              </span>
                            )}
                          </span>

                          <ChevronRight
                            size={17}
                          />
                        </button>
                      ),
                    )}

                    <button
                      type="button"
                      className={
                        styles.viewAllResults
                      }
                      onClick={() => {
                        const query =
                          searchValue.trim();

                        if (!query) {
                          return;
                        }

                        closeSearch();

                        setSearchValue("");

                        navigate(
                          `/search?q=${encodeURIComponent(
                            query,
                          )}`,
                        );
                      }}
                    >
                      View all results
                      <ChevronRight
                        size={17}
                      />
                    </button>
                  </>
                )}
            </div>
          )}
        </div>

        {/* =================================================
            ACTIONS
        ================================================= */}

        <div
          className={styles.actions}
        >
          <button
            type="button"
            className={
              styles.mobileSearchButton
            }
            onClick={openSearch}
            aria-label="Search"
          >
            <Search
              size={22}
              strokeWidth={1.7}
            />
          </button>

          {/* NOTIFICATIONS */}

          <div
            className={styles.notificationContainer}
            ref={notificationRef}
          >
            <button
              type="button"
              className={styles.iconButton}
              onClick={() =>
                void toggleNotifications()
              }
              aria-label={
                currentUser
                  ? `Notifications${
                      notificationCount > 0
                        ? `, ${notificationCount} unread`
                        : ""
                    }`
                  : "Login to view notifications"
              }
              title={
                currentUser
                  ? "Notifications"
                  : "Login to view notifications"
              }
              aria-expanded={
                isNotificationOpen
              }
            >
              <span
                className={
                  styles.notificationIconWrapper
                }
              >
                <Bell
                  size={22}
                  strokeWidth={1.7}
                />

                {currentUser &&
                  notificationCount > 0 && (
                    <span
                      className={
                        styles.notificationBadge
                      }
                    >
                      {notificationCount > 99
                        ? "99+"
                        : notificationCount}
                    </span>
                  )}
              </span>
            </button>

            {isNotificationOpen &&
              currentUser && (
                <div
                  className={
                    styles.notificationDropdown
                  }
                >
                  <div
                    className={
                      styles.notificationDropdownHeader
                    }
                  >
                    <div>
                      <strong>
                        Notifications
                      </strong>

                      <span>
                        {notificationCount > 0
                          ? `${notificationCount} unread`
                          : "All caught up"}
                      </span>
                    </div>

                    {notificationCount > 0 && (
                      <button
                        type="button"
                        className={
                          styles.markAllReadButton
                        }
                        onClick={() =>
                          void markAllNotificationsAsRead()
                        }
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  <div
                    className={
                      styles.notificationList
                    }
                  >
                    {notificationsLoading ? (
                      <div
                        className={
                          styles.notificationState
                        }
                      >
                        <LoaderCircle
                          size={19}
                          className={
                            styles.loadingIcon
                          }
                        />
                        Loading notifications...
                      </div>
                    ) : notifications.length ===
                      0 ? (
                      <div
                        className={
                          styles.notificationState
                        }
                      >
                        <Bell size={24} />
                        <span>
                          No notifications
                        </span>
                      </div>
                    ) : (
                      notifications.map(
                        (notification) => (
                          <button
                            type="button"
                            key={
                              notification._id
                            }
                            className={`${styles.notificationItem} ${
                              notification.isRead
                                ? styles.notificationRead
                                : styles.notificationUnread
                            }`}
                            onClick={() =>
                              void markNotificationAsRead(
                                notification,
                              )
                            }
                          >
                            <span
                              className={
                                styles.notificationItemIcon
                              }
                            >
                              <Bell
                                size={16}
                              />
                            </span>

                            <span
                              className={
                                styles.notificationItemContent
                              }
                            >
                              <strong>
                                {
                                  notification.title
                                }
                              </strong>

                              <span>
                                {
                                  notification.message
                                }
                              </span>

                              <small>
                                {formatNotificationDate(
                                  notification.createdAt,
                                )}
                              </small>
                            </span>

                            {!notification.isRead && (
                              <span
                                className={
                                  styles.notificationUnreadDot
                                }
                              />
                            )}
                          </button>
                        ),
                      )
                    )}
                  </div>

                  <div
                    className={
                      styles.notificationDropdownFooter
                    }
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setIsNotificationOpen(
                          false,
                        );
                        navigate(
                          "/notifications",
                        );
                      }}
                    >
                      View notifications
                    </button>
                  </div>
                </div>
              )}
          </div>

          {/* ACCOUNT */}

          <div
            className={
              styles.accountContainer
            }
            ref={accountRef}
          >
            <button
              type="button"
              className={
                styles.iconButton
              }
              onClick={() =>
                setIsAccountOpen(
                  (previous) =>
                    !previous,
                )
              }
              aria-label={
                currentUser
                  ? "Account"
                  : "Login"
              }
              aria-expanded={
                isAccountOpen
              }
            >
              {currentUser ? (
                <img
                  src={getImageUrl(
                    currentUser.profileImage,
                  )}
                  alt={
                    currentUser.name
                  }
                  className={
                    styles.profileImage
                  }
                />
              ) : (
                <UserRound
                  size={22}
                  strokeWidth={1.7}
                />
              )}
            </button>

            {isAccountOpen && (
              <div
                className={
                  styles.accountDropdown
                }
              >
                {currentUser ? (
                  <>
                    <div
                      className={
                        styles.accountHeader
                      }
                    >
                      <img
                        src={getImageUrl(
                          currentUser.profileImage,
                        )}
                        alt={
                          currentUser.name
                        }
                        className={
                          styles.dropdownProfileImage
                        }
                      />

                      <div>
                        <strong>
                          {
                            currentUser.name
                          }
                        </strong>

                        <span>
                          {
                            currentUser.email
                          }
                        </span>
                      </div>
                    </div>

                    <div
                      className={
                        styles.dropdownDivider
                      }
                    />

                    <Link
                      to="/account"
                      className={
                        styles.dropdownItem
                      }
                      onClick={() =>
                        setIsAccountOpen(
                          false,
                        )
                      }
                    >
                      <User
                        size={17}
                      />
                      My account
                    </Link>

                    <Link
                      to="/orders"
                      className={
                        styles.dropdownItem
                      }
                      onClick={() =>
                        setIsAccountOpen(
                          false,
                        )
                      }
                    >
                      <Package
                        size={17}
                      />
                      My orders
                    </Link>

                    <button
                      type="button"
                      className={`${styles.dropdownItem} ${styles.logoutItem}`}
                      onClick={
                        handleLogout
                      }
                    >
                      <LogOut
                        size={17}
                      />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className={
                        styles.accountHeader
                      }
                    >
                      <div
                        className={
                          styles.defaultAccountIcon
                        }
                      >
                        <UserRound
                          size={23}
                        />
                      </div>

                      <div>
                        <strong>
                          Welcome to
                          Jini-Cosmetics
                        </strong>

                        <span>
                          Login to manage
                          your account
                        </span>
                      </div>
                    </div>

                    <div
                      className={
                        styles.dropdownDivider
                      }
                    />

                    <Link
                      to="/login"
                      className={
                        styles.dropdownPrimaryButton
                      }
                      onClick={() =>
                        setIsAccountOpen(
                          false,
                        )
                      }
                    >
                      Login
                    </Link>

                    <Link
                      to="/register"
                      className={
                        styles.dropdownSecondaryButton
                      }
                      onClick={() =>
                        setIsAccountOpen(
                          false,
                        )
                      }
                    >
                      Create an account
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          {/* CART */}

          <button
            type="button"
            className={
              styles.iconButton
            }
            onClick={() =>
              navigate("/cart")
            }
            aria-label={`Cart with ${cartCount} items`}
            title="Cart"
          >
            <span
              className={
                styles.cartIconWrapper
              }
            >
              <ShoppingBag
                size={23}
                strokeWidth={1.7}
              />

              {cartCount > 0 && (
                <span
                  className={
                    styles.cartBadge
                  }
                >
                  {cartCount > 99
                    ? "99+"
                    : cartCount}
                </span>
              )}
            </span>
          </button>

          {/* MOBILE MENU */}

          <button
            type="button"
            className={
              styles.menuButton
            }
            onClick={() =>
              setIsMobileMenuOpen(
                (previous) =>
                  !previous,
              )
            }
            aria-label="Open menu"
            aria-expanded={
              isMobileMenuOpen
            }
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* ===================================================
          MOBILE MENU
      =================================================== */}

      {isMobileMenuOpen && (
        <div
          className={
            styles.mobileMenu
          }
        >
          <div
            className={
              styles.mobileMenuInner
            }
          >
            <button
              type="button"
              className={
                styles.mobileHomeLink
              }
              onClick={() => {
                navigate("/");
                setIsMobileMenuOpen(
                  false,
                );
              }}
            >
              HOME
            </button>

            <div
              className={
                styles.mobileCategoryHeader
              }
            >
              <span>
                CATEGORIES
              </span>

              <button
                type="button"
                onClick={() =>
                  setIsCategoryMenuOpen(
                    (previous) =>
                      !previous,
                  )
                }
              >
                <ChevronDown
                  size={18}
                  className={
                    isCategoryMenuOpen
                      ? styles.rotateChevron
                      : ""
                  }
                />
              </button>
            </div>

            {isCategoryMenuOpen && (
              <div
                className={
                  styles.mobileCategoryList
                }
              >
                {categories.map(
                  (category) => (
                    <button
                      type="button"
                      key={getCategoryId(
                        category,
                      )}
                      onClick={() =>
                        handleCategoryClick(
                          category,
                        )
                      }
                    >
                      {
                        category.name
                      }

                      <ChevronRight
                        size={15}
                      />
                    </button>
                  ),
                )}
              </div>
            )}

            <button
              type="button"
              className={
                styles.mobileHomeLink
              }
              onClick={() => {
                navigate(
                  "/offers",
                );

                setIsMobileMenuOpen(
                  false,
                );
              }}
            >
              OFFERS
            </button>

            <button
              type="button"
              className={
                styles.mobileHomeLink
              }
              onClick={() => {
                navigate(
                  "/under-249",
                );

                setIsMobileMenuOpen(
                  false,
                );
              }}
            >
              UNDER ₹249
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

export default MainHeader;
