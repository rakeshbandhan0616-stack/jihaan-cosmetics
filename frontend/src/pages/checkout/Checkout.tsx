import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Checkout.css";

type Product = {
  _id?: string;
  id?: string;
  name?: string;
  title?: string;
  price?: number;
  salePrice?: number;
  discountPrice?: number;
  sellingPrice?: number;
  image?: string;
  thumbnail?: string;
  images?: string[];
};

type CartItem = {
  _id?: string;
  id?: string;
  product?: Product | string;
  productId?: Product | string;
  name?: string;
  image?: string;
  price?: number;
  quantity?: number;
  size?: string;
};

type CartResponse = {
  success?: boolean;
  cart?: {
    items?: CartItem[];
  };
};

type UserProfile = {
  _id?: string;
  id?: string;
  name?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  mobile?: string;
  address?: string;
  addressLine1?: string;
  addressLine2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  pincode?: string;
  country?: string;
};

type OrderResponse = {
  success?: boolean;
  message?: string;
  order?: {
    _id?: string;
    orderNumber?: string;
    trackingId?: string;
    totalAmount?: number;
  };
};

type CheckoutFormData = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
  addressLine2: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  paymentMethod: "COD";
  notes: string;
};

const API_BASE_URL = (
  import.meta.env.VITE_API_BASE_URL ||
  "http://localhost:5000/api"
).replace(/\/+$/, "");

const AUTH_TOKEN_KEY = "jihaan_auth_token";

const initialFormData: CheckoutFormData = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  address: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  paymentMethod: "COD",
  notes: "",
};

const getToken = (): string => {
  return localStorage.getItem(AUTH_TOKEN_KEY) || "";
};

const getProductObject = (item: CartItem): Product => {
  if (item.product && typeof item.product === "object") {
    return item.product;
  }

  if (
    item.productId &&
    typeof item.productId === "object"
  ) {
    return item.productId;
  }

  return {};
};

const getProductId = (item: CartItem): string => {
  const product = getProductObject(item);

  if (typeof item.productId === "string") {
    return item.productId;
  }

  if (typeof item.product === "string") {
    return item.product;
  }

  return String(
    product._id ||
      product.id ||
      item._id ||
      item.id ||
      "",
  );
};

const getProductName = (item: CartItem): string => {
  const product = getProductObject(item);

  return (
    item.name ||
    product.name ||
    product.title ||
    "Cosmetic Product"
  );
};

const getProductPrice = (item: CartItem): number => {
  const product = getProductObject(item);

  return Number(
    item.price ??
      product.price ??
      product.salePrice ??
      product.discountPrice ??
      product.sellingPrice ??
      0,
  );
};

const getProductQuantity = (item: CartItem): number => {
  return Math.max(1, Number(item.quantity || 1));
};

const getProductSize = (item: CartItem): string => {
  return item.size || "Standard";
};

const getProductImage = (item: CartItem): string => {
  const product = getProductObject(item);

  const image =
    item.image ||
    product.image ||
    product.thumbnail ||
    product.images?.[0] ||
    "/placeholder-product.png";

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("/")
  ) {
    return image;
  }

  return `/${image}`;
};

const Checkout = () => {
  const navigate = useNavigate();

  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [formData, setFormData] =
    useState<CheckoutFormData>(initialFormData);

  const [loading, setLoading] = useState(true);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [error, setError] = useState("");

  const [showProfileNotice, setShowProfileNotice] =
    useState(false);

  const [showSuccessPopup, setShowSuccessPopup] =
    useState(false);

  const [createdOrderNumber, setCreatedOrderNumber] =
    useState("");

  const token = getToken();

  const requestConfig = useMemo(
    () => ({
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      withCredentials: true,
    }),
    [token],
  );

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const subtotal = useMemo(() => {
    return cartItems.reduce((total, item) => {
      return (
        total +
        getProductPrice(item) * getProductQuantity(item)
      );
    }, 0);
  }, [cartItems]);

  const shippingCharge =
    subtotal === 0 || subtotal >= 999 ? 0 : 60;

  const discount = 0;
  const total = subtotal + shippingCharge - discount;

  useEffect(() => {
    const loadCheckoutData = async () => {
      const currentToken = getToken();

      if (!currentToken) {
        navigate("/login", {
          replace: true,
          state: {
            from: "/checkout",
          },
        });

        return;
      }

      try {
        setLoading(true);
        setError("");

        const [cartResponse, profileResponse] =
          await Promise.all([
            axios.get<CartResponse>(
              `${API_BASE_URL}/cart`,
              {
                headers: {
                  Accept: "application/json",
                  Authorization: `Bearer ${currentToken}`,
                },
                withCredentials: true,
              },
            ),

            axios
              .get(
                `${API_BASE_URL}/auth/me`,
                {
                  headers: {
                    Accept: "application/json",
                    Authorization: `Bearer ${currentToken}`,
                  },
                  withCredentials: true,
                },
              )
              .catch(() => null),
          ]);

        const items =
          cartResponse.data?.cart?.items || [];

        setCartItems(Array.isArray(items) ? items : []);

        const profileData =
          profileResponse?.data?.user ||
          profileResponse?.data?.data ||
          profileResponse?.data ||
          {};

        const storedUser =
          JSON.parse(
            localStorage.getItem("jihaan_user") || "{}",
          ) || {};

        const user: UserProfile = {
          ...storedUser,
          ...profileData,
        };

        const fullName =
          user.fullName ||
          user.name ||
          `${user.firstName || ""} ${
            user.lastName || ""
          }`.trim();

        const nameParts = fullName.trim().split(" ");

        const firstName =
          user.firstName || nameParts.shift() || "";

        const lastName =
          user.lastName || nameParts.join(" ");

        const profileFormData: CheckoutFormData = {
          firstName,
          lastName,
          email: user.email || "",
          phone: user.phone || user.mobile || "",
          address:
            user.addressLine1 ||
            user.address ||
            "",
          addressLine2: user.addressLine2 || "",
          city: user.city || "",
          state: user.state || "",
          postalCode:
            user.postalCode ||
            user.pincode ||
            "",
          country: user.country || "India",
          paymentMethod: "COD",
          notes: "",
        };

        setFormData(profileFormData);

        if (
          profileFormData.firstName ||
          profileFormData.email
        ) {
          setShowProfileNotice(true);
        }
      } catch (err: unknown) {
        console.error("Checkout loading error:", err);

        if (axios.isAxiosError(err)) {
          if (err.response?.status === 401) {
            localStorage.removeItem(AUTH_TOKEN_KEY);

            navigate("/login", {
              replace: true,
              state: {
                from: "/checkout",
              },
            });

            return;
          }

          setError(
            err.response?.data?.message ||
              "Unable to load checkout details.",
          );
        } else {
          setError("Unable to load checkout details.");
        }
      } finally {
        setLoading(false);
      }
    };

    loadCheckoutData();
  }, [navigate]);

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = event.target;

    setFormData((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleContinueWithProfile = () => {
    setShowProfileNotice(false);
  };

  const handleEditProfileDetails = () => {
    setShowProfileNotice(false);
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const currentToken = getToken();

    if (!currentToken) {
      navigate("/login", {
        replace: true,
        state: {
          from: "/checkout",
        },
      });

      return;
    }

    if (!cartItems.length) {
      setError("Your cart is empty.");
      return;
    }

    const items = cartItems.map((item) => ({
      product: getProductId(item),
      quantity: getProductQuantity(item),
      size: getProductSize(item),
    }));

    const invalidItem = items.some(
      (item) =>
        !item.product ||
        item.quantity < 1,
    );

    if (invalidItem) {
      setError(
        "Some cart items are invalid. Please add the products again.",
      );

      return;
    }

    const orderPayload = {
      items,

      shippingAddress: {
        fullName:
          `${formData.firstName} ${formData.lastName}`.trim(),
        phone: formData.phone.trim(),
        email: formData.email.trim().toLowerCase(),
        addressLine1: formData.address.trim(),
        addressLine2: formData.addressLine2.trim(),
        city: formData.city.trim(),
        state: formData.state.trim(),
        postalCode: formData.postalCode.trim(),
        country: formData.country.trim() || "India",
      },

      paymentMethod: "COD",
      shippingCharge,
      discount,
      notes: formData.notes.trim(),
    };

    try {
      setPlacingOrder(true);
      setError("");

      const response =
        await axios.post<OrderResponse>(
          `${API_BASE_URL}/orders`,
          orderPayload,
          {
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
              Authorization: `Bearer ${currentToken}`,
            },
            withCredentials: true,
          },
        );

      const order = response.data?.order;

      const trackingId =
        order?.trackingId ||
        order?.orderNumber ||
        order?._id ||
        "";

      setCreatedOrderNumber(trackingId);
      setShowSuccessPopup(true);
    } catch (err: unknown) {
      console.error("Order placement error:", err);
      console.error("Backend response:", axios.isAxiosError(err) ? err.response?.data : err);

      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          localStorage.removeItem(AUTH_TOKEN_KEY);

          navigate("/login", {
            replace: true,
            state: {
              from: "/checkout",
            },
          });

          return;
        }

        setError(
          err.response?.data?.message ||
            err.response?.data?.error ||
            "Unable to place your order.",
        );
      } else {
        setError("Unable to place your order.");
      }
    } finally {
      setPlacingOrder(false);
    }
  };

  if (loading) {
    return (
      <main className="checkout-page">
        <div className="checkout-status">
          Loading your checkout...
        </div>
      </main>
    );
  }

  if (!cartItems.length) {
    return (
      <main className="checkout-page">
        <div className="checkout-empty">
          <h2>Your cart is empty</h2>

          <p>
            Add products to your cart before checkout.
          </p>

          <button
            type="button"
            onClick={() => navigate("/cart")}
          >
            Go to Cart
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="checkout-page">
      <div className="checkout-container">
        <div className="checkout-heading">
          <span>Jihaan Cosmetics</span>

          <h1>Checkout</h1>

          <p>
            Review your details and place your order.
          </p>
        </div>

        {error && (
          <div className="checkout-alert error">
            {error}
          </div>
        )}

        {showProfileNotice && (
          <div className="profile-confirmation">
            <div>
              <h3>Use your profile details?</h3>

              <p>
                We found your saved name and email.
                You can continue with these details or
                edit them before placing your order.
              </p>
            </div>

            <div className="profile-confirmation-actions">
              <button
                type="button"
                onClick={handleContinueWithProfile}
              >
                Continue
              </button>

              <button
                type="button"
                onClick={handleEditProfileDetails}
              >
                Edit Details
              </button>
            </div>
          </div>
        )}

        <form
          className="checkout-layout"
          onSubmit={handleSubmit}
        >
          <section className="checkout-form-card">
            <div className="checkout-section">
              <h2>Contact Information</h2>

              <div className="checkout-grid">
                <div className="checkout-field">
                  <label htmlFor="firstName">
                    First Name *
                  </label>

                  <input
                    id="firstName"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="lastName">
                    Last Name *
                  </label>

                  <input
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="email">
                    Email Address *
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="phone">
                    Phone Number *
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    pattern="[0-9]{10}"
                    maxLength={10}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="checkout-section">
              <h2>Shipping Address</h2>

              <div className="checkout-field">
                <label htmlFor="address">
                  Address Line 1 *
                </label>

                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={3}
                  required
                />
              </div>

              <div className="checkout-field">
                <label htmlFor="addressLine2">
                  Address Line 2
                </label>

                <input
                  id="addressLine2"
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleChange}
                />
              </div>

              <div className="checkout-grid">
                <div className="checkout-field">
                  <label htmlFor="city">City *</label>

                  <input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="state">State *</label>

                  <input
                    id="state"
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="postalCode">
                    Postal Code *
                  </label>

                  <input
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleChange}
                    pattern="[0-9]{6}"
                    maxLength={6}
                    required
                  />
                </div>

                <div className="checkout-field">
                  <label htmlFor="country">
                    Country *
                  </label>

                  <input
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleChange}
                    required
                  />
                </div>
              </div>
            </div>

            <div className="checkout-section">
              <h2>Payment Method</h2>

              <label className="payment-option">
                <input
                  type="radio"
                  name="paymentMethod"
                  value="COD"
                  checked
                  readOnly
                />

                <span>
                  <strong>Cash on Delivery</strong>

                  <small>
                    Pay when your order is delivered.
                  </small>
                </span>
              </label>
            </div>

            <div className="checkout-section">
              <h2>Order Notes</h2>

              <div className="checkout-field">
                <label htmlFor="notes">
                  Additional Notes
                </label>

                <textarea
                  id="notes"
                  name="notes"
                  value={formData.notes}
                  onChange={handleChange}
                  rows={3}
                  placeholder="Any special delivery instructions?"
                />
              </div>
            </div>
          </section>

          <aside className="order-summary-card">
            <h2>Order Summary</h2>

            <div className="summary-items">
              {cartItems.map((item, index) => {
                const productId = getProductId(item);
                const name = getProductName(item);
                const image = getProductImage(item);
                const price = getProductPrice(item);
                const quantity = getProductQuantity(item);
                const size = getProductSize(item);

                return (
                  <div
                    className="summary-product"
                    key={`${productId}-${index}`}
                  >
                    <img
                      src={image}
                      alt={name}
                      onError={(event) => {
                        event.currentTarget.src =
                          "/placeholder-product.png";
                      }}
                    />

                    <div className="summary-product-info">
                      <h3>{name}</h3>
                      <p>Qty: {quantity}</p>
                      <p>Size: {size}</p>
                    </div>

                    <strong>
                      {formatCurrency(price * quantity)}
                    </strong>
                  </div>
                );
              })}
            </div>

            <div className="summary-line">
              <span>Subtotal</span>

              <strong>
                {formatCurrency(subtotal)}
              </strong>
            </div>

            <div className="summary-line">
              <span>Shipping</span>

              <strong>
                {shippingCharge === 0
                  ? "Free"
                  : formatCurrency(shippingCharge)}
              </strong>
            </div>

            <div className="summary-line">
              <span>Discount</span>

              <strong>
                {formatCurrency(discount)}
              </strong>
            </div>

            <div className="summary-total">
              <span>Total</span>

              <strong>
                {formatCurrency(total)}
              </strong>
            </div>

            <button
              className="place-order-button"
              type="submit"
              disabled={placingOrder}
            >
              {placingOrder
                ? "Placing Order..."
                : "Place Order"}
            </button>

            <button
              className="back-shopping-button"
              type="button"
              onClick={() => navigate("/cart")}
            >
              Back to Cart
            </button>
          </aside>
        </form>
      </div>

      {showSuccessPopup && (
        <div className="order-success-overlay">
          <div className="order-success-popup">
            <div className="success-icon">✓</div>

            <h2>Order Placed Successfully!</h2>

            <p>
              Thank you for shopping with Jihaan Cosmetics.
            </p>

            <div className="tracking-box">
              <span>Your Tracking ID</span>

              <strong>
                {createdOrderNumber || "Generating..."}
              </strong>
            </div>

            <p className="tracking-help">
              You can use this ID to check your order
              status in My Orders.
            </p>

            <button
              type="button"
              onClick={() => navigate("/orders")}
            >
              View My Orders
            </button>

            <button
              type="button"
              className="success-close-button"
              onClick={() => {
                setShowSuccessPopup(false);
                navigate("/orders");
              }}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </main>
  );
};

export default Checkout;