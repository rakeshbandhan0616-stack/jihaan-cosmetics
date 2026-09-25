import {
  ChevronUp,
  Heart,
  ShoppingBag,
  Star,
  LoaderCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";

import "swiper/css";
import styles from "./NewArrivals.module.css";

type Product = {
  _id?: string;
  id?: string;
  name: string;
  brand?: string;
  category?: string;
  price?: number;
  oldPrice?: number;
  discountType?: "none" | "flat" | "percentage" | string;
  discountValue?: number;
  rating?: number;
  reviews?: number;
  images?: string[];
  hoverImage?: string;
  badge?: string;
  shades?: string[];
  active?: boolean;
  isNewArrival?: boolean;
  stock?: number;
};

type ProductsResponse = {
  success?: boolean;
  message?: string;
  products?: Product[];
  data?: Product[];
  items?: Product[];
};

type CartApiResponse = {
  success?: boolean;
  message?: string;
  cart?: unknown;
};

const API_URL = String(
  import.meta.env.VITE_API_URL || "https://jihaan-cosmetics.onrender.com/api",
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

const getProductId = (product: Product): string => {
  return String(product._id || product.id || "").trim();
};

const getSellingPrice = (product: Product): number => {
  const oldPrice = Number(product.oldPrice || 0);
  const value = Number(product.discountValue || 0);

  if (product.discountType === "flat") {
    return Math.max(0, oldPrice - value);
  }

  if (product.discountType === "percentage") {
    return Math.max(
      0,
      oldPrice - (oldPrice * value) / 100,
    );
  }

  return Number(product.price ?? oldPrice);
};

const getDiscountLabel = (product: Product): string => {
  const oldPrice = Number(product.oldPrice || 0);
  const price = getSellingPrice(product);

  if (!oldPrice || price >= oldPrice) {
    return "";
  }

  return `${Math.round(
    ((oldPrice - price) / oldPrice) * 100,
  )}% Off`;
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

function NewArrivals() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingProductId, setAddingProductId] = useState("");

  useEffect(() => {
    const loadProducts = async (): Promise<void> => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/products/new-arrivals`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
            },
          },
        );

        const result = (await response
          .json()
          .catch(() => ({}))) as ProductsResponse;

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Unable to load new arrivals.",
          );
        }

        const fetchedProducts =
          result.products ||
          result.data ||
          result.items ||
          [];

        setProducts(
          Array.isArray(fetchedProducts)
            ? fetchedProducts
            : [],
        );
      } catch (err) {
        console.error(
          "New arrivals error:",
          err,
        );

        setError(
          err instanceof Error
            ? err.message
            : "Unable to load new arrivals.",
        );
      } finally {
        setLoading(false);
      }
    };

    void loadProducts();
  }, []);

  const visibleProducts = useMemo(() => {
    return showAll
      ? products
      : products.slice(0, 5);
  }, [products, showAll]);

  const handleProductNavigation = (
    product: Product,
  ): void => {
    const productId = getProductId(product);

    if (!productId) {
      console.error(
        "Product ID is missing:",
        product,
      );

      alert("Product ID is missing.");
      return;
    }

    navigate(`/products/${encodeURIComponent(productId)}`);
  };

  const handleAddToCart = async (
    product: Product,
  ): Promise<void> => {
    const productId = getProductId(product);

    const stock = Math.max(
      0,
      Number(product.stock ?? 0),
    );

    if (stock <= 0) {
      alert(
        "This product is currently out of stock.",
      );
      return;
    }

    const token = getToken();

    if (!token) {
      alert(
        "Please login to add products to your cart.",
      );

      navigate("/login");
      return;
    }

    if (!productId) {
      alert("Product ID is missing.");
      return;
    }

    try {
      setAddingProductId(productId);
      setError("");

      const response = await fetch(
        `${API_URL}/cart/items`,
        {
          method: "POST",
          headers: {
            Accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            productId,
            quantity: 1,
            size: "Standard",
          }),
        },
      );

      const result = (await response
        .json()
        .catch(() => ({}))) as CartApiResponse;

      if (!response.ok) {
        throw new Error(
          result.message ||
            "Unable to add product to cart.",
        );
      }

      alert(`${product.name} added to cart.`);

      window.dispatchEvent(
        new Event("cartUpdated"),
      );
    } catch (err) {
      console.error(
        "Add to cart error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to add product to cart.",
      );
    } finally {
      setAddingProductId("");
    }
  };

  const renderProductCard = (
    product: Product,
  ) => {
    const productId = getProductId(product);

    const price = getSellingPrice(product);

    const oldPrice = Number(
      product.oldPrice || 0,
    );

    const image = getImageUrl(
      product.images?.[0],
    );

    const hoverImage = getImageUrl(
      product.hoverImage ||
        product.images?.[1],
    );

    const rating = Number(
      product.rating || 0,
    );

    const stock = Math.max(
      0,
      Number(product.stock ?? 0),
    );

    const stockInfo =
      getStockInfo(stock);

    const isAdding =
      addingProductId === productId;

    return (
      <article
        className={styles.productCard}
        key={productId || product.name}
      >
        {/* PRODUCT IMAGE */}
        <div
          className={styles.imageWrapper}
          onClick={() =>
            handleProductNavigation(product)
          }
          role="button"
          tabIndex={0}
          onKeyDown={(event) => {
            if (
              event.key === "Enter" ||
              event.key === " "
            ) {
              event.preventDefault();

              handleProductNavigation(
                product,
              );
            }
          }}
          aria-label={`View ${product.name}`}
        >
          <span className={styles.newBadge}>
            NEW IN
          </span>

          {/* WISHLIST */}
          <button
            type="button"
            className={
              styles.wishlistButton
            }
            onClick={(event) => {
              event.stopPropagation();
            }}
            aria-label={`Add ${product.name} to wishlist`}
          >
            <Heart
              size={21}
              strokeWidth={1.8}
            />
          </button>

          {/* PRIMARY IMAGE */}
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

          {/* HOVER IMAGE */}
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

        {/* PRODUCT INFO */}
        <div className={styles.productInfo}>
          <span className={styles.category}>
            {product.category || "Beauty"}
          </span>

          {/* PRODUCT NAME */}
          <button
            type="button"
            className={
              styles.productNameButton
            }
            onClick={() =>
              handleProductNavigation(
                product,
              )
            }
          >
            <h3
              className={
                styles.productName
              }
            >
              {product.name}
            </h3>
          </button>

          {/* BRAND */}
          {product.brand && (
            <p className={styles.brand}>
              {product.brand}
            </p>
          )}

          {/* META */}
          <div className={styles.metaRow}>
            {/* SHADES */}
            <div className={styles.shades}>
              {(product.shades || [])
                .slice(0, 4)
                .map(
                  (
                    shade,
                    index,
                  ) => (
                    <span
                      key={`${productId}-shade-${index}`}
                      className={
                        styles.shade
                      }
                      style={{
                        backgroundColor:
                          shade,
                      }}
                    />
                  ),
                )}
            </div>

            {/* RATING */}
            <div
              className={styles.rating}
              aria-label={`${rating} out of 5 stars`}
            >
              <Star
                size={16}
                fill="currentColor"
              />

              <span>
                {rating.toFixed(1)}
              </span>

              <span>
                (
                {product.reviews ||
                  0}
                )
              </span>
            </div>
          </div>

          {/* PRICE */}
          <div className={styles.priceRow}>
            {oldPrice > price && (
              <del>
                {formatPrice(
                  oldPrice,
                )}
              </del>
            )}

            <strong>
              {formatPrice(price)}
            </strong>

            {getDiscountLabel(
              product,
            ) && (
              <span>
                {getDiscountLabel(
                  product,
                )}
              </span>
            )}
          </div>

          {/* STOCK INFORMATION */}
          <div
            className={`${styles.stockStatus} ${stockInfo.className}`}
            aria-label={`Stock status: ${stockInfo.text}`}
          >
            <span
              className={
                styles.stockDot
              }
              aria-hidden="true"
            />

            <span>
              {stockInfo.text}
            </span>
          </div>

          {/* ACTION BUTTONS */}
          <div className={styles.actionRow}>
            {/* VIEW DETAILS */}
            <button
              type="button"
              className={
                styles.selectButton
              }
              onClick={() =>
                handleProductNavigation(
                  product,
                )
              }
            >
              VIEW DETAILS
            </button>

            {/* ADD TO CART */}
            <button
              type="button"
              className={
                styles.cartButton
              }
              onClick={() =>
                void handleAddToCart(
                  product,
                )
              }
              disabled={
                isAdding ||
                stockInfo.isOutOfStock
              }
              aria-label={
                stockInfo.isOutOfStock
                  ? `${product.name} is out of stock`
                  : `Add ${product.name} to cart`
              }
            >
              {isAdding ? (
                <LoaderCircle
                  size={17}
                  className={
                    styles.spin
                  }
                />
              ) : stockInfo.isOutOfStock ? (
                "OUT"
              ) : (
                <ShoppingBag
                  size={17}
                />
              )}
            </button>
          </div>
        </div>
      </article>
    );
  };

  return (
    <section
      className={styles.section}
      id="new-arrivals"
    >
      {/* HERO BANNER */}
      <div className={styles.heroBanner}>
        <div
          className={
            styles.bannerContent
          }
        >
          <span>
            NEW COLLECTION
          </span>

          <h2>
            Do your makeup.
            <br />
            <strong>
              Your way.
            </strong>
          </h2>

          <p>
            Discover playful colors
            and effortless beauty
            essentials.
          </p>
        </div>
      </div>

      {/* SECTION HEADER */}
      <div
        className={
          styles.sectionHeader
        }
      >
        <div>
          <span
            className={
              styles.eyebrow
            }
          >
            FRESHLY LAUNCHED
          </span>

          <h2
            className={
              styles.sectionTitle
            }
          >
            NEW ARRIVALS
          </h2>
        </div>

        <button
          type="button"
          className={
            styles.viewAllButton
          }
          onClick={() =>
            setShowAll(
              (value) => !value,
            )
          }
          aria-expanded={showAll}
        >
          {showAll ? (
            <>
              Show Less{" "}
              <ChevronUp
                size={17}
              />
            </>
          ) : (
            "View All Products"
          )}
        </button>
      </div>

      {/* CONTENT */}
      {loading ? (
        <div
          className={
            styles.emptyState
          }
        >
          <LoaderCircle
            className={
              styles.spin
            }
          />

          Loading new arrivals...
        </div>
      ) : error ? (
        <div
          className={
            styles.emptyState
          }
        >
          {error}
        </div>
      ) : products.length === 0 ? (
        <div
          className={
            styles.emptyState
          }
        >
          No new arrivals available.
        </div>
      ) : !showAll ? (
        <div
          className={
            styles.productsWrapper
          }
        >
          <Swiper
            modules={[Autoplay]}
            className={
              styles.productSwiper
            }
            spaceBetween={24}
            slidesPerView={4.5}
            loop={
              visibleProducts.length >
              4
            }
            speed={850}
            autoplay={{
              delay: 2800,
              disableOnInteraction:
                false,
              pauseOnMouseEnter:
                true,
            }}
            breakpoints={{
              0: {
                slidesPerView: 1.15,
                spaceBetween: 14,
              },

              480: {
                slidesPerView: 1.7,
                spaceBetween: 16,
              },

              700: {
                slidesPerView: 2.3,
                spaceBetween: 18,
              },

              1000: {
                slidesPerView: 3.2,
                spaceBetween: 20,
              },

              1350: {
                slidesPerView: 4.5,
                spaceBetween: 24,
              },
            }}
          >
            {visibleProducts.map(
              (product) => (
                <SwiperSlide
                  key={
                    getProductId(
                      product,
                    ) ||
                    product.name
                  }
                >
                  {renderProductCard(
                    product,
                  )}
                </SwiperSlide>
              ),
            )}
          </Swiper>
        </div>
      ) : (
        <div
          className={
            styles.allProductsGrid
          }
        >
          {visibleProducts.map(
            renderProductCard,
          )}
        </div>
      )}
    </section>
  );
}

export default NewArrivals;