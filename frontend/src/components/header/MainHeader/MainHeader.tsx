import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
} from "react";
import {
  Search,
  ShoppingBag,
  UserRound,
  ChevronRight,
  LogOut,
  User,
  Package,
  LoaderCircle,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import styles from "./MainHeader.module.css";
import jihaanLogo from "../../../assets/images/jihaan-logo.jpeg";

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

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
).replace(/\/+$/, "");

const SERVER_URL = API_BASE_URL.replace(/\/api\/?$/, "");

const AUTH_TOKEN_STORAGE_KEY = "jihaan_auth_token";
const CURRENT_USER_STORAGE_KEY = "jihaan_current_user";

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

function getProductImage(product: Product): string {
  return product.image || product.images?.[0] || "";
}

function MainHeader() {
  const navigate = useNavigate();

  const searchRef = useRef<HTMLDivElement | null>(null);
  const accountRef = useRef<HTMLDivElement | null>(null);
  const searchRequestRef = useRef<AbortController | null>(null);
  const searchTimerRef = useRef<number | null>(null);

  const [searchValue, setSearchValue] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const [currentUser, setCurrentUser] = useState<CurrentUser | null>(null);
  const [isAccountOpen, setIsAccountOpen] = useState(false);

  const [cartCount, setCartCount] = useState(0);

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const query = searchValue.trim();

    if (!query) {
      return;
    }

    setIsSearchOpen(false);

    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  const loadCurrentUser = () => {
    try {
      const savedUser = localStorage.getItem(
        CURRENT_USER_STORAGE_KEY,
      );

      if (!savedUser) {
        setCurrentUser(null);
        return;
      }

      const parsedUser = JSON.parse(savedUser) as CurrentUser;

      setCurrentUser(parsedUser);
    } catch {
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);
      setCurrentUser(null);
    }
  };

  const updateCartCount = async (): Promise<void> => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

    if (!token) {
      setCartCount(0);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/cart`, {
        method: "GET",
        headers: {
          Accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      const data = (await response
        .json()
        .catch(() => ({}))) as CartResponse;

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to load cart count.",
        );
      }

      const backendTotalItems = Number(
        data.cart?.totalItems || 0,
      );

      if (backendTotalItems > 0) {
        setCartCount(backendTotalItems);
        return;
      }

      const cartItems = Array.isArray(data.cart?.items)
        ? data.cart.items
        : [];

      const totalItems = cartItems.reduce(
        (total, item) => total + Number(item.quantity || 0),
        0,
      );

      setCartCount(totalItems);
    } catch (error) {
      console.error("Cart count error:", error);
      setCartCount(0);
    }
  };

  const searchProducts = async (query: string) => {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      searchRequestRef.current?.abort();
      setSearchResults([]);
      setIsSearching(false);
      setIsSearchOpen(false);
      return;
    }

    searchRequestRef.current?.abort();

    const controller = new AbortController();
    searchRequestRef.current = controller;

    setIsSearching(true);
    setIsSearchOpen(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/products?search=${encodeURIComponent(
          trimmedQuery,
        )}`,
        {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          signal: controller.signal,
        },
      );

      const data = (await response
        .json()
        .catch(() => ({}))) as ProductResponse;

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to search products.",
        );
      }

      const products = Array.isArray(data.products)
        ? data.products
        : Array.isArray(data.data)
          ? data.data
          : [];

      if (!controller.signal.aborted) {
        setSearchResults(products.slice(0, 8));
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      console.error("Product search error:", error);

      if (!controller.signal.aborted) {
        setSearchResults([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsSearching(false);
      }
    }
  };

  const handleSearchChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const value = event.target.value;

    setSearchValue(value);

    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }

    const trimmedValue = value.trim();

    if (!trimmedValue) {
      searchRequestRef.current?.abort();
      setSearchResults([]);
      setIsSearching(false);
      setIsSearchOpen(false);
      return;
    }

    setIsSearchOpen(true);
    setIsSearching(true);

    searchTimerRef.current = window.setTimeout(() => {
      void searchProducts(trimmedValue);
    }, 280);
  };

  const handleProductClick = (product: Product) => {
    searchRequestRef.current?.abort();

    if (searchTimerRef.current !== null) {
      window.clearTimeout(searchTimerRef.current);
      searchTimerRef.current = null;
    }

    setIsSearchOpen(false);
    setSearchResults([]);
    setSearchValue("");

    if (product.slug) {
      navigate(`/product/${product.slug}`);
      return;
    }

    navigate(`/product/${product._id}`);
  };

  const handleLogout = async () => {
    const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);

    try {
      await fetch(`${API_BASE_URL}/auth/logout`, {
        method: "POST",
        headers: token
          ? {
              Authorization: `Bearer ${token}`,
            }
          : undefined,
        credentials: "include",
      });
    } catch (error) {
      console.error("Logout request failed:", error);
    } finally {
      localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
      localStorage.removeItem(CURRENT_USER_STORAGE_KEY);

      setCurrentUser(null);
      setCartCount(0);
      setIsAccountOpen(false);

      navigate("/login", {
        replace: true,
        state: {
          message: "You have been logged out successfully.",
        },
      });
    }
  };

  useEffect(() => {
    loadCurrentUser();
    void updateCartCount();

    const handleStorageChange = () => {
      loadCurrentUser();
      void updateCartCount();
    };

    const handleCartUpdated = () => {
      void updateCartCount();
    };

    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("cartUpdated", handleCartUpdated);

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("cartUpdated", handleCartUpdated);
    };
  }, []);

  useEffect(() => {
    return () => {
      searchRequestRef.current?.abort();

      if (searchTimerRef.current !== null) {
        window.clearTimeout(searchTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as Node;

      if (
        searchRef.current &&
        !searchRef.current.contains(target)
      ) {
        setIsSearchOpen(false);
      }

      if (
        accountRef.current &&
        !accountRef.current.contains(target)
      ) {
        setIsAccountOpen(false);
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);

    return () => {
      document.removeEventListener(
        "mousedown",
        handleDocumentClick,
      );
    };
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <Link
          to="/"
          className={styles.logo}
          aria-label="Jini Cosmetics home"
        >
          <img
            src={jihaanLogo}
            alt="Jini Cosmetics logo"
            className={styles.logoImage}
          />

          <span className={styles.logoText}>
            <span className={styles.logoMain}>
              JINI COSMETICS
            </span>

            <span className={styles.logoSub}>
              BEAUTY. CARE. CONFIDENCE.
            </span>
          </span>
        </Link>

        <div className={styles.searchContainer} ref={searchRef}>
          <form
            className={styles.desktopSearch}
            onSubmit={handleSearch}
            role="search"
          >
            <Search size={18} strokeWidth={1.7} />

            <input
              type="search"
              value={searchValue}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchValue.trim()) {
                  setIsSearchOpen(true);
                }
              }}
              placeholder="Search for skincare, makeup, haircare..."
              aria-label="Search products"
            />

            <button type="submit" aria-label="Search">
              <Search size={18} strokeWidth={1.8} />
            </button>
          </form>

          {isSearchOpen && (
            <div className={styles.searchDropdown}>
              {isSearching && (
                <div className={styles.searchStatus}>
                  <LoaderCircle
                    size={17}
                    className={styles.loadingIcon}
                  />
                  Searching products...
                </div>
              )}

              {!isSearching &&
                searchResults.length === 0 &&
                searchValue.trim() && (
                  <div className={styles.searchStatus}>
                    No products found.
                  </div>
                )}

              {!isSearching &&
                searchResults.map((product) => (
                  <button
                    type="button"
                    key={product._id}
                    className={styles.searchResult}
                    onClick={() => handleProductClick(product)}
                  >
                    <img
                      src={getImageUrl(getProductImage(product))}
                      alt={product.name}
                      className={styles.searchResultImage}
                    />

                    <span className={styles.searchResultDetails}>
                      <strong>{product.name}</strong>

                      {product.brand && (
                        <small>{product.brand}</small>
                      )}

                      {typeof product.price === "number" && (
                        <span className={styles.searchResultPrice}>
                          ₹{product.price.toLocaleString("en-IN")}
                        </span>
                      )}
                    </span>

                    <ChevronRight size={17} />
                  </button>
                ))}

              {!isSearching && searchResults.length > 0 && (
                <button
                  type="button"
                  className={styles.viewAllResults}
                  onClick={() => {
                    const query = searchValue.trim();

                    if (!query) {
                      return;
                    }

                    searchRequestRef.current?.abort();

                    setIsSearchOpen(false);
                    setSearchResults([]);
                    setSearchValue("");

                    navigate(
                      `/search?q=${encodeURIComponent(query)}`,
                    );
                  }}
                >
                  View results
                  <ChevronRight size={17} />
                </button>
              )}
            </div>
          )}
        </div>

        <div className={styles.actions}>
          <div className={styles.accountContainer} ref={accountRef}>
            <button
              type="button"
              className={styles.actionButton}
              onClick={() =>
                setIsAccountOpen((previous) => !previous)
              }
              aria-label={
                currentUser
                  ? "Open account menu"
                  : "Login to your account"
              }
              aria-expanded={isAccountOpen}
              title={currentUser ? "Account" : "Login"}
            >
              {currentUser ? (
                <img
                  src={getImageUrl(currentUser.profileImage)}
                  alt={currentUser.name}
                  className={styles.profileImage}
                />
              ) : (
                <>
                  <UserRound size={23} strokeWidth={1.7} />
                  <span className={styles.actionLabel}>
                    Login
                  </span>
                </>
              )}
            </button>

            {isAccountOpen && (
              <div className={styles.accountDropdown}>
                {currentUser ? (
                  <>
                    <div className={styles.accountHeader}>
                      <img
                        src={getImageUrl(currentUser.profileImage)}
                        alt={currentUser.name}
                        className={styles.dropdownProfileImage}
                      />

                      <div>
                        <strong>{currentUser.name}</strong>
                        <span>{currentUser.email}</span>
                      </div>
                    </div>

                    <div className={styles.dropdownDivider} />

                    <Link
                      to="/account"
                      className={styles.dropdownItem}
                      onClick={() => setIsAccountOpen(false)}
                    >
                      <User size={17} />
                      My account
                    </Link>

                    <Link
                      to="/orders"
                      className={styles.dropdownItem}
                      onClick={() => setIsAccountOpen(false)}
                    >
                      <Package size={17} />
                      My orders
                    </Link>

                    <button
                      type="button"
                      className={`${styles.dropdownItem} ${styles.logoutItem}`}
                      onClick={handleLogout}
                    >
                      <LogOut size={17} />
                      Logout
                    </button>
                  </>
                ) : (
                  <>
                    <div className={styles.accountHeader}>
                      <div className={styles.defaultAccountIcon}>
                        <UserRound size={24} />
                      </div>

                      <div>
                        <strong>Welcome to Jihaan</strong>
                        <span>
                          Login to manage your account
                        </span>
                      </div>
                    </div>

                    <div className={styles.dropdownDivider} />

                    <Link
                      to="/login"
                      className={styles.dropdownPrimaryButton}
                      onClick={() => setIsAccountOpen(false)}
                    >
                      Login
                    </Link>

                    <Link
                      to="/register"
                      className={styles.dropdownSecondaryButton}
                      onClick={() => setIsAccountOpen(false)}
                    >
                      Create an account
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>

          <button
            type="button"
            className={styles.actionButton}
            onClick={() => navigate("/cart")}
            aria-label={`Open shopping cart with ${cartCount} items`}
          >
            <span className={styles.cartIconWrapper}>
              <ShoppingBag size={23} strokeWidth={1.7} />

              {cartCount > 0 && (
                <span className={styles.cartBadge}>
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </span>

            <span className={styles.actionLabel}>Cart</span>
          </button>
        </div>

        <button
          type="button"
          className={styles.mobileSearchButton}
          onClick={() => navigate("/search")}
          aria-label="Search products"
        >
          <Search size={23} strokeWidth={1.8} />
        </button>
      </div>
    </header>
  );
}

export default MainHeader;