import {
  CheckCircle,
  ChevronRight,
  ChevronUp,
  LoaderCircle,
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

const normalizeCategory = (value = ""): string => {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
};

/* =========================================================
   COMPONENT
========================================================= */

function Bestsellers() {
  const navigate = useNavigate();

  const [products, setProducts] = useState<Product[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [selectedCategory, setSelectedCategory] =
    useState("All");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [addingProductId, setAddingProductId] =
    useState("");

  /* =======================================================
     CART ANIMATION
  ======================================================= */

  type CartAnimationPhase =
    | "idle"
    | "fold"
    | "bag"
    | "puff"
    | "tag"
    | "flip"
    | "check"
    | "return";

  const [cartAnimation, setCartAnimation] =
    useState<{
      productId: string;
      phase: CartAnimationPhase;
    } | null>(null);

  /* =======================================================
     CATEGORIES
  ======================================================= */

  const categories = [
    "All",
    "Skincare",
    "Makeup",
    "Haircare",
    "Fragrances",
    "Bath & Body",
  ];

  /* =======================================================
     LOAD PRODUCTS
  ======================================================= */

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError("");

        const response = await fetch(
          `${API_URL}/products/bestsellers`,
        );

        const result = await response
          .json()
          .catch(() => ({}));

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Unable to load best sellers.",
          );
        }

        setProducts(
          result.products ||
            result.data ||
            [],
        );
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

  /* =======================================================
     FILTER PRODUCTS
  ======================================================= */

  const filteredProducts = useMemo(() => {
    if (selectedCategory === "All") {
      return products;
    }

    const selected = normalizeCategory(
      selectedCategory,
    );

    return products.filter((product) => {
      const productCategory =
        normalizeCategory(product.category);

      if (selected === "fragrances") {
        return (
          productCategory === "fragrance" ||
          productCategory === "fragrances"
        );
      }

      if (selected === "skincare") {
        return (
          productCategory.includes("skincare") ||
          productCategory.includes("skincareproducts") ||
          productCategory.includes("skin")
        );
      }

      if (selected === "haircare") {
        return (
          productCategory.includes("haircare") ||
          productCategory.includes("hair")
        );
      }

      if (selected === "bathbody") {
        return (
          productCategory.includes("bath") ||
          productCategory.includes("body") ||
          productCategory.includes("bathbody")
        );
      }

      return productCategory.includes(selected);
    });
  }, [products, selectedCategory]);

  /* =======================================================
     VISIBLE PRODUCTS
  ======================================================= */

  const visibleProducts = useMemo(
    () =>
      showAll
        ? filteredProducts
        : filteredProducts.slice(0, 5),
    [filteredProducts, showAll],
  );

  /* =======================================================
     ADD TO CART
  ======================================================= */

  const handleAddToCart = async (
    product: Product,
  ): Promise<void> => {
    const productId = product._id;

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

    if (!productId || addingProductId) {
      if (!productId) {
        alert("Product ID is missing.");
      }

      return;
    }

    const wait = (ms: number) =>
      new Promise<void>((resolve) =>
        window.setTimeout(resolve, ms),
      );

    const apiPromise = fetch(
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
    ).then(async (response) => {
      const result =
        (await response
          .json()
          .catch(() => ({}))) as CartApiResponse;

      return {
        response,
        result,
      };
    });

    try {
      setError("");
      setAddingProductId(productId);

      await wait(180);

      setCartAnimation({
        productId,
        phase: "fold",
      });

      await wait(1420);

      setCartAnimation({
        productId,
        phase: "bag",
      });

      await wait(540);

      setCartAnimation({
        productId,
        phase: "puff",
      });

      await wait(420);

      setCartAnimation({
        productId,
        phase: "tag",
      });

      await wait(700);

      setCartAnimation({
        productId,
        phase: "flip",
      });

      await wait(260);

      const api = await apiPromise;

      if (!api.response.ok) {
        throw new Error(
          api.result.message ||
            "Unable to add product to cart.",
        );
      }

      setCartAnimation({
        productId,
        phase: "check",
      });

      window.dispatchEvent(
        new Event("cartUpdated"),
      );

      await wait(1140);

      setCartAnimation({
        productId,
        phase: "return",
      });

      await wait(820);
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

      setCartAnimation(null);

      alert(
        err instanceof Error
          ? err.message
          : "Unable to add product to cart.",
      );
    } finally {
      setAddingProductId("");

      setCartAnimation((current) =>
        current?.productId === productId
          ? null
          : current,
      );
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <section
      className={styles.section}
      id="bestsellers"
    >
      <div className={styles.container}>
        {/* =================================================
            HEADER
        ================================================= */}

        <div className={styles.sectionHeader}>
          <div className={styles.headingContent}>
            <h2 className={styles.title}>
              Best Sellers
            </h2>

            <p className={styles.subtitle}>
              Loved by thousands, chosen for results
            </p>
          </div>

          <button
            type="button"
            className={styles.viewAllButton}
            onClick={() =>
              setShowAll((value) => !value)
            }
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

        {/* =================================================
            CATEGORY TABS
        ================================================= */}

        <div
          className={styles.categoryTabs}
          role="tablist"
          aria-label="Product categories"
        >
          {categories.map((category) => (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={
                selectedCategory === category
              }
              className={`${styles.categoryTab} ${
                selectedCategory === category
                  ? styles.activeCategoryTab
                  : ""
              }`}
              onClick={() => {
                setSelectedCategory(category);
                setShowAll(false);
              }}
            >
              {category}
            </button>
          ))}
        </div>

        {/* =================================================
            LOADING
        ================================================= */}

        {loading ? (
          <div className={styles.emptyState}>
            <LoaderCircle
              className={styles.spin}
              size={24}
            />

            <span>
              Loading best sellers...
            </span>
          </div>
        ) : error ? (
          /* =================================================
             ERROR
          ================================================= */

          <div className={styles.emptyState}>
            {error}
          </div>
        ) : filteredProducts.length === 0 ? (
          /* =================================================
             NO PRODUCTS
          ================================================= */

          <div className={styles.emptyState}>
            No products available in this category.
          </div>
        ) : (
          /* =================================================
             PRODUCT GRID
          ================================================= */

          <div className={styles.productGrid}>
            {visibleProducts.map((product) => {
              const price =
                getSellingPrice(product);

              const oldPrice =
                Number(product.oldPrice || 0);

              const discount =
                oldPrice > price
                  ? Math.round(
                      ((oldPrice - price) /
                        oldPrice) *
                        100,
                    )
                  : 0;

              const image = getImageUrl(
                product.images?.[0],
              );

              const hoverImage =
                getImageUrl(
                  product.hoverImage ||
                    product.images?.[1],
                );

              const rating =
                Number(product.rating || 0);

              const reviews =
                Number(product.reviews || 0);

              const stock =
                Number(product.stock ?? 0);

              const isAdding =
                addingProductId ===
                product._id;

              const animationPhase =
                cartAnimation?.productId ===
                product._id
                  ? cartAnimation.phase
                  : "idle";

              const tagline =
                product.tagline ||
                product.category ||
                "Beauty Essentials";

              const showBackInStock =
                product.availabilityBadge?.toLowerCase() ===
                  "back in stock" ||
                product.badge
                  ?.toLowerCase()
                  .includes("back in stock");

              return (
                <article
                  className={styles.productCard}
                  key={product._id}
                >
                  {/* =================================================
                      IMAGE
                  ================================================= */}

                  <div
                    className={styles.imageWrapper}
                    onClick={() =>
                      navigate(
                        `/products/${product._id}`,
                      )
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
                      <span
                        className={
                          styles.stockBadge
                        }
                      >
                        Back In Stock
                      </span>
                    )}

                    {discount > 0 && (
                      <span
                        className={
                          styles.imageDiscount
                        }
                      >
                        -{discount}%
                      </span>
                    )}

                    {image ? (
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
                    ) : (
                      <div
                        className={
                          styles.imagePlaceholder
                        }
                      >
                        <span>
                          No image
                        </span>
                      </div>
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
                  </div>

                  {/* =================================================
                      PRODUCT INFORMATION
                  ================================================= */}

                  <div
                    className={styles.productInfo}
                  >
                    <div
                      className={styles.tagline}
                    >
                      {tagline}
                    </div>

                    <button
                      type="button"
                      className={
                        styles.productNameButton
                      }
                      onClick={() =>
                        navigate(
                          `/products/${product._id}`,
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

                    <div
                      className={
                        styles.ratingRow
                      }
                    >
                      <span
                        className={
                          styles.ratingValue
                        }
                      >
                        <Star
                          size={14}
                          fill="currentColor"
                          strokeWidth={1.5}
                        />

                        {rating.toFixed(1)}
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
                          size={12}
                          fill="currentColor"
                          strokeWidth={2}
                        />

                        {reviews}
                      </span>
                    </div>

                    {/* PRICE */}

                    <div
                      className={
                        styles.priceRow
                      }
                    >
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
                          {discount}% OFF
                        </span>
                      )}
                    </div>

                    {/* =================================================
                        ADD TO CART
                    ================================================= */}

                    <button
                      type="button"
                      className={`${styles.addToCart} ${
                        styles[
                          `phase-${animationPhase}`
                        ]
                      }`}
                      onClick={() =>
                        void handleAddToCart(
                          product,
                        )
                      }
                      disabled={
                        isAdding ||
                        stock <= 0
                      }
                      aria-label={
                        stock <= 0
                          ? `${product.name} is out of stock`
                          : `Add ${product.name} to cart`
                      }
                    >
                      <span
                        className={
                          styles.cartStage
                        }
                      >
                        {/* NORMAL BUTTON */}

                        <span
                          className={
                            styles.cartFace
                          }
                        >
                          <span
                            className={
                              styles.cartPanelLeft
                            }
                          >
                            <span
                              className={
                                styles.cartMiniBag
                              }
                              aria-hidden="true"
                            >
                              <span
                                className={
                                  styles.cartMiniBagHandle
                                }
                              />
                            </span>
                          </span>

                          <span
                            className={
                              styles.cartPanelMain
                            }
                          >
                            {stock <= 0
                              ? "OUT OF STOCK"
                              : "Add to cart"}
                          </span>

                          <span
                            className={
                              styles.cartPanelRight
                            }
                          >
                            {formatPrice(price)}
                          </span>
                        </span>

                        {/* FOLD */}

                        <span
                          className={
                            styles.cartFolded
                          }
                          aria-hidden="true"
                        >
                          <span
                            className={
                              styles.cartFoldLineLeft
                            }
                          />

                          <span
                            className={
                              styles.cartFoldLineRight
                            }
                          />
                        </span>

                        {/* BAG */}

                        <span
                          className={
                            styles.cartBagScene
                          }
                          aria-hidden="true"
                        >
                          <span
                            className={
                              styles.cartBagHandle
                            }
                          />

                          <span
                            className={
                              styles.cartBagBody
                            }
                          >
                            <span
                              className={
                                styles.cartBagMark
                              }
                            >
                              ×
                            </span>
                          </span>

                          <span
                            className={
                              styles.cartTag
                            }
                          >
                            <span
                              className={
                                styles.cartTagFront
                              }
                            >
                              {formatPrice(
                                price,
                              )}
                            </span>

                            <span
                              className={
                                styles.cartTagBack
                              }
                            >
                              <CheckCircle
                                size={12}
                                strokeWidth={2.5}
                              />

                              Added
                            </span>
                          </span>
                        </span>

                        {/* PUFF */}

                        <span
                          className={
                            styles.cartPuff
                          }
                          aria-hidden="true"
                        >
                          <span />
                          <span />
                          <span />
                          <span />
                        </span>
                      </span>
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