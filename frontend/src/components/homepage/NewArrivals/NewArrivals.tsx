import {
  CheckCircle,
  ChevronRight,
  ChevronUp,
  LoaderCircle,
  Star,
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

  active?: boolean;
  isNewArrival?: boolean;

  stock?: number;

  /*
   * Optional tagline.
   * If your backend doesn't provide this,
   * category will be used automatically.
   */
  tagline?: string;
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
  import.meta.env.VITE_API_URL ||
    "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/+$/, "");

const AUTH_TOKEN_KEY = "jihaan_auth_token";

/* =========================================================
   HELPERS
========================================================= */

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

const getDiscount = (product: Product): number => {
  const oldPrice = Number(product.oldPrice || 0);
  const price = getSellingPrice(product);

  if (!oldPrice || price >= oldPrice) {
    return 0;
  }

  return Math.round(
    ((oldPrice - price) / oldPrice) * 100,
  );
};

/* =========================================================
   COMPONENT
========================================================= */

function NewArrivals() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [showAll, setShowAll] = useState(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addingProductId, setAddingProductId] =
    useState("");

  /* =======================================================
     LOAD NEW ARRIVALS
  ======================================================= */

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

  /* =======================================================
     VISIBLE PRODUCTS
  ======================================================= */

  const visibleProducts = useMemo(() => {
    return showAll
      ? products
      : products.slice(0, 4);
  }, [products, showAll]);

  /* =======================================================
     PRODUCT NAVIGATION
  ======================================================= */

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

    navigate(
      `/products/${encodeURIComponent(productId)}`,
    );
  };

  /* =======================================================
     ADD TO CART
  ======================================================= */

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

      alert(
        `${product.name} added to cart.`,
      );

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

  /* =======================================================
     PRODUCT CARD
  ======================================================= */

  const renderProductCard = (
    product: Product,
  ) => {
    const productId = getProductId(product);

    const price = getSellingPrice(product);

    const oldPrice = Number(
      product.oldPrice || 0,
    );

    const discount = getDiscount(product);

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

    const reviews = Number(
      product.reviews || 0,
    );

    const stock = Math.max(
      0,
      Number(product.stock ?? 0),
    );

    const isAdding =
      addingProductId === productId;

    /*
     * Dynamic feature/tagline.
     *
     * Backend tagline is used when available.
     * Otherwise category is displayed.
     */
    const tagline =
      product.tagline ||
      product.category ||
      "New Collection";

    return (
      <article
        className={styles.productCard}
        key={
          productId ||
          product.name
        }
      >
        {/* =================================================
            TOP NEW RIBBON
        ================================================= */}

        <div className={styles.topRibbon}>
          <span className={styles.newRibbon}>
            New
          </span>

          {/* Intentionally no BUY4 / BUY3 badge */}
          <span className={styles.emptyRibbon} />
        </div>

        {/* =================================================
            PRODUCT IMAGE
        ================================================= */}

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
        </div>

        {/* =================================================
            PRODUCT INFORMATION
        ================================================= */}

        <div className={styles.productInfo}>
          {/* YELLOW FEATURE STRIP */}

          <div className={styles.tagline}>
            <span>{tagline}</span>
          </div>

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

          {/* RATING */}

          <div className={styles.ratingRow}>
            <span
              className={
                styles.ratingValue
              }
            >
              <Star
                size={15}
                fill="currentColor"
                strokeWidth={1.5}
              />

              {rating.toFixed(2)}
            </span>

            <span
              className={
                styles.ratingDivider
              }
            >
              |
            </span>

            <span
              className={
                styles.verifiedReview
              }
            >
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
            <strong
              className={
                styles.currentPrice
              }
            >
              {formatPrice(price)}
            </strong>

            {oldPrice > price && (
              <del
                className={
                  styles.oldPrice
                }
              >
                {formatPrice(oldPrice)}
              </del>
            )}

            {discount > 0 && (
              <span
                className={
                  styles.discount
                }
              >
                {discount}% Off
              </span>
            )}
          </div>

          {/* ADD TO CART */}

          <button
            type="button"
            className={
              styles.addToCart
            }
            onClick={() =>
              void handleAddToCart(
                product,
              )
            }
            disabled={
              isAdding || stock <= 0
            }
          >
            {isAdding ? (
              <>
                <LoaderCircle
                  size={16}
                  className={
                    styles.spin
                  }
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
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section
      className={styles.section}
      id="new-arrivals"
    >
      <div className={styles.container}>
        {/* =================================================
            SECTION HEADER
        ================================================= */}

        <div
          className={
            styles.sectionHeader
          }
        >
          <h2
            className={
              styles.sectionTitle
            }
          >
            NEW ARRIVALS
          </h2>

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
                Show Less
                <ChevronUp
                  size={16}
                />
              </>
            ) : (
              <>
                View All
                <ChevronRight
                  size={17}
                />
              </>
            )}
          </button>
        </div>

        {/* =================================================
            LOADING
        ================================================= */}

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
              size={23}
            />

            <span>
              Loading new arrivals...
            </span>
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
          /* =================================================
             MOBILE + DESKTOP SWIPER
          ================================================= */

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
              slidesPerView={4}
              loop={
                visibleProducts.length >
                4
              }
              speed={750}
              autoplay={{
                delay: 3200,
                disableOnInteraction: false,
                pauseOnMouseEnter: true,
              }}
              breakpoints={{
                0: {
                  slidesPerView: 1.45,
                  spaceBetween: 12,
                },

                420: {
                  slidesPerView: 1.7,
                  spaceBetween: 13,
                },

                600: {
                  slidesPerView: 2.1,
                  spaceBetween: 15,
                },

                768: {
                  slidesPerView: 2.5,
                  spaceBetween: 18,
                },

                1000: {
                  slidesPerView: 3,
                  spaceBetween: 20,
                },

                1250: {
                  slidesPerView: 4,
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
          /* =================================================
             VIEW ALL GRID
          ================================================= */

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
      </div>
    </section>
  );
}

export default NewArrivals;