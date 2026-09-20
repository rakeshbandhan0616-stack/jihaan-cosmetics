import { useState } from "react";
import { LoaderCircle, ShoppingBag } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./ProductCard.module.css";

type Product = {
  _id?: string;
  id?: string;
  name: string;
  brand?: string;
  category?: string;
  price: number;
  oldPrice?: number;
  discountType?: "percentage" | "fixed" | "flat" | "none" | string;
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

type ProductCardProps = {
  product: Product;
};

type CartApiResponse = {
  success?: boolean;
  message?: string;
  cart?: unknown;
  data?: unknown;
};

const API_BASE_URL = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api",
).replace(/\/+$/, "");

const AUTH_TOKEN_KEY = "jihaan_auth_token";

function getToken(): string {
  if (typeof window === "undefined") {
    return "";
  }

  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
}

function getUploadBaseUrl(): string {
  try {
    const apiUrl = new URL(API_BASE_URL);
    return `${apiUrl.protocol}//${apiUrl.host}`;
  } catch {
    return "http://localhost:5000";
  }
}

function getImageUrl(image?: string): string {
  if (!image) {
    return "/placeholder-product.jpg";
  }

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  const uploadBaseUrl = getUploadBaseUrl();

  if (image.startsWith("/")) {
    return `${uploadBaseUrl}${image}`;
  }

  return `${uploadBaseUrl}/${image}`;
}

function formatPrice(price: number): string {
  return `₹${Number(price || 0).toLocaleString("en-IN")}`;
}

function getDiscountPercentage(product: Product): number {
  if (
    product.discountType === "percentage" &&
    typeof product.discountValue === "number"
  ) {
    return Math.round(product.discountValue);
  }

  if (
    product.oldPrice &&
    product.oldPrice > product.price &&
    product.price > 0
  ) {
    return Math.round(
      ((product.oldPrice - product.price) / product.oldPrice) * 100,
    );
  }

  return 0;
}

function getStockStatus(stock: number): {
  label: string;
  className: string;
} {
  if (stock <= 0) {
    return {
      label: "Out of Stock",
      className: styles.outOfStock,
    };
  }

  if (stock <= 5) {
    return {
      label: `Only ${stock} left`,
      className: styles.lowStock,
    };
  }

  return {
    label: `${stock} in stock`,
    className: styles.inStock,
  };
}

export default function ProductCard({
  product,
}: ProductCardProps): JSX.Element {
  const navigate = useNavigate();

  const [addingToCart, setAddingToCart] = useState(false);

  const productId = product._id || product.id || "";

  const primaryImage = getImageUrl(product.images?.[0]);

  const hoverImage = getImageUrl(
    product.hoverImage || product.images?.[1] || product.images?.[0],
  );

  const discountPercentage = getDiscountPercentage(product);

  const stockCount = Math.max(0, Number(product.stock ?? 0));
  const stockStatus = getStockStatus(stockCount);
  const isOutOfStock = stockCount <= 0;

  const productPath = productId ? `/products/${productId}` : "/products";

  const handleProductClick = (): void => {
    if (!productId) {
      alert("Product ID is missing.");
      return;
    }

    navigate(productPath);
  };

  const handleAddToCart = async (): Promise<void> => {
    if (addingToCart) {
      return;
    }

    if (isOutOfStock) {
      alert("This product is currently out of stock.");
      return;
    }

    const token = getToken();

    if (!token) {
      alert("Please login to add products to your cart.");
      navigate("/login");
      return;
    }

    if (!productId) {
      alert("Unable to add this product. Product ID is missing.");
      return;
    }

    try {
      setAddingToCart(true);

      const response = await fetch(`${API_BASE_URL}/cart/items`, {
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
      });

      const result: CartApiResponse = await response
        .json()
        .catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          result.message || "Unable to add product to cart.",
        );
      }

      alert(result.message || "Product added to cart successfully.");

      window.dispatchEvent(new Event("cartUpdated"));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Something went wrong while adding the product to cart.";

      alert(message);
    } finally {
      setAddingToCart(false);
    }
  };

  return (
    <article className={styles.card}>
      <div
        className={styles.imageWrapper}
        role="button"
        tabIndex={0}
        onClick={handleProductClick}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            handleProductClick();
          }
        }}
        aria-label={`View ${product.name}`}
      >
        {product.badge && (
          <span className={styles.badge}>{product.badge}</span>
        )}

        {discountPercentage > 0 && !product.badge && (
          <span className={styles.badge}>
            {discountPercentage}% OFF
          </span>
        )}

        <img
          src={primaryImage}
          alt={product.name}
          className={`${styles.image} ${styles.primaryImage}`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.src = "/placeholder-product.jpg";
          }}
        />

        <img
          src={hoverImage}
          alt=""
          aria-hidden="true"
          className={`${styles.image} ${styles.hoverImage}`}
          loading="lazy"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      </div>

      <div className={styles.content}>
        {product.brand && (
          <p className={styles.brand}>{product.brand}</p>
        )}

        <button
          type="button"
          className={styles.name}
          onClick={handleProductClick}
        >
          {product.name}
        </button>

        {typeof product.rating === "number" && (
          <div className={styles.rating}>
            <span className={styles.ratingStar}>★</span>
            <span>{product.rating.toFixed(1)}</span>

            {typeof product.reviews === "number" && (
              <span className={styles.reviews}>
                ({product.reviews})
              </span>
            )}
          </div>
        )}

        <div className={styles.priceRow}>
          <span className={styles.price}>
            {formatPrice(product.price)}
          </span>

          {product.oldPrice && product.oldPrice > product.price && (
            <span className={styles.oldPrice}>
              {formatPrice(product.oldPrice)}
            </span>
          )}
        </div>

        <div
          className={`${styles.stockStatus} ${stockStatus.className}`}
          aria-label={`Stock status: ${stockStatus.label}`}
        >
          <span className={styles.stockDot} aria-hidden="true" />
          {stockStatus.label}
        </div>

        <button
          type="button"
          className={styles.addButton}
          onClick={(event) => {
            event.stopPropagation();
            void handleAddToCart();
          }}
          disabled={addingToCart || isOutOfStock}
        >
          {addingToCart ? (
            <>
              <LoaderCircle
                size={17}
                className={styles.spin}
                aria-hidden="true"
              />
              Adding...
            </>
          ) : isOutOfStock ? (
            "Out of Stock"
          ) : (
            <>
              <ShoppingBag size={17} aria-hidden="true" />
              Add to Cart
            </>
          )}
        </button>
      </div>
    </article>
  );
}