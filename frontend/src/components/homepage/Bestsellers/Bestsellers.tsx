import {
  Heart,
  ShoppingBag,
  Star,
  ChevronUp,
  LoaderCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import styles from "./Bestsellers.module.css";

type Product = {
  _id: string;
  name: string;
  brand?: string;
  category?: string;
  price?: number;
  oldPrice?: number;
  discountType?: "none" | "flat" | "percentage";
  discountValue?: number;
  rating?: number;
  reviews?: number;
  images?: string[];
  hoverImage?: string;
  badge?: string;
  shades?: string[];
  active?: boolean;
  isBestseller?: boolean;
  stock?: number;
};

type CartApiResponse = {
  success?: boolean;
  message?: string;
  cart?: unknown;
};

const API_URL = String(
  import.meta.env.VITE_API_URL || "http://localhost:5000/api",
).replace(/\/+$/, "");

const AUTH_TOKEN_KEY = "jihaan_auth_token";

const getToken = (): string => {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
};

const getImageUrl = (image?: string): string => {
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

  const uploadUrl = API_URL.replace(/\/api\/?$/, "");

  return `${uploadUrl}${image.startsWith("/") ? image : `/${image}`}`;
};

const formatPrice = (price = 0): string => {
  return `₹${Number(price || 0).toLocaleString("en-IN")}`;
};

const getSellingPrice = (product: Product): number => {
  const oldPrice = Number(product.oldPrice || 0);
  const value = Number(product.discountValue || 0);

  if (product.discountType === "flat") {
    return Math.max(0, oldPrice - value);
  }

  if (product.discountType === "percentage") {
    return Math.max(0, oldPrice - (oldPrice * value) / 100);
  }

  return Number(product.price ?? oldPrice);
};

const getStockInfo = (
  stockValue: number,
): {
  text: string;
  className: string;
  isOutOfStock: boolean;
} => {
  if (stockValue <= 0) {
    return {
      text: "Out of Stock",
      className: styles.outOfStock,
      isOutOfStock: true,
    };
  }

  if (stockValue <= 5) {
    return {
      text: `Only ${stockValue} left`,
      className: styles.lowStock,
      isOutOfStock: false,
    };
  }

  return {
    text: `${stockValue} in stock`,
    className: styles.inStock,
    isOutOfStock: false,
  };
};

function Bestsellers() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingProductId, setAddingProductId] = useState("");

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(`${API_URL}/products/bestsellers`);

        const result = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to load best sellers.",
          );
        }

        setProducts(result.products || result.data || []);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Unable to load best sellers.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  }, []);

  const visibleProducts = useMemo(
    () => (showAll ? products : products.slice(0, 4)),
    [products, showAll],
  );

  const handleAddToCart = async (product: Product): Promise<void> => {
    const stock = Number(product.stock ?? 0);

    if (stock <= 0) {
      alert("This product is currently out of stock.");
      return;
    }

    const token = getToken();

    if (!token) {
      alert("Please login to add products to your cart.");
      navigate("/login");
      return;
    }

    if (!product._id) {
      alert("Product ID is missing.");
      return;
    }

    try {
      setAddingProductId(product._id);
      setError("");

      const response = await fetch(`${API_URL}/cart/items`, {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify({
          productId: product._id,
          quantity: 1,
          size: "Standard",
        }),
      });

      const result = (await response
        .json()
        .catch(() => ({}))) as CartApiResponse;

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to add product to cart.",
        );
      }

      alert(`${product.name} added to cart.`);

      window.dispatchEvent(new Event("cartUpdated"));
    } catch (err) {
      console.error("Add to cart error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to add product to cart.",
      );
    } finally {
      setAddingProductId("");
    }
  };

  return (
    <section className={styles.section} id="bestsellers">
      <div className={styles.container}>
        <div className={styles.sectionHeader}>
          <div className={styles.headingContent}>
            <span className={styles.eyebrow}>
              OUR COLLECTION
            </span>

            <h2 className={styles.title}>BESTSELLERS</h2>
          </div>

          <button
            type="button"
            className={styles.viewAllButton}
            onClick={() => setShowAll((value) => !value)}
            aria-expanded={showAll}
          >
            {showAll ? (
              <>
                Show Less <ChevronUp size={17} />
              </>
            ) : (
              "View All Products"
            )}
          </button>
        </div>

        {loading ? (
          <div className={styles.emptyState}>
            <LoaderCircle className={styles.spin} />
            Loading best sellers...
          </div>
        ) : error ? (
          <div className={styles.emptyState}>{error}</div>
        ) : products.length === 0 ? (
          <div className={styles.emptyState}>
            No best sellers available.
          </div>
        ) : (
          <div className={styles.productGrid}>
            {visibleProducts.map((product) => {
              const price = getSellingPrice(product);
              const oldPrice = Number(product.oldPrice || 0);

              const discount =
                oldPrice > price
                  ? Math.round(
                      ((oldPrice - price) / oldPrice) * 100,
                    )
                  : 0;

              const image = getImageUrl(product.images?.[0]);

              const hoverImage = getImageUrl(
                product.hoverImage || product.images?.[1],
              );

              const rating = Number(product.rating || 0);

              const stock = Math.max(
                0,
                Number(product.stock ?? 0),
              );

              const stockInfo = getStockInfo(stock);

              const isAdding =
                addingProductId === product._id;

              return (
                <article
                  className={styles.productCard}
                  key={product._id}
                >
                  <div
                    className={styles.imageWrapper}
                    onClick={() =>
                      navigate(`/products/${product._id}`)
                    }
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();

                        navigate(
                          `/products/${product._id}`,
                        );
                      }
                    }}
                    aria-label={`View ${product.name}`}
                  >
                    <div className={styles.badgeGroup}>
                      {product.badge && (
                        <span className={styles.badge}>
                          {product.badge.toUpperCase()}
                        </span>
                      )}

                      {discount > 0 && (
                        <span className={styles.saveBadge}>
                          SAVE {discount}%
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className={styles.wishlistButton}
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                      aria-label={`Add ${product.name} to wishlist`}
                    >
                      <Heart
                        size={18}
                        strokeWidth={1.8}
                      />
                    </button>

                    {image && (
                      <img
                        src={image}
                        alt={product.name}
                        className={`${styles.productImage} ${styles.primaryImage}`}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display =
                            "none";
                        }}
                      />
                    )}

                    {hoverImage && (
                      <img
                        src={hoverImage}
                        alt={`${product.name} preview`}
                        className={`${styles.productImage} ${styles.hoverImage}`}
                        loading="lazy"
                        onError={(event) => {
                          event.currentTarget.style.display =
                            "none";
                        }}
                      />
                    )}

                    <span className={styles.demoText}>
                      VIEW PRODUCT
                    </span>
                  </div>

                  <div className={styles.productInfo}>
                    {product.shades?.length ? (
                      <div className={styles.shadeRow}>
                        {product.shades
                          .slice(0, 4)
                          .map((shade, index) => (
                            <span
                              key={`${product._id}-shade-${index}`}
                              className={styles.shadeCircle}
                              style={{
                                backgroundColor: shade,
                              }}
                            />
                          ))}

                        <strong>
                          +{product.shades.length} Shades
                        </strong>
                      </div>
                    ) : null}

                    <button
                      type="button"
                      className={styles.productNameButton}
                      onClick={() =>
                        navigate(
                          `/products/${product._id}`,
                        )
                      }
                    >
                      <h3 className={styles.productName}>
                        {product.name}
                      </h3>
                    </button>

                    <p className={styles.category}>
                      {product.category || "Beauty"}
                    </p>

                    <div className={styles.ratingRow}>
                      <div
                        className={styles.ratingStars}
                        aria-label={`${rating} out of 5 stars`}
                      >
                        {Array.from({ length: 5 }).map(
                          (_, index) => (
                            <Star
                              key={index}
                              size={15}
                              fill={
                                index < Math.round(rating)
                                  ? "currentColor"
                                  : "none"
                              }
                              strokeWidth={1.7}
                            />
                          ),
                        )}
                      </div>

                      <span className={styles.reviews}>
                        ({product.reviews || 0})
                      </span>
                    </div>

                    <div className={styles.priceRow}>
                      <strong
                        className={styles.currentPrice}
                      >
                        {formatPrice(price)}
                      </strong>

                      {oldPrice > price && (
                        <del className={styles.oldPrice}>
                          {formatPrice(oldPrice)}
                        </del>
                      )}

                      {discount > 0 && (
                        <span className={styles.discount}>
                          {discount}% Off
                        </span>
                      )}
                    </div>

                    {/* STOCK STATUS */}
                    <div
                      className={`${styles.stockStatus} ${stockInfo.className}`}
                      aria-label={`Stock status: ${stockInfo.text}`}
                    >
                      <span
                        className={styles.stockDot}
                        aria-hidden="true"
                      />

                      <span>{stockInfo.text}</span>
                    </div>

                    <button
                      type="button"
                      className={styles.addToCart}
                      onClick={() =>
                        void handleAddToCart(product)
                      }
                      disabled={
                        isAdding || stockInfo.isOutOfStock
                      }
                    >
                      {isAdding ? (
                        <>
                          <LoaderCircle
                            size={17}
                            className={styles.spin}
                          />
                          ADDING...
                        </>
                      ) : stockInfo.isOutOfStock ? (
                        "OUT OF STOCK"
                      ) : (
                        <>
                          <ShoppingBag
                            size={17}
                            strokeWidth={1.8}
                          />
                          ADD TO CART
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

export default Bestsellers;