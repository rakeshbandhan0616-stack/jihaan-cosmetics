import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MainHeader from "../../components/header/MainHeader/MainHeader";
import styles from "./CartPage.module.css";

type Product = {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  brand?: string;
  category?: string;
  slug?: string;
  price?: number;
  oldPrice?: number;
  salePrice?: number;
  discountPrice?: number;
  sellingPrice?: number;
  image?: string;
  images?: string[];
  thumbnail?: string;
  stock?: number;
  quantity?: number;
  isActive?: boolean;
  active?: boolean;
};

type CartItem = {
  _id?: string;
  id?: string;
  product?: Product | string | null;
  productId?: string;
  quantity?: number;
  size?: string;
  price?: number;
  subtotal?: number;
  image?: string;
  name?: string;
  title?: string;
  brand?: string;
  category?: string;
  slug?: string;
  stock?: number | null;
  isActive?: boolean;
};

type CartData = {
  id?: string | null;
  _id?: string;
  user?: string | null;
  items?: CartItem[];
  totalItems?: number;
  subtotal?: number;
};

type CartApiResponse = {
  success?: boolean;
  message?: string;
  cart?: CartData;
};

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "https://jihaan-cosmetics.onrender.com",
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

const getToken = (): string => {
  return (
    localStorage.getItem("jihaan_auth_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    ""
  );
};

const getProductId = (item: CartItem): string => {
  if (item.productId) {
    return String(item.productId);
  }

  if (typeof item.product === "string") {
    return item.product;
  }

  if (item.product && typeof item.product === "object") {
    return String(item.product._id || item.product.id || "");
  }

  return "";
};

const getProductName = (item: CartItem): string => {
  if (item.name?.trim()) {
    return item.name;
  }

  if (item.title?.trim()) {
    return item.title;
  }

  if (item.product && typeof item.product === "object") {
    return item.product.name || item.product.title || "Beauty Product";
  }

  return "Beauty Product";
};

const getProductImage = (item: CartItem): string => {
  let image = "";

  if (item.image?.trim()) {
    image = item.image;
  } else if (item.product && typeof item.product === "object") {
    image =
      item.product.image ||
      item.product.thumbnail ||
      item.product.images?.[0] ||
      "";
  }

  if (!image) {
    return "";
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  return `${API_BASE_URL}${image.startsWith("/") ? "" : "/"}${image}`;
};

const getProductPrice = (item: CartItem): number => {
  if (typeof item.price === "number") {
    return item.price;
  }

  if (item.product && typeof item.product === "object") {
    return Number(
      item.product.salePrice ??
        item.product.discountPrice ??
        item.product.sellingPrice ??
        item.product.price ??
        0,
    );
  }

  return 0;
};

const formatCurrency = (value: number): string => {
  return `₹${Number(value || 0).toLocaleString("en-IN")}`;
};

const getErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};

const normalizeCartItem = (item: CartItem): CartItem => {
  const product =
    item.product && typeof item.product === "object"
      ? item.product
      : {};

  const productId = getProductId(item);
  const quantity = Number(item.quantity || 1);
  const price = getProductPrice(item);

  return {
    ...item,
    id: item.id || `${productId}-${item.size || "Standard"}`,
    productId,
    name: item.name || product.name || product.title || "Beauty Product",
    title: item.title || product.title || product.name || "Beauty Product",
    brand: item.brand || product.brand || "",
    category: item.category || product.category || "",
    slug: item.slug || product.slug || "",
    image:
      item.image ||
      product.image ||
      product.thumbnail ||
      product.images?.[0] ||
      "",
    price,
    quantity,
    size: item.size || "Standard",
    subtotal: Number(item.subtotal ?? price * quantity),
    stock: item.stock ?? product.stock ?? null,
    isActive: item.isActive ?? product.isActive ?? true,
  };
};

const CartPage = () => {
  const navigate = useNavigate();

  const [cart, setCart] = useState<CartData>({
    items: [],
    totalItems: 0,
    subtotal: 0,
  });

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState("");
  const [error, setError] = useState("");

  const request = useCallback(
    async (
      endpoint: string,
      options: RequestInit = {},
    ): Promise<CartApiResponse> => {
      const token = getToken();

      if (!token) {
        throw new Error("Please login first to view your cart.");
      }

      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        credentials: "include",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(options.headers || {}),
        },
      });

      const data = (await response
        .json()
        .catch(() => ({}))) as CartApiResponse;

      if (!response.ok) {
        throw new Error(data.message || "Something went wrong.");
      }

      return data;
    },
    [],
  );

  const updateCartState = useCallback((cartData?: CartData) => {
    console.log("CART DATA RECEIVED:", cartData);
    console.log("CART ITEMS RECEIVED:", cartData?.items);

    const backendItems = Array.isArray(cartData?.items)
      ? cartData.items
      : [];

    const normalizedItems = backendItems.map(normalizeCartItem);

    setCart({
      id: cartData?.id || null,
      _id: cartData?._id,
      user: cartData?.user || null,
      items: normalizedItems,
      totalItems: Number(
        cartData?.totalItems ??
          normalizedItems.reduce(
            (total, item) => total + Number(item.quantity || 1),
            0,
          ),
      ),
      subtotal: Number(
        cartData?.subtotal ??
          normalizedItems.reduce(
            (total, item) => total + Number(item.subtotal ?? 0),
            0,
          ),
      ),
    });
  }, []);

  const loadCart = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const data = await request("/api/cart");

      console.log("GET /api/cart FULL RESPONSE:", data);
      console.log("GET /api/cart ITEMS:", data?.cart?.items);

      if (!data?.success) {
        throw new Error(data?.message || "Unable to load cart.");
      }

      updateCartState(data.cart);
    } catch (error) {
      console.error("Load cart error:", error);
      setError(getErrorMessage(error, "Unable to load cart."));
    } finally {
      setLoading(false);
    }
  }, [request, updateCartState]);

  useEffect(() => {
    void loadCart();

    const handleCartUpdated = () => {
      void loadCart();
    };

    window.addEventListener("cartUpdated", handleCartUpdated);

    return () => {
      window.removeEventListener("cartUpdated", handleCartUpdated);
    };
  }, [loadCart]);

  const updateQuantity = async (
    item: CartItem,
    nextQuantity: number,
  ): Promise<void> => {
    if (nextQuantity < 1) {
      return;
    }

    const productId = getProductId(item);

    if (!productId) {
      setError("Product ID is missing for this cart item.");
      return;
    }

    const size = item.size || "Standard";
    const itemKey = `${productId}-${size}`;

    try {
      setActionLoading(itemKey);
      setError("");

      const data = await request(`/api/cart/items/${productId}`, {
        method: "PUT",
        body: JSON.stringify({
          quantity: nextQuantity,
          size,
        }),
      });

      updateCartState(data.cart);
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (error) {
      console.error("Update quantity error:", error);
      setError(getErrorMessage(error, "Unable to update quantity."));
    } finally {
      setActionLoading("");
    }
  };

  const removeItem = async (item: CartItem): Promise<void> => {
    const productId = getProductId(item);

    if (!productId) {
      setError("Product ID is missing for this cart item.");
      return;
    }

    const size = item.size || "Standard";
    const itemKey = `${productId}-${size}`;

    try {
      setActionLoading(itemKey);
      setError("");

      const data = await request(
        `/api/cart/items/${productId}?size=${encodeURIComponent(size)}`,
        {
          method: "DELETE",
        },
      );

      updateCartState(data.cart);
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (error) {
      console.error("Remove item error:", error);
      setError(getErrorMessage(error, "Unable to remove item."));
    } finally {
      setActionLoading("");
    }
  };

  const clearCart = async (): Promise<void> => {
    try {
      setActionLoading("clear");
      setError("");

      const data = await request("/api/cart", {
        method: "DELETE",
      });

      updateCartState(data.cart);
      window.dispatchEvent(new Event("cartUpdated"));
    } catch (error) {
      console.error("Clear cart error:", error);
      setError(getErrorMessage(error, "Unable to clear cart."));
    } finally {
      setActionLoading("");
    }
  };

  const items = cart.items || [];

  const calculatedSubtotal = useMemo(() => {
    return items.reduce((total, item) => {
      const quantity = Number(item.quantity || 1);

      const itemSubtotal =
        typeof item.subtotal === "number"
          ? item.subtotal
          : getProductPrice(item) * quantity;

      return total + itemSubtotal;
    }, 0);
  }, [items]);

  const subtotal =
    typeof cart.subtotal === "number" && cart.subtotal > 0
      ? cart.subtotal
      : calculatedSubtotal;

  const totalItems =
    typeof cart.totalItems === "number" && cart.totalItems > 0
      ? cart.totalItems
      : items.reduce(
          (total, item) => total + Number(item.quantity || 1),
          0,
        );

  if (loading) {
    return (
      <>
      <MainHeader />

        <main className={styles.page}>
          <div className={styles.loading}>Loading your cart...</div>
        </main>
      </>
    );
  }

  return (
    <>
      <MainHeader />

      <main className={styles.page}>
        <section className={styles.container}>
          <div className={styles.header}>
            <div>
              <p className={styles.eyebrow}>JIHAAN COSMETICS</p>

              <h1 className={styles.title}>Shopping Cart</h1>

              <p className={styles.subtitle}>
                Review your selected beauty products before checkout.
              </p>
            </div>

            <Link to="/" className={styles.continueLink}>
              Continue Shopping
            </Link>
          </div>

          {error && (
            <div className={styles.error} role="alert">
              {error}
            </div>
          )}

          {items.length === 0 ? (
            <div className={styles.empty}>
              <div className={styles.emptyIcon}>🛍️</div>

              <h2>Your cart is empty</h2>

              <p>Add your favorite beauty products to continue.</p>

              <Link to="/" className={styles.primaryButton}>
                Explore Products
              </Link>
            </div>
          ) : (
            <div className={styles.content}>
              <div className={styles.itemsSection}>
                <div className={styles.itemsHeader}>
                  <h2>Your Items</h2>

                  <button
                    type="button"
                    className={styles.clearButton}
                    onClick={() => void clearCart()}
                    disabled={actionLoading === "clear"}
                  >
                    {actionLoading === "clear"
                      ? "Clearing..."
                      : "Clear Cart"}
                  </button>
                </div>

                <div className={styles.itemsList}>
                  {items.map((item, index) => {
                    const productId = getProductId(item);
                    const itemKey = `${productId}-${item.size || "Standard"}`;
                    const price = getProductPrice(item);
                    const image = getProductImage(item);
                    const name = getProductName(item);
                    const quantity = Number(item.quantity || 1);
                    const isLoading = actionLoading === itemKey;

                    return (
                      <article
                        className={styles.item}
                        key={itemKey || item._id || item.id || index}
                      >
                        <div className={styles.imageWrapper}>
                          {image ? (
                            <img
                              src={image}
                              alt={name}
                              className={styles.productImage}
                              loading="lazy"
                              onError={(event) => {
                                event.currentTarget.style.display = "none";
                              }}
                            />
                          ) : (
                            <div className={styles.imagePlaceholder}>
                              No Image
                            </div>
                          )}
                        </div>

                        <div className={styles.itemDetails}>
                          <h3 className={styles.productName}>{name}</h3>

                          {item.size && (
                            <p className={styles.size}>
                              Size: {item.size}
                            </p>
                          )}

                          <p className={styles.price}>
                            {formatCurrency(price)}
                          </p>

                          <div className={styles.itemBottom}>
                            <div className={styles.quantityControl}>
                              <button
                                type="button"
                                onClick={() =>
                                  void updateQuantity(item, quantity - 1)
                                }
                                disabled={isLoading || quantity <= 1}
                                aria-label={`Decrease quantity of ${name}`}
                              >
                                −
                              </button>

                              <span aria-live="polite">{quantity}</span>

                              <button
                                type="button"
                                onClick={() =>
                                  void updateQuantity(item, quantity + 1)
                                }
                                disabled={isLoading}
                                aria-label={`Increase quantity of ${name}`}
                              >
                                +
                              </button>
                            </div>

                            <button
                              type="button"
                              className={styles.removeButton}
                              onClick={() => void removeItem(item)}
                              disabled={isLoading}
                            >
                              {isLoading ? "Updating..." : "Remove"}
                            </button>
                          </div>
                        </div>

                        <div className={styles.itemTotal}>
                          {formatCurrency(price * quantity)}
                        </div>
                      </article>
                    );
                  })}
                </div>
              </div>

              <aside className={styles.summary}>
                <h2>Order Summary</h2>

                <div className={styles.summaryRow}>
                  <span>Items</span>
                  <span>{totalItems}</span>
                </div>

                <div className={styles.summaryRow}>
                  <span>Subtotal</span>
                  <span>{formatCurrency(subtotal)}</span>
                </div>

                <div className={styles.summaryRow}>
                  <span>Delivery</span>
                  <span className={styles.free}>Free</span>
                </div>

                <div className={styles.divider} />

                <div className={styles.totalRow}>
                  <span>Total</span>
                  <strong>{formatCurrency(subtotal)}</strong>
                </div>

                <button
                  type="button"
                  className={styles.checkoutButton}
                  onClick={() => navigate("/checkout")}
                >
                  Proceed to Checkout
                </button>

                <p className={styles.secureText}>
                  🔒 Secure checkout and protected payment.
                </p>
              </aside>
            </div>
          )}
        </section>
      </main>
    </>
  );
};

export default CartPage;