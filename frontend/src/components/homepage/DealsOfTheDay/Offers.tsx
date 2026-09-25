import {
  AlertCircle,
  ChevronUp,
  Heart,
  Image as ImageIcon,
  LoaderCircle,
  ShoppingBag,
  Star,
  Zap,
} from "lucide-react";
import { Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import { useEffect, useState } from "react";

import "swiper/css";
import styles from "./Offers.module.css";

type BackendProduct = {
  _id?: string;
  id?: string;
  productId?: string;
  name?: string;
  title?: string;
  brand?: string;
  category?: string;
  rating?: number;
  reviews?: number;
  oldPrice?: number;
  price?: number;
  salePrice?: number;
  discountPrice?: number;
  sellingPrice?: number;
  image?: string;
  images?: string[];
  thumbnail?: string;
  hoverImage?: string;
  stock?: number;
  isActive?: boolean;
};

type BackendOffer = {
  _id: string;
  name: string;
  products?: BackendProduct[] | string[];
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
  sortOrder?: number;
};

type OffersResponse = {
  success?: boolean;
  count?: number;
  offers?: BackendOffer[];
  message?: string;
};

type Product = {
  id: string;
  name: string;
  brand: string;
  category: string;
  rating: number;
  reviews: number;
  oldPrice: number;
  price: number;
  discount: string;
  prepaidPrice?: number;
  image: string;
  hoverImage: string;
  active: boolean;
};

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "https://jihaan-cosmetics.onrender.com",
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

const getToken = () => {
  return localStorage.getItem("jihaan_auth_token") || "";
};

const getImageUrl = (image?: string) => {
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

const getProductId = (product?: BackendProduct) => {
  if (!product) {
    return "";
  }

  return String(product._id || product.id || product.productId || "");
};

const getProductImage = (product?: BackendProduct) => {
  if (!product) {
    return "";
  }

  return getImageUrl(
    product.image ||
      product.thumbnail ||
      product.images?.[0] ||
      "",
  );
};

const getProductHoverImage = (product?: BackendProduct) => {
  if (!product) {
    return "";
  }

  return getImageUrl(
    product.hoverImage ||
      product.images?.[1] ||
      "",
  );
};

const formatPrice = (price: number) => {
  return `₹${Number(price || 0).toLocaleString("en-IN")}`;
};

const mapOfferToProduct = (
  offer: BackendOffer,
  product?: BackendProduct,
  productId = "",
): Product => {
  const actualProductId = productId || getProductId(product);

  return {
    /*
     * Important:
     * This is the Product collection ID.
     * Never use offer._id for the cart request.
     */
    id: actualProductId,
    name: offer.name || product?.name || product?.title || "Product",
    brand: offer.brand || product?.brand || "",
    category: offer.category || product?.category || "",
    rating: Number(offer.rating ?? product?.rating ?? 0),
    reviews: Number(offer.reviews ?? product?.reviews ?? 0),
    oldPrice: Number(offer.oldPrice ?? product?.oldPrice ?? 0),
    price: Number(
      offer.price ??
        product?.salePrice ??
        product?.discountPrice ??
        product?.sellingPrice ??
        product?.price ??
        0,
    ),
    discount: offer.discount || "",
    prepaidPrice:
      offer.prepaidPrice !== undefined
        ? Number(offer.prepaidPrice)
        : undefined,
    image:
      getImageUrl(offer.image) ||
      getProductImage(product),
    hoverImage:
      getImageUrl(offer.demoImage) ||
      getProductHoverImage(product),
    active: offer.active !== false,
  };
};

function Offers() {
  const [products, setProducts] = useState<Product[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [addingProductId, setAddingProductId] = useState<string | null>(
    null,
  );

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(`${API_BASE_URL}/api/offers`);
      const data = (await response.json()) as OffersResponse;

      if (!response.ok || data.success === false) {
        throw new Error(data.message || "Failed to fetch offers.");
      }

      const offers = Array.isArray(data.offers) ? data.offers : [];

      const mappedProducts = offers
        .filter((offer) => offer.active !== false)
        .map((offer) => {
          const firstProduct = offer.products?.[0];

          if (!firstProduct) {
            console.warn("Offer has no product:", offer._id);
            return null;
          }

          if (typeof firstProduct === "string") {
            return mapOfferToProduct(
              offer,
              undefined,
              firstProduct,
            );
          }

          return mapOfferToProduct(
            offer,
            firstProduct,
            getProductId(firstProduct),
          );
        })
        .filter((product): product is Product => {
          return Boolean(product?.id);
        });

      setProducts(mappedProducts);
    } catch (err) {
      console.error("Fetch offers error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load offers.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();
  }, []);

  const handleAddToCart = async (product: Product) => {
    if (!product.id) {
      alert("Product ID is missing. Please check the offer data.");
      return;
    }

    const token = getToken();

    if (!token) {
      alert("Please login first.");
      return;
    }

    try {
      setAddingProductId(product.id);

      const requestBody = {
        productId: String(product.id),
        quantity: 1,
        size: "Standard",
      };

      console.log("Add to cart request:", {
        url: `${API_BASE_URL}/api/cart/items`,
        body: requestBody,
      });

      const response = await fetch(`${API_BASE_URL}/api/cart/items`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
        body: JSON.stringify(requestBody),
      });

      const data = await response.json().catch(() => ({}));

      console.log("Add to cart response:", {
        status: response.status,
        data,
      });

      if (!response.ok || data.success === false) {
        throw new Error(
          data.message || "Product could not be added to cart.",
        );
      }

      window.dispatchEvent(new Event("cartUpdated"));

      alert("Product added to cart successfully.");
    } catch (err) {
      console.error("Add to cart error:", err);

      alert(
        err instanceof Error
          ? err.message
          : "Product could not be added to cart.",
      );
    } finally {
      setAddingProductId(null);
    }
  };

  const handleWishlist = (product: Product) => {
    const savedWishlist = localStorage.getItem("wishlist");

    let wishlist: Product[] = [];

    try {
      wishlist = savedWishlist ? JSON.parse(savedWishlist) : [];
    } catch {
      wishlist = [];
    }

    const exists = wishlist.some((item) => item.id === product.id);

    const updatedWishlist = exists
      ? wishlist.filter((item) => item.id !== product.id)
      : [...wishlist, product];

    localStorage.setItem("wishlist", JSON.stringify(updatedWishlist));

    window.dispatchEvent(new Event("wishlistUpdated"));

    alert(
      exists
        ? "Removed from wishlist."
        : "Added to wishlist.",
    );
  };

  const getDiscountText = (product: Product) => {
    if (product.discount) {
      return product.discount;
    }

    if (
      product.oldPrice > 0 &&
      product.oldPrice > product.price
    ) {
      const discount = Math.round(
        ((product.oldPrice - product.price) / product.oldPrice) * 100,
      );

      return `${discount}% OFF`;
    }

    return "";
  };

  const renderProductCard = (product: Product) => {
    const discountText = getDiscountText(product);
    const isAdding = addingProductId === product.id;

    return (
      <article className={styles.productCard} key={product.id}>
        <div className={styles.productImageWrapper}>
          <span className={styles.newBadge}>OFFER</span>

          <button
            type="button"
            className={styles.favoriteButton}
            onClick={() => handleWishlist(product)}
            aria-label={`Add ${product.name} to wishlist`}
          >
            <Heart size={18} />
          </button>

          {product.image ? (
            <div className={styles.imagePreview}>
              <img
                src={product.image}
                alt={product.name}
                className={`${styles.productImage} ${styles.mainImage}`}
                loading="lazy"
              />

              {product.hoverImage && (
                <img
                  src={product.hoverImage}
                  alt={`${product.name} alternate view`}
                  className={`${styles.productImage} ${styles.demoImage}`}
                  loading="lazy"
                />
              )}
            </div>
          ) : (
            <div className={styles.imageFallback}>
              <ImageIcon size={40} />
              <span>No image</span>
            </div>
          )}

          <span className={styles.shadeBadge}>Limited Offer</span>
        </div>

        <div className={styles.productContent}>
          <div className={styles.category}>{product.category}</div>

          <h3>{product.name}</h3>

          {product.brand && (
            <p className={styles.brand}>{product.brand}</p>
          )}

          {product.rating > 0 && (
            <div className={styles.rating}>
              <Star size={15} fill="currentColor" />
              <span>{product.rating.toFixed(1)}</span>
              <span className={styles.reviewCount}>
                ({product.reviews} reviews)
              </span>
            </div>
          )}

          <div className={styles.priceRow}>
            {product.oldPrice > product.price && (
              <span className={styles.oldPrice}>
                {formatPrice(product.oldPrice)}
              </span>
            )}

            <strong>{formatPrice(product.price)}</strong>

            {discountText && (
              <span className={styles.discount}>
                {discountText}
              </span>
            )}
          </div>

          {product.prepaidPrice !== undefined &&
            product.prepaidPrice > 0 && (
              <div className={styles.prepaidPrice}>
                {formatPrice(product.prepaidPrice)} Prepaid Price
              </div>
            )}

          <button
            type="button"
            className={styles.cartButton}
            onClick={() => handleAddToCart(product)}
            disabled={isAdding || !product.id}
          >
            {isAdding ? (
              <>
                <LoaderCircle
                  size={17}
                  className={styles.loadingIcon}
                />
                ADDING...
              </>
            ) : (
              <>
                <ShoppingBag size={17} />
                ADD TO CART
              </>
            )}
          </button>
        </div>
      </article>
    );
  };

  if (loading) {
    return (
      <section className={styles.section} id="offers">
        <div className={styles.sectionHeader}>
          <div className={styles.ribbon}>OFFERS</div>
        </div>

        <div className={styles.loadingState}>
          <LoaderCircle
            size={30}
            className={styles.loadingIcon}
          />
          <span>Loading latest offers...</span>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className={styles.section} id="offers">
        <div className={styles.sectionHeader}>
          <div className={styles.ribbon}>OFFERS</div>
        </div>

        <div className={styles.errorState}>
          <AlertCircle size={30} />
          <p>{error}</p>

          <button type="button" onClick={fetchOffers}>
            Try Again
          </button>
        </div>
      </section>
    );
  }

  if (products.length === 0) {
    return null;
  }

  return (
    <section className={styles.section} id="offers">
      <div className={styles.sectionHeader}>
        <div className={styles.ribbon}>OFFERS</div>

        <button
          type="button"
          className={styles.viewAll}
          onClick={() => setShowAll((value) => !value)}
          aria-expanded={showAll}
        >
          {showAll ? (
            <>
              Show Less
              <ChevronUp size={17} />
            </>
          ) : (
            "View All"
          )}
        </button>
      </div>

      <div className={styles.timer}>
        <Zap size={18} fill="currentColor" />
        <span>Limited time offers available now</span>
      </div>

      {showAll ? (
        <div className={styles.allDealsGrid}>
          {products.map(renderProductCard)}
        </div>
      ) : (
        <Swiper
          className={styles.dealsSwiper}
          modules={[Autoplay]}
          spaceBetween={18}
          slidesPerView={1.15}
          autoplay={{
            delay: 3500,
            disableOnInteraction: false,
          }}
          breakpoints={{
            480: {
              slidesPerView: 1.5,
            },
            640: {
              slidesPerView: 2,
            },
            900: {
              slidesPerView: 3,
            },
            1200: {
              slidesPerView: 4,
            },
          }}
        >
          {products.map((product) => (
            <SwiperSlide key={product.id}>
              {renderProductCard(product)}
            </SwiperSlide>
          ))}
        </Swiper>
      )}
    </section>
  );
}

export default Offers;