import {
  useEffect,
  useMemo,
  useState,
  useRef,
  type FormEvent,
  type MouseEvent,
} from "react";
import {
  ArrowLeft,
  Check,
  Heart,
  LoaderCircle,
  Minus,
  Plus,
  ShoppingBag,
  Star,
  Truck,
} from "lucide-react";
import {
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";

import MainHeader from "../../components/header/MainHeader/MainHeader";
import styles from "./ProductPage.module.css";

type DiscountType = "none" | "flat" | "percentage";

type Review = {
  _id?: string;
  user?: string;
  name: string;
  email?: string;
  rating: number;
  comment: string;
  verifiedPurchase?: boolean;
  createdAt?: string;
};

type Product = {
  _id?: string;
  id?: string;
  name: string;
  slug?: string;
  brand?: string;
  category?: string;
  subcategory?: string;

  description?: string;
  howToUse?: string;
  ingredients?: string;
  additionalDetails?: string;
  benefits?: string;
  composition?: string;

  tags?: string[];

  price: number;
  oldPrice?: number;
  discountType?: DiscountType;
  discountValue?: number;

  rating?: number;
  reviews?: number;
  reviewList?: Review[];

  images?: string[];
  hoverImage?: string;
  beforeImage?: string;
  afterImage?: string;

  video?: string;
  youtubeVideoUrl?: string;

  shades?: string[];
  badge?: string;

  productType?: "new-arrival" | "bestseller" | "regular";
  isNewArrival?: boolean;
  isBestseller?: boolean;

  active?: boolean;
  isActive?: boolean;
  stock?: number;
  quantity?: number;
  availableStock?: number;
  sku?: string;

  [key: string]: unknown;
};

type Offer = {
  _id?: string;
  id?: string;
  name: string;
  products?: string[];
  brand?: string;
  category?: string;
  rating?: number;
  reviews?: number;
  oldPrice?: number;
  price?: number;
  discount?: string;
  prepaidPrice?: number;
  image?: string;
  demoImage?: string;
  active?: boolean;
  isActive?: boolean;
  sortOrder?: number;
};

type ApiResponse<T> = {
  success?: boolean;
  message?: string;
  data?: T | T[];
  product?: T;
  products?: T[];
  offers?: T[];
  reviews?: T[];
};

const API_URL = String(
  import.meta.env.VITE_API_URL || "http://localhost:5000/api",
).replace(/\/+$/, "");

const SERVER_URL = API_URL.replace(/\/api\/?$/, "");

const getToken = (): string => {
  return (
    localStorage.getItem("jihaan_auth_token") ||
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("authToken") ||
    ""
  );
};

const getImageUrl = (image?: string): string => {
  if (!image) return "";

  if (image.startsWith("http://") || image.startsWith("https://")) {
    return image;
  }

  return `${SERVER_URL}/${image.replace(/^\/+/, "")}`;
};

const formatPrice = (price: number): string => {
  return `₹${Number(price || 0).toLocaleString("en-IN")}`;
};

const getDiscountPercentage = (
  oldPrice: number,
  price: number,
): number => {
  if (!oldPrice || oldPrice <= price) return 0;

  return Math.round(((oldPrice - price) / oldPrice) * 100);
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

const getYouTubeEmbedUrl = (url?: string): string => {
  if (!url) return "";

  try {
    const parsedUrl = new URL(url);

    if (parsedUrl.hostname.includes("youtu.be")) {
      const videoId = parsedUrl.pathname.replace("/", "");

      return videoId
        ? `https://www.youtube.com/embed/${videoId}`
        : "";
    }

    if (parsedUrl.hostname.includes("youtube.com")) {
      const videoId = parsedUrl.searchParams.get("v");

      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }

      if (parsedUrl.pathname.startsWith("/embed/")) {
        return url;
      }

      if (parsedUrl.pathname.startsWith("/shorts/")) {
        const shortsId = parsedUrl.pathname.split("/shorts/")[1];

        return shortsId
          ? `https://www.youtube.com/embed/${shortsId}`
          : "";
      }
    }
  } catch {
    return "";
  }

  return "";
};

const formatDate = (date?: string): string => {
  if (!date) return "";

  const parsedDate = new Date(date);

  if (Number.isNaN(parsedDate.getTime())) {
    return "";
  }

  return parsedDate.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
};

const getProductId = (product?: Product | null): string => {
  if (!product) return "";

  return String(product._id || product.id || "").trim();
};

const getStockValue = (product?: Product | null): number => {
  if (!product) return 0;

  const value = Number(
    product.stock ??
      product.quantity ??
      product.availableStock ??
      0,
  );

  if (!Number.isFinite(value)) return 0;

  return Math.max(0, Math.floor(value));
};

const normalizeProduct = (
  product: Product,
  identifier: string,
): Product => {
  const normalizedId = getProductId(product) || identifier;

  return {
    ...product,
    _id: normalizedId,
    id: product.id || normalizedId,
    name: String(product.name || "Product").trim() || "Product",
    price: Number(product.price || 0),
    oldPrice: Number(product.oldPrice || 0) || undefined,
    stock: getStockValue(product),
    images: Array.isArray(product.images) ? product.images : [],
    shades: Array.isArray(product.shades) ? product.shades : [],
    tags: Array.isArray(product.tags) ? product.tags : [],
  };
};

function ProductDetails() {
  const { id, slug, productId } = useParams<{
    id?: string;
    slug?: string;
    productId?: string;
  }>();

  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const selectedCategory = searchParams.get("category") || "";
  const identifier = id || slug || productId || "";

  const [product, setProduct] = useState<Product | null>(null);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedShade, setSelectedShade] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [isWishlisted, setIsWishlisted] = useState(false);

  const [activeTab, setActiveTab] = useState(
    selectedCategory || "description",
  );

  const [pinCode, setPinCode] = useState("");
  const [deliveryMessage, setDeliveryMessage] = useState("");
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryAvailable, setDeliveryAvailable] = useState(false);

  const [addingToCart, setAddingToCart] = useState(false);

  const pendingCartProcessingRef = useRef<string | null>(null);

  const getCurrentProductPath = () =>
    `${window.location.pathname}${window.location.search}`;

  const savePendingCartItem = (buyNow: boolean) => {
    if (!product) return;

    localStorage.setItem(
      "jihaan_pending_cart_item",
      JSON.stringify({
        productId: getProductId(product),
        quantity,
        size: selectedShade || "Standard",
        buyNow,
        redirectTo: getCurrentProductPath(),
      }),
    );
  };

  const [reviewName, setReviewName] = useState("");
  const [reviewEmail, setReviewEmail] = useState("");
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewMessage, setReviewMessage] = useState("");

  useEffect(() => {
    setActiveTab(selectedCategory || "description");
  }, [selectedCategory]);

  useEffect(() => {
    let cancelled = false;

    const loadProduct = async (): Promise<void> => {
      if (!identifier) {
        setProduct(null);
        setError("Product identifier is missing.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError("");

        const endpoint = slug
          ? `${API_URL}/products/slug/${encodeURIComponent(slug)}`
          : `${API_URL}/products/${encodeURIComponent(identifier)}`;

        console.log("Loading product:", endpoint);

        const response = await fetch(endpoint, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
        });

        const rawText = await response.text();

        let parsed: unknown = null;

        try {
          parsed = rawText ? JSON.parse(rawText) : null;
        } catch {
          throw new Error(
            "The server returned an invalid product response.",
          );
        }

        if (!response.ok) {
          const apiResult =
            parsed && typeof parsed === "object"
              ? (parsed as ApiResponse<Product>)
              : null;

          throw new Error(
            apiResult?.message ||
              `Unable to load product. Server returned ${response.status}.`,
          );
        }

        if (!parsed || typeof parsed !== "object") {
          throw new Error("Product details were not found.");
        }

        const apiResult = parsed as ApiResponse<Product>;
        let receivedProduct: Product | null = null;

        if (
          apiResult.product &&
          typeof apiResult.product === "object"
        ) {
          receivedProduct = apiResult.product;
        }

        if (
          !receivedProduct &&
          apiResult.data &&
          !Array.isArray(apiResult.data) &&
          typeof apiResult.data === "object"
        ) {
          receivedProduct = apiResult.data;
        }

        if (
          !receivedProduct &&
          Array.isArray(apiResult.data) &&
          apiResult.data.length > 0
        ) {
          receivedProduct = apiResult.data[0];
        }

        if (
          !receivedProduct &&
          Array.isArray(apiResult.products) &&
          apiResult.products.length > 0
        ) {
          receivedProduct = apiResult.products[0];
        }

        // Some backend controllers return the product directly.
        const directProduct = parsed as Product;

        if (
          !receivedProduct &&
          typeof directProduct.name === "string"
        ) {
          receivedProduct = directProduct;
        }

        if (!receivedProduct) {
          throw new Error("Product details were not found.");
        }

        const normalizedProduct = normalizeProduct(
          receivedProduct,
          identifier,
        );

        if (!getProductId(normalizedProduct)) {
          throw new Error("Product ID is missing.");
        }

        if (cancelled) return;

        console.log(
          "Product loaded successfully:",
          normalizedProduct,
        );

        setProduct(normalizedProduct);
        setReviews(normalizedProduct.reviewList || []);
        setSelectedImageIndex(0);
        setQuantity(1);
        setSelectedShade(normalizedProduct.shades?.[0] || "");
      } catch (requestError) {
        console.error("Product loading error:", requestError);

        if (!cancelled) {
          setProduct(null);
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Unable to load product.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void loadProduct();

    return () => {
      cancelled = true;
    };
  }, [identifier, slug]);

  useEffect(() => {
    let cancelled = false;

    const loadOffers = async () => {
      try {
        const response = await fetch(`${API_URL}/offers`);
        const result: ApiResponse<Offer> = await response.json();

        if (!response.ok || cancelled) return;

        const receivedOffers =
          result.offers ||
          (Array.isArray(result.data) ? result.data : []);

        setOffers(receivedOffers);
      } catch {
        if (!cancelled) {
          setOffers([]);
        }
      }
    };

    loadOffers();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!getProductId(product)) return;

    let cancelled = false;

    const loadReviews = async () => {
      try {
        const response = await fetch(
          `${API_URL}/products/${encodeURIComponent(
            getProductId(product),
          )}/reviews`,
        );

        const result: ApiResponse<Review> = await response.json();

        if (!response.ok || cancelled) return;

        const receivedReviews =
          result.reviews ||
          (Array.isArray(result.data) ? result.data : []);

        setReviews(receivedReviews);
      } catch {
        if (!cancelled) {
          setReviews(product.reviewList || []);
        }
      }
    };

    loadReviews();

    return () => {
      cancelled = true;
    };
  }, [product?._id, product?.id]);

  const imageList = useMemo(() => {
    if (!product) return [];

    const images = [
      ...(product.images || []),
      product.hoverImage,
      product.beforeImage,
      product.afterImage,
    ].filter(Boolean) as string[];

    return Array.from(new Set(images))
      .map(getImageUrl)
      .filter(Boolean);
  }, [product]);

  const activeImage =
    imageList[selectedImageIndex] || imageList[0] || "";

  const productOffers = useMemo(() => {
    if (!product) return [];

    return offers.filter((offer) =>
      offer.products?.some(
        (productId) => String(productId) === String(product._id),
      ),
    );
  }, [offers, product]);

  const sellingPrice = product ? Number(product.price || 0) : 0;

  const originalPrice = product
    ? Number(product.oldPrice || product.price || 0)
    : 0;

  const discountPercentage = getDiscountPercentage(
    originalPrice,
    sellingPrice,
  );

  const stockCount = getStockValue(product);

  const stockInfo = getStockInfo(stockCount);

  const isOutOfStock = stockInfo.isOutOfStock;

  const youtubeEmbedUrl = getYouTubeEmbedUrl(
    product?.youtubeVideoUrl,
  );

  /*
   * Adds the current product to cart.
   *
   * buyNow = false:
   *   Add item and remain on product page.
   *
   * buyNow = true:
   *   Add item and navigate to /cart.
   *
   * If user is not logged in, the cart action is stored temporarily
   * and the user is sent to login. After login, ProductPage will
   * automatically process the pending cart item.
   */
  const addProductToCart = async (
    buyNow: boolean,
    shouldRedirectToLogin = true,
  ) => {
    if (!product) return false;

    const token = getToken();

    if (!token) {
      savePendingCartItem(buyNow);

      if (shouldRedirectToLogin) {
        navigate("/login", {
          state: {
            redirectTo: getCurrentProductPath(),
          },
        });
      }

      return false;
    }

    if (isOutOfStock) {
      setError("This product is currently out of stock.");
      return false;
    }

    try {
      setAddingToCart(true);
      setError("");

      const response = await fetch(`${API_URL}/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          productId: getProductId(product),
          quantity,
          size: selectedShade || "Standard",
        }),
      });

      const result: ApiResponse<unknown> = await response.json();

      if (response.status === 401 || response.status === 403) {
        savePendingCartItem(buyNow);

        localStorage.removeItem("jihaan_auth_token");
        localStorage.removeItem("token");
        localStorage.removeItem("accessToken");
        localStorage.removeItem("authToken");

        navigate("/login", {
          state: {
            redirectTo: getCurrentProductPath(),
          },
        });

        return false;
      }

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to add product to cart.",
        );
      }

      /*
       * Important:
       * Add to Cart stays on the current product page.
       * Buy Now goes to cart.
       */
      if (buyNow) {
        navigate("/cart");
      }

      return true;
    } catch (cartError) {
      setError(
        cartError instanceof Error
          ? cartError.message
          : "Unable to add product to cart.",
      );

      return false;
    } finally {
      setAddingToCart(false);
    }
  };

  const handleAddToCart = async () => {
    await addProductToCart(false);
  };

  const handleBuyNow = async () => {
    await addProductToCart(true);
  };

  /*
   * After login:
   *
   * 1. Login page should redirect back to the product page.
   * 2. This effect detects the pending cart item.
   * 3. It adds the item using the newly available token.
   * 4. If the original action was Buy Now, it then opens /cart.
   */
  useEffect(() => {
    if (!getProductId(product)) return;

    const pendingItemRaw = localStorage.getItem(
      "jihaan_pending_cart_item",
    );

    if (!pendingItemRaw) return;

    const token = getToken();

    if (!token) return;

    let pendingItem: {
      productId?: string;
      quantity?: number;
      size?: string;
      buyNow?: boolean;
      redirectTo?: string;
    };

    try {
      pendingItem = JSON.parse(pendingItemRaw);
    } catch {
      localStorage.removeItem("jihaan_pending_cart_item");
      return;
    }

    /*
     * Make sure this pending item belongs to the product currently
     * displayed. Also prevents duplicate requests in React StrictMode.
     */
    if (
      String(pendingItem.productId) !== String(getProductId(product)) ||
      pendingCartProcessingRef.current === String(getProductId(product))
    ) {
      return;
    }

    pendingCartProcessingRef.current = String(getProductId(product));

    let cancelled = false;

    const processPendingCartItem = async () => {
      try {
        setAddingToCart(true);
        setError("");

        const response = await fetch(`${API_URL}/cart/items`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            productId: getProductId(product),
            quantity: Math.max(
              1,
              Number(pendingItem.quantity) || 1,
            ),
            size: pendingItem.size || "Standard",
          }),
        });

        const result: ApiResponse<unknown> = await response.json();

        if (response.status === 401 || response.status === 403) {
          localStorage.removeItem("jihaan_pending_cart_item");

          localStorage.removeItem("jihaan_auth_token");
          localStorage.removeItem("token");
          localStorage.removeItem("accessToken");
          localStorage.removeItem("authToken");

          if (!cancelled) {
            navigate("/login", {
              state: {
                redirectTo:
                  pendingItem.redirectTo ||
                  getCurrentProductPath(),
              },
            });
          }

          return;
        }

        if (!response.ok) {
          throw new Error(
            result.message || "Unable to add product to cart.",
          );
        }

        /*
         * Remove only after successful cart API response.
         */
        localStorage.removeItem("jihaan_pending_cart_item");

        /*
         * Add to Cart:
         * stay on product page.
         *
         * Buy Now:
         * go to cart after pending item has been added.
         */
        if (!cancelled && pendingItem.buyNow) {
          navigate("/cart");
        }
      } catch (pendingError) {
        if (!cancelled) {
          setError(
            pendingError instanceof Error
              ? pendingError.message
              : "Unable to add product to cart.",
          );
        }
      } finally {
        if (!cancelled) {
          setAddingToCart(false);
        }
      }
    };

    processPendingCartItem();

    return () => {
      cancelled = true;
    };
  }, [product?._id, product?.id]);

  const handleDeliveryCheck = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const cleanedPin = pinCode.trim();

    if (!/^[1-9][0-9]{5}$/.test(cleanedPin)) {
      setDeliveryAvailable(false);
      setDeliveryMessage(
        "Please enter a valid 6-digit PIN code.",
      );
      return;
    }

    try {
      setDeliveryLoading(true);
      setDeliveryMessage("");

      const response = await fetch(
        `https://api.postalpincode.in/pincode/${cleanedPin}`,
      );

      const result = await response.json();

      const isValid =
        Array.isArray(result) &&
        result[0]?.Status === "Success" &&
        Array.isArray(result[0]?.PostOffice) &&
        result[0].PostOffice.length > 0;

      if (!isValid) {
        setDeliveryAvailable(false);
        setDeliveryMessage(
          "Delivery is not available for this PIN code.",
        );
        return;
      }

      setDeliveryAvailable(true);
      setDeliveryMessage(
        "Delivery is available for this PIN code.",
      );
    } catch {
      setDeliveryAvailable(false);
      setDeliveryMessage(
        "Unable to check delivery right now. Please try again.",
      );
    } finally {
      setDeliveryLoading(false);
    }
  };

  const handleSubmitReview = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    if (!product) return;

    const token = getToken();

    if (!token) {
      navigate("/login", {
        state: {
          redirectTo: getCurrentProductPath(),
        },
      });

      return;
    }

    if (!reviewName.trim() || !reviewComment.trim()) {
      setReviewMessage("Please enter your name and review.");
      return;
    }

    try {
      setReviewLoading(true);
      setReviewMessage("");

      const response = await fetch(
        `${API_URL}/products/${encodeURIComponent(
          getProductId(product),
        )}/reviews`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name: reviewName.trim(),
            email: reviewEmail.trim() || undefined,
            rating: reviewRating,
            comment: reviewComment.trim(),
          }),
        },
      );

      const result: ApiResponse<Review> = await response.json();

      if (response.status === 401 || response.status === 403) {
        navigate("/login", {
          state: {
            redirectTo: getCurrentProductPath(),
          },
        });

        return;
      }

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to submit review.",
        );
      }

      const newReview =
        result.data && !Array.isArray(result.data)
          ? result.data
          : undefined;

      if (newReview) {
        setReviews((currentReviews) => [
          newReview,
          ...currentReviews,
        ]);
      }

      setReviewName("");
      setReviewEmail("");
      setReviewRating(5);
      setReviewComment("");

      setReviewMessage(
        "Your review was submitted successfully.",
      );
    } catch (reviewError) {
      setReviewMessage(
        reviewError instanceof Error
          ? reviewError.message
          : "Unable to submit review.",
      );
    } finally {
      setReviewLoading(false);
    }
  };

  const changeImage = (
    direction: "next" | "previous",
  ) => {
    if (!imageList.length) return;

    setSelectedImageIndex((currentIndex) => {
      if (direction === "next") {
        return (currentIndex + 1) % imageList.length;
      }

      return (
        (currentIndex - 1 + imageList.length) %
        imageList.length
      );
    });
  };

  if (loading) {
    return (
      <>
        <MainHeader />

        <main className={styles.notFound}>
          <LoaderCircle
            className={styles.spin}
            size={32}
          />

          <p>Loading product details...</p>
        </main>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <MainHeader />

        <main className={styles.notFound}>
          <h1>Product Not Found</h1>

          <p>
            {error || "The product is unavailable."}
          </p>

          <button
            type="button"
            className={styles.backButton}
            onClick={() => navigate("/")}
          >
            Back to Home
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <MainHeader />

      <main className={styles.page}>
        <div className={styles.container}>
          <button
            type="button"
            className={styles.backLink}
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={17} />
            Back to Products
          </button>

          {error && (
            <div className={styles.errorMessage}>
              {error}
            </div>
          )}

          <section className={styles.productLayout}>
            <div className={styles.gallery}>
              <div className={styles.mainMedia}>
                {activeImage ? (
                  <ImageZoom
                    src={activeImage}
                    alt={product.name}
                  />
                ) : (
                  <div className={styles.imagePlaceholder}>
                    No image available
                  </div>
                )}

                {imageList.length > 1 && (
                  <>
                    <button
                      type="button"
                      className={`${styles.imageArrow} ${styles.previousArrow}`}
                      onClick={() =>
                        changeImage("previous")
                      }
                      aria-label="Previous image"
                    >
                      <ArrowLeft size={18} />
                    </button>

                    <button
                      type="button"
                      className={`${styles.imageArrow} ${styles.nextArrow}`}
                      onClick={() =>
                        changeImage("next")
                      }
                      aria-label="Next image"
                    >
                      <ArrowLeft size={18} />
                    </button>
                  </>
                )}
              </div>

              {imageList.length > 0 && (
                <div className={styles.thumbnailGrid}>
                  {imageList.map((image, index) => (
                    <button
                      type="button"
                      key={`${image}-${index}`}
                      className={`${styles.thumbnail} ${
                        selectedImageIndex === index
                          ? styles.selectedThumbnail
                          : ""
                      }`}
                      onClick={() =>
                        setSelectedImageIndex(index)
                      }
                      aria-label={`View product image ${
                        index + 1
                      }`}
                    >
                      <img
                        src={image}
                        alt={`${product.name} ${
                          index + 1
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className={styles.productContent}>
              <div className={styles.topLine}>
                {product.brand && (
                  <span className={styles.brand}>
                    {product.brand}
                  </span>
                )}

                {product.badge && (
                  <span className={styles.badge}>
                    {product.badge}
                  </span>
                )}
              </div>

              <h1>{product.name}</h1>

              <div className={styles.ratingRow}>
                <div className={styles.rating}>
                  <Star
                    size={16}
                    fill="currentColor"
                  />

                  <span>
                    {Number(
                      product.rating || 0,
                    ).toFixed(1)}
                  </span>
                </div>

                <span className={styles.reviews}>
                  {product.reviews ||
                    reviews.length}{" "}
                  customer reviews
                </span>
              </div>

              <div className={styles.priceRow}>
                <strong>
                  {formatPrice(sellingPrice)}
                </strong>

                {originalPrice > sellingPrice && (
                  <>
                    <del>
                      {formatPrice(originalPrice)}
                    </del>

                    <span>
                      {discountPercentage}% OFF
                    </span>
                  </>
                )}
              </div>

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

              <p className={styles.description}>
                {product.description ||
                  "Discover the details and benefits of this product."}
              </p>

              {product.shades &&
                product.shades.length > 0 && (
                  <div
                    className={
                      styles.specificationSection
                    }
                  >
                    <div
                      className={styles.sectionLabel}
                    >
                      Available shades
                    </div>

                    <div
                      className={
                        styles.specificationGrid
                      }
                    >
                      {product.shades.map(
                        (shade) => (
                          <button
                            type="button"
                            key={shade}
                            className={`${
                              styles.specificationButton
                            } ${
                              selectedShade ===
                              shade
                                ? styles.selectedSpecification
                                : ""
                            }`}
                            onClick={() =>
                              setSelectedShade(
                                shade,
                              )
                            }
                          >
                            {selectedShade ===
                              shade && (
                              <Check size={14} />
                            )}

                            {shade}
                          </button>
                        ),
                      )}
                    </div>
                  </div>
                )}

              <div className={styles.featureList}>
                <div>
                  <Check size={17} />
                  Carefully selected ingredients
                </div>

                <div>
                  <Check size={17} />
                  Secure and reliable checkout
                </div>

                <div>
                  <Check size={17} />
                  Quality assured products
                </div>
              </div>

              <div className={styles.quantitySection}>
                <span>Quantity</span>

                <div
                  className={
                    styles.quantityControl
                  }
                >
                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((value) =>
                        Math.max(1, value - 1),
                      )
                    }
                    disabled={
                      quantity <= 1 ||
                      isOutOfStock
                    }
                    aria-label="Decrease quantity"
                  >
                    <Minus size={15} />
                  </button>

                  <span>{quantity}</span>

                  <button
                    type="button"
                    onClick={() =>
                      setQuantity((value) =>
                        Math.min(
                          stockCount,
                          value + 1,
                        ),
                      )
                    }
                    disabled={
                      isOutOfStock ||
                      quantity >= stockCount
                    }
                    aria-label="Increase quantity"
                  >
                    <Plus size={15} />
                  </button>
                </div>
              </div>

              <div className={styles.actionRow}>
                <button
                  type="button"
                  className={styles.addToCart}
                  onClick={handleAddToCart}
                  disabled={
                    addingToCart ||
                    isOutOfStock
                  }
                >
                  <ShoppingBag size={19} />

                  {addingToCart
                    ? "Adding..."
                    : isOutOfStock
                      ? "Out of Stock"
                      : "Add to Cart"}
                </button>

                <button
                  type="button"
                  className={styles.addToCart}
                  onClick={handleBuyNow}
                  disabled={
                    addingToCart ||
                    isOutOfStock
                  }
                >
                  {addingToCart
                    ? "Processing..."
                    : "Buy Now"}
                </button>

                <button
                  type="button"
                  className={`${
                    styles.wishlistButton
                  } ${
                    isWishlisted
                      ? styles.wishlisted
                      : ""
                  }`}
                  onClick={() =>
                    setIsWishlisted(
                      (value) => !value,
                    )
                  }
                  aria-label="Toggle wishlist"
                >
                  <Heart
                    size={20}
                    fill={
                      isWishlisted
                        ? "currentColor"
                        : "none"
                    }
                  />
                </button>
              </div>

              <div
                className={
                  styles.deliveryCard
                }
              >
                <div
                  className={
                    styles.deliveryHeader
                  }
                >
                  <Truck size={20} />

                  <strong>
                    Check delivery availability
                  </strong>
                </div>

                <form
                  className={
                    styles.deliveryForm
                  }
                  onSubmit={
                    handleDeliveryCheck
                  }
                >
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    placeholder="Enter delivery PIN code"
                    value={pinCode}
                    onChange={(event) => {
                      setPinCode(
                        event.target.value.replace(
                          /\D/g,
                          "",
                        ),
                      );

                      setDeliveryMessage("");
                      setDeliveryAvailable(
                        false,
                      );
                    }}
                  />

                  <button
                    type="submit"
                    disabled={
                      deliveryLoading
                    }
                  >
                    {deliveryLoading
                      ? "Checking..."
                      : "Check"}
                  </button>
                </form>

                {deliveryMessage && (
                  <p
                    className={
                      deliveryAvailable
                        ? styles.deliverySuccess
                        : styles.deliveryMessage
                    }
                  >
                    {deliveryMessage}
                  </p>
                )}
              </div>

              <div
                className={
                  styles.deliveryInfo
                }
              >
                <div>
                  <strong>
                    Free shipping
                  </strong>

                  <span>
                    On orders above ₹999
                  </span>
                </div>

                <div>
                  <strong>
                    Secure payment
                  </strong>

                  <span>
                    100% secure checkout
                  </span>
                </div>
              </div>
            </div>
          </section>

          {productOffers.length > 0 && (
            <section
              className={
                styles.offerSection
              }
            >
              <div
                className={
                  styles.sectionHeading
                }
              >
                <span>
                  Special Offers
                </span>

                <h2>
                  Available offers
                </h2>
              </div>

              <div
                className={styles.offerGrid}
              >
                {productOffers.map(
                  (offer) => (
                    <article
                      className={
                        styles.offerCard
                      }
                      key={offer._id}
                    >
                      <img
                        src={getImageUrl(
                          offer.demoImage ||
                            offer.image,
                        )}
                        alt={offer.name}
                      />

                      <div
                        className={
                          styles.offerContent
                        }
                      >
                        <span
                          className={
                            styles.offerBadge
                          }
                        >
                          {offer.discount}
                        </span>

                        <h3>
                          {offer.name}
                        </h3>

                        <div
                          className={
                            styles.offerPrice
                          }
                        >
                          <strong>
                            {formatPrice(
                              offer.price,
                            )}
                          </strong>

                          {offer.oldPrice >
                            offer.price && (
                            <del>
                              {formatPrice(
                                offer.oldPrice,
                              )}
                            </del>
                          )}
                        </div>

                        {offer.prepaidPrice &&
                          offer.prepaidPrice >
                            0 && (
                            <p>
                              Prepaid price:{" "}
                              <strong>
                                {formatPrice(
                                  offer.prepaidPrice,
                                )}
                              </strong>
                            </p>
                          )}
                      </div>
                    </article>
                  ),
                )}
              </div>
            </section>
          )}

          {(product.video ||
            youtubeEmbedUrl) && (
            <section
              className={
                styles.videoSection
              }
            >
              <div
                className={
                  styles.sectionHeading
                }
              >
                <span>
                  Product Video
                </span>

                <h2>
                  See the product in action
                </h2>
              </div>

              <div
                className={
                  styles.videoPlayer
                }
              >
                {product.video ? (
                  <video
                    controls
                    preload="metadata"
                    poster={getImageUrl(
                      product.images?.[0],
                    )}
                  >
                    <source
                      src={getImageUrl(
                        product.video,
                      )}
                      type="video/mp4"
                    />

                    Your browser does not
                    support video playback.
                  </video>
                ) : (
                  <iframe
                    src={youtubeEmbedUrl}
                    title={`${product.name} product video`}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                  />
                )}
              </div>
            </section>
          )}

          <section
            className={
              styles.detailsSection
            }
          >
            <div className={styles.tabs}>
              {[
                [
                  "description",
                  "Description",
                ],
                [
                  "ingredients",
                  "Ingredients",
                ],
                ["benefits", "Benefits"],
                ["usage", "How to Use"],
                ["details", "Details"],
                ["reviews", "Reviews"],
              ].map(
                ([value, label]) => (
                  <button
                    type="button"
                    key={value}
                    className={
                      activeTab === value
                        ? styles.activeTab
                        : ""
                    }
                    onClick={() =>
                      setActiveTab(value)
                    }
                  >
                    {label}
                  </button>
                ),
              )}
            </div>

            <div
              className={
                styles.tabContent
              }
            >
              {activeTab ===
                "description" && (
                <div
                  className={
                    styles.contentBlock
                  }
                >
                  <h3>
                    Product Description
                  </h3>

                  <p>
                    {product.description ||
                      "No description available."}
                  </p>
                </div>
              )}

              {activeTab ===
                "ingredients" && (
                <div
                  className={
                    styles.contentBlock
                  }
                >
                  <h3>
                    Ingredients
                  </h3>

                  <p>
                    {product.ingredients ||
                      "Ingredient information is not available."}
                  </p>
                </div>
              )}

              {activeTab ===
                "benefits" && (
                <div
                  className={
                    styles.contentBlock
                  }
                >
                  <h3>
                    Benefits
                  </h3>

                  <p>
                    {product.benefits ||
                      "Benefits information is not available."}
                  </p>
                </div>
              )}

              {activeTab === "usage" && (
                <div
                  className={
                    styles.contentBlock
                  }
                >
                  <h3>
                    How to Use
                  </h3>

                  <p>
                    {product.howToUse ||
                      "Usage instructions are not available."}
                  </p>
                </div>
              )}

              {activeTab === "details" && (
                <div
                  className={
                    styles.contentBlock
                  }
                >
                  <h3>
                    Additional Details
                  </h3>

                  {product.additionalDetails && (
                    <p>
                      {
                        product.additionalDetails
                      }
                    </p>
                  )}

                  {product.composition && (
                    <div
                      className={
                        styles.detailRow
                      }
                    >
                      <strong>
                        Composition
                      </strong>

                      <span>
                        {
                          product.composition
                        }
                      </span>
                    </div>
                  )}

                  {product.brand && (
                    <div
                      className={
                        styles.detailRow
                      }
                    >
                      <strong>
                        Brand
                      </strong>

                      <span>
                        {product.brand}
                      </span>
                    </div>
                  )}

                  {product.category && (
                    <div
                      className={
                        styles.detailRow
                      }
                    >
                      <strong>
                        Category
                      </strong>

                      <span>
                        {product.category}
                      </span>
                    </div>
                  )}

                  {product.subcategory && (
                    <div
                      className={
                        styles.detailRow
                      }
                    >
                      <strong>
                        Subcategory
                      </strong>

                      <span>
                        {
                          product.subcategory
                        }
                      </span>
                    </div>
                  )}

                  {product.tags &&
                    product.tags
                      .length > 0 && (
                      <div
                        className={
                          styles.detailRow
                        }
                      >
                        <strong>
                          Tags
                        </strong>

                        <span>
                          {product.tags.join(
                            ", ",
                          )}
                        </span>
                      </div>
                    )}
                </div>
              )}

              {activeTab ===
                "reviews" && (
                <div
                  className={
                    styles.reviewsSection
                  }
                >
                  <div
                    className={
                      styles.reviewSummary
                    }
                  >
                    <div
                      className={
                        styles.reviewScore
                      }
                    >
                      <strong>
                        {Number(
                          product.rating ||
                            0,
                        ).toFixed(1)}
                      </strong>

                      <div
                        className={
                          styles.stars
                        }
                      >
                        {Array.from({
                          length: 5,
                        }).map(
                          (_, index) => (
                            <Star
                              key={index}
                              size={18}
                              fill={
                                index <
                                Math.round(
                                  product.rating ||
                                    0,
                                )
                                  ? "currentColor"
                                  : "none"
                              }
                            />
                          ),
                        )}
                      </div>

                      <span>
                        Based on{" "}
                        {reviews.length}{" "}
                        reviews
                      </span>
                    </div>

                    <form
                      className={
                        styles.reviewForm
                      }
                      onSubmit={
                        handleSubmitReview
                      }
                    >
                      <h3>
                        Write a Review
                      </h3>

                      <div
                        className={
                          styles.formGrid
                        }
                      >
                        <input
                          type="text"
                          placeholder="Your name"
                          value={reviewName}
                          onChange={(
                            event,
                          ) =>
                            setReviewName(
                              event.target
                                .value,
                            )
                          }
                          required
                        />

                        <input
                          type="email"
                          placeholder="Email address"
                          value={
                            reviewEmail
                          }
                          onChange={(
                            event,
                          ) =>
                            setReviewEmail(
                              event.target
                                .value,
                            )
                          }
                        />
                      </div>

                      <div
                        className={
                          styles.reviewRatingInput
                        }
                      >
                        <span>
                          Your rating
                        </span>

                        <div
                          className={
                            styles.ratingButtons
                          }
                        >
                          {Array.from({
                            length: 5,
                          }).map(
                            (_, index) => {
                              const rating =
                                index + 1;

                              return (
                                <button
                                  type="button"
                                  key={
                                    rating
                                  }
                                  onClick={() =>
                                    setReviewRating(
                                      rating,
                                    )
                                  }
                                  aria-label={`Give ${rating} stars`}
                                >
                                  <Star
                                    size={21}
                                    fill={
                                      rating <=
                                      reviewRating
                                        ? "currentColor"
                                        : "none"
                                    }
                                  />
                                </button>
                              );
                            },
                          )}
                        </div>
                      </div>

                      <textarea
                        rows={5}
                        maxLength={1000}
                        placeholder="Share your experience..."
                        value={
                          reviewComment
                        }
                        onChange={(
                          event,
                        ) =>
                          setReviewComment(
                            event.target
                              .value,
                          )
                        }
                        required
                      />

                      <button
                        type="submit"
                        className={
                          styles.submitReviewButton
                        }
                        disabled={
                          reviewLoading
                        }
                      >
                        {reviewLoading
                          ? "Submitting..."
                          : "Submit Review"}
                      </button>

                      {reviewMessage && (
                        <p
                          className={
                            styles.reviewMessage
                          }
                        >
                          {reviewMessage}
                        </p>
                      )}
                    </form>
                  </div>

                  <div
                    className={
                      styles.reviewList
                    }
                  >
                    {reviews.length ===
                    0 ? (
                      <div
                        className={
                          styles.emptyReviews
                        }
                      >
                        <Star size={28} />

                        <p>
                          No reviews yet.
                          Be the first
                          to review this
                          product.
                        </p>
                      </div>
                    ) : (
                      reviews.map(
                        (
                          review,
                          index,
                        ) => (
                          <article
                            className={
                              styles.reviewCard
                            }
                            key={
                              review._id ||
                              `${review.name}-${index}`
                            }
                          >
                            <div
                              className={
                                styles.reviewCardHeader
                              }
                            >
                              <div>
                                <h4>
                                  {
                                    review.name
                                  }
                                </h4>

                                {review.createdAt && (
                                  <span>
                                    {formatDate(
                                      review.createdAt,
                                    )}
                                  </span>
                                )}
                              </div>

                              <div
                                className={
                                  styles.stars
                                }
                              >
                                {Array.from({
                                  length: 5,
                                }).map(
                                  (
                                    _,
                                    starIndex,
                                  ) => (
                                    <Star
                                      key={
                                        starIndex
                                      }
                                      size={
                                        15
                                      }
                                      fill={
                                        starIndex <
                                        review.rating
                                          ? "currentColor"
                                          : "none"
                                      }
                                    />
                                  ),
                                )}
                              </div>
                            </div>

                            <p>
                              {
                                review.comment
                              }
                            </p>

                            {review.verifiedPurchase && (
                              <span
                                className={
                                  styles.verifiedReview
                                }
                              >
                                <Check
                                  size={
                                    13
                                  }
                                />

                                Verified
                                Purchase
                              </span>
                            )}
                          </article>
                        ),
                      )
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>
    </>
  );
}

function ImageZoom({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [isHovering, setIsHovering] =
    useState(false);

  const [lensPosition, setLensPosition] =
    useState({
      x: 50,
      y: 50,
    });

  const handleMouseMove = (
    event: MouseEvent<HTMLDivElement>,
  ) => {
    const bounds =
      event.currentTarget.getBoundingClientRect();

    const x =
      ((event.clientX - bounds.left) /
        bounds.width) *
      100;

    const y =
      ((event.clientY - bounds.top) /
        bounds.height) *
      100;

    setLensPosition({
      x: Math.max(
        0,
        Math.min(100, x),
      ),
      y: Math.max(
        0,
        Math.min(100, y),
      ),
    });
  };

  return (
    <div
      className={
        styles.zoomContainer
      }
      onMouseEnter={() =>
        setIsHovering(true)
      }
      onMouseLeave={() =>
        setIsHovering(false)
      }
      onMouseMove={handleMouseMove}
    >
      <img
        className={styles.mainImage}
        src={src}
        alt={alt}
      />

      {isHovering && (
        <>
          <div
            className={styles.zoomLens}
            style={{
              left: `${lensPosition.x}%`,
              top: `${lensPosition.y}%`,
            }}
          />

          <div
            className={
              styles.zoomPreview
            }
            style={{
              backgroundImage: `url(${src})`,
              backgroundPosition: `${lensPosition.x}% ${lensPosition.y}%`,
            }}
            aria-hidden="true"
          />
        </>
      )}
    </div>
  );
}

export default ProductDetails;