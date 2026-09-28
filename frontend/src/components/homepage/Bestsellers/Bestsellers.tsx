import {
  CheckCircle,
  ChevronRight,
  ChevronUp,
  LoaderCircle,
  ShoppingBag,
  Star,
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

  // Optional fields supported by the UI
  tagline?: string;
  promoBadge?: string;
  availabilityBadge?: string;
  isNew?: boolean;
};

type CartApiResponse = {
  success?: boolean;
  message?: string;
  cart?: unknown;
};

const API_URL = String(
  import.meta.env.VITE_API_URL ||
    "https://jihaan-cosmetics.onrender.com/api",
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

        const response = await fetch(
          `${API_URL}/products/bestsellers`,
        );

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

  const handleAddToCart = async (
    product: Product,
  ): Promise<void> => {
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
        {/* ================= HEADER ================= */}
        <div className={styles.sectionHeader}>
          <h2 className={styles.title}>BEST SELLER</h2>

          <button
            type="button"
            className={styles.viewAllButton}
            onClick={() => setShowAll((value) => !value)}
            aria-expanded={showAll}
          >
            {showAll ? (
              <>
                Show Less
                <ChevronUp size={16} />
              </>
            ) : (
              <>
                View All
                <ChevronRight size={17} />
              </>
            )}
          </button>
        </div>

        {/* ================= STATES ================= */}
        {loading ? (
          <div className={styles.emptyState}>
            <LoaderCircle className={styles.spin} size={24} />
            <span>Loading best sellers...</span>
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
              const reviews = Number(product.reviews || 0);
              const stock = Number(product.stock ?? 0);

              const isAdding =
                addingProductId === product._id;

              /*
               * TOP LEFT LABEL
               * Uses your actual product data where available.
               */
              const topLabel =
                product.isNew || product.badge?.toLowerCase() === "new"
                  ? "New"
                  : product.badge || "BestSeller";

              /*
               * Optional tagline.
               * Falls back to category instead of hardcoded
               * product names/data.
               */
              const tagline =
                product.tagline ||
                product.category ||
                "Beauty Essentials";

              /*
               * Back-in-stock badge.
               * Can be controlled from backend later using
               * availabilityBadge.
               */
              const showBackInStock =
                product.availabilityBadge?.toLowerCase() ===
                  "back in stock" ||
                product.badge?.toLowerCase().includes("back in stock");

              /*
               * BUY4 can be changed later from backend using
               * promoBadge.
               */
              const promoLabel = product.promoBadge || "BUY4";

              return (
                <article
                  className={styles.productCard}
                  key={product._id}
                >
                  {/* ================= TOP RIBBON ================= */}
                  <div className={styles.topRibbon}>
                    <span
                      className={`${styles.productType} ${
                        topLabel.toLowerCase() === "new"
                          ? styles.newRibbon
                          : styles.bestRibbon
                      }`}
                    >
                      {topLabel}
                    </span>

                    <span className={styles.promoRibbon}>
                      <span className={styles.promoIcon}>%</span>
                      {promoLabel}
                    </span>
                  </div>

                  {/* ================= IMAGE ================= */}
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
                    {showBackInStock && (
                      <span className={styles.stockBadge}>
                        Back In Stock
                      </span>
                    )}

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

                    {/* SHADES */}
                
                  </div>

                  {/* ================= PRODUCT INFO ================= */}
                  <div className={styles.productInfo}>
                    {/* TAGLINE */}
                    <div className={styles.tagline}>
                      <span>{tagline}</span>
                    </div>

                    {/* NAME */}
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

                    {/* RATING */}
                    <div className={styles.ratingRow}>
                      <span className={styles.ratingValue}>
                        <Star
                          size={15}
                          fill="currentColor"
                          strokeWidth={1.5}
                        />
                        {rating.toFixed(2)}
                      </span>

                      <span className={styles.ratingDivider}>
                        |
                      </span>

                      <span className={styles.verifiedReview}>
                        <CheckCircle
                          size={13}
                          fill="currentColor"
                          strokeWidth={2}
                        />
                        {reviews} Reviews
                      </span>
                    </div>

                    {/* PRICE */}
                    <div className={styles.priceRow}>
                      <strong className={styles.currentPrice}>
                        {formatPrice(price)}
                      </strong>

                      {oldPrice > price && (
                        <del className={styles.oldPrice}>
                          {formatPrice(oldPrice)}
                        </del>
                      )}

                      {discount > 0 && (
                        <span className={styles.discount}>
                          {discount}% OFF
                        </span>
                      )}
                    </div>

                    {/* ADD TO CART */}
                    <button
                      type="button"
                      className={styles.addToCart}
                      onClick={() =>
                        void handleAddToCart(product)
                      }
                      disabled={
                        isAdding || stock <= 0
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
                      ) : stock <= 0 ? (
                        "OUT OF STOCK"
                      ) : (
                        "ADD TO CART"
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