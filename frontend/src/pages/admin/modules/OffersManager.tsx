import { useEffect, useMemo, useState } from "react";
import styles from "./OfferManager.module.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "https://jihaan-cosmetics.onrender.com/api";

type Product = {
  _id: string;
  name?: string;
  title?: string;
  brand?: string;
  category?: string;
  price?: number;
  oldPrice?: number;
  rating?: number;
  reviews?: number;
  image?: string;
  images?: string[];
};

type Offer = {
  _id: string;
  name: string;
  products: Product[] | string[];
  brand: string;
  category: string;
  rating: number;
  reviews: number;
  oldPrice: number;
  price: number;
  discount: string;
  prepaidPrice: number;
  image: string;
  demoImage?: string;
  active: boolean;
  sortOrder: number;
  createdAt?: string;
};

type OfferForm = {
  name: string;
  brand: string;
  category: string;
  rating: string;
  reviews: string;
  oldPrice: string;
  price: string;
  discount: string;
  prepaidPrice: string;
  active: boolean;
  sortOrder: string;
};

const initialForm: OfferForm = {
  name: "",
  brand: "",
  category: "",
  rating: "0",
  reviews: "0",
  oldPrice: "",
  price: "",
  discount: "",
  prepaidPrice: "0",
  active: true,
  sortOrder: "0",
};

const getProductName = (product: Product) =>
  product.name || product.title || "Unnamed product";

const getProductImage = (product: Product) =>
  product.image || product.images?.[0] || "";

const getImageUrl = (imagePath?: string) => {
  if (!imagePath) return "";

  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://") ||
    imagePath.startsWith("blob:")
  ) {
    return imagePath;
  }

  const backendUrl = API_BASE_URL.replace(/\/api\/?$/, "");

  return `${backendUrl}${imagePath.startsWith("/") ? imagePath : `/${imagePath}`}`;
};

const getErrorMessage = (error: unknown) => {
  if (error instanceof Error) return error.message;
  return "Something went wrong";
};

export default function OfferManager() {
  const [products, setProducts] = useState<Product[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);

  const [form, setForm] = useState<OfferForm>(initialForm);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [demoImageFile, setDemoImageFile] = useState<File | null>(null);

  const [imagePreview, setImagePreview] = useState("");
  const [demoImagePreview, setDemoImagePreview] = useState("");

  const [editingOfferId, setEditingOfferId] = useState<string | null>(null);
  const [searchProduct, setSearchProduct] = useState("");

  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingOffers, setLoadingOffers] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isEditing = Boolean(editingOfferId);

  const filteredProducts = useMemo(() => {
    const search = searchProduct.trim().toLowerCase();

    if (!search) return products;

    return products.filter((product) => {
      const searchableText = [
        getProductName(product),
        product.brand,
        product.category,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchableText.includes(search);
    });
  }, [products, searchProduct]);

  useEffect(() => {
    loadProducts();
    loadOffers();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }

      if (demoImagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(demoImagePreview);
      }
    };
  }, [imagePreview, demoImagePreview]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);

      const response = await fetch(`${API_BASE_URL}/products`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load products");
      }

      const productList = Array.isArray(data)
        ? data
        : data.products || data.data || [];

      setProducts(productList);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadOffers = async () => {
    try {
      setLoadingOffers(true);

      const response = await fetch(`${API_BASE_URL}/offers/admin`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load offers");
      }

      setOffers(data.offers || data.data || []);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoadingOffers(false);
    }
  };

  const resetForm = () => {
    setForm(initialForm);
    setSelectedProducts([]);
    setImageFile(null);
    setDemoImageFile(null);
    setImagePreview("");
    setDemoImagePreview("");
    setEditingOfferId(null);
    setSearchProduct("");
    setMessage("");
    setError("");
  };

  const updateForm = <K extends keyof OfferForm>(
    field: K,
    value: OfferForm[K]
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const toggleProduct = (productId: string) => {
    setSelectedProducts((previous) => {
      if (previous.includes(productId)) {
        return previous.filter((id) => id !== productId);
      }

      return [...previous, productId];
    });
  };

  const handleImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
    type: "image" | "demoImage"
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5 MB.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);

    if (type === "image") {
      setImageFile(file);
      setImagePreview(previewUrl);
    } else {
      setDemoImageFile(file);
      setDemoImagePreview(previewUrl);
    }

    setError("");
  };

  const validateForm = () => {
    const oldPrice = Number(form.oldPrice);
    const price = Number(form.price);
    const prepaidPrice = Number(form.prepaidPrice);

    if (!form.name.trim()) {
      return "Offer name is required.";
    }

    if (selectedProducts.length === 0) {
      return "Please select at least one product.";
    }

    if (!isEditing && !imageFile) {
      return "Offer image is required.";
    }

    if (!form.brand.trim()) {
      return "Brand is required.";
    }

    if (!form.category.trim()) {
      return "Category is required.";
    }

    if (!form.discount.trim()) {
      return "Discount is required.";
    }

    if (form.oldPrice === "" || Number.isNaN(oldPrice)) {
      return "Please enter a valid old price.";
    }

    if (form.price === "" || Number.isNaN(price)) {
      return "Please enter a valid offer price.";
    }

    if (price > oldPrice) {
      return "Offer price cannot be greater than old price.";
    }

    if (prepaidPrice < 0 || prepaidPrice > price) {
      return "Prepaid price cannot be greater than offer price.";
    }

    return "";
  };

  const createFormData = () => {
    const formData = new FormData();

    formData.append("name", form.name.trim());
    formData.append("brand", form.brand.trim());
    formData.append("category", form.category.trim());
    formData.append("rating", form.rating || "0");
    formData.append("reviews", form.reviews || "0");
    formData.append("oldPrice", form.oldPrice);
    formData.append("price", form.price);
    formData.append("discount", form.discount.trim());
    formData.append("prepaidPrice", form.prepaidPrice || "0");
    formData.append("active", String(form.active));
    formData.append("sortOrder", form.sortOrder || "0");

    selectedProducts.forEach((productId) => {
      formData.append("products", productId);
    });

    if (imageFile) {
      formData.append("image", imageFile);
    }

    if (demoImageFile) {
      formData.append("demoImage", demoImageFile);
    }

    return formData;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      setMessage("");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const formData = createFormData();

      const endpoint = isEditing
        ? `${API_BASE_URL}/offers/${editingOfferId}`
        : `${API_BASE_URL}/offers`;

      const response = await fetch(endpoint, {
        method: isEditing ? "PUT" : "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save offer");
      }

      setMessage(
        isEditing
          ? "Offer updated successfully."
          : "Offer created successfully."
      );

      resetForm();
      await loadOffers();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (offer: Offer) => {
    const productIds = (offer.products || []).map((product) =>
      typeof product === "string" ? product : product._id
    );

    setEditingOfferId(offer._id);
    setSelectedProducts(productIds);

    setForm({
      name: offer.name || "",
      brand: offer.brand || "",
      category: offer.category || "",
      rating: String(offer.rating ?? 0),
      reviews: String(offer.reviews ?? 0),
      oldPrice: String(offer.oldPrice ?? ""),
      price: String(offer.price ?? ""),
      discount: offer.discount || "",
      prepaidPrice: String(offer.prepaidPrice ?? 0),
      active: Boolean(offer.active),
      sortOrder: String(offer.sortOrder ?? 0),
    });

    setImageFile(null);
    setDemoImageFile(null);
    setImagePreview(getImageUrl(offer.image));
    setDemoImagePreview(getImageUrl(offer.demoImage));

    setMessage("");
    setError("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (offerId: string) => {
    const shouldDelete = window.confirm(
      "Are you sure you want to delete this offer?"
    );

    if (!shouldDelete) return;

    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await fetch(`${API_BASE_URL}/offers/${offerId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete offer");
      }

      setMessage("Offer deleted successfully.");
      await loadOffers();

      if (editingOfferId === offerId) {
        resetForm();
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (offer: Offer) => {
    try {
      setLoading(true);
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_BASE_URL}/offers/${offer._id}/toggle`,
        {
          method: "PATCH",
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update offer status");
      }

      setMessage("Offer status updated successfully.");
      await loadOffers();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <div>
          <h1>Offer Manager</h1>
          <p>Create and manage product offers.</p>
        </div>

        {isEditing && (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={resetForm}
          >
            Cancel Edit
          </button>
        )}
      </div>

      {message && <div className={styles.successMessage}>{message}</div>}
      {error && <div className={styles.errorMessage}>{error}</div>}

      <form className={styles.formCard} onSubmit={handleSubmit}>
        <div className={styles.cardHeader}>
          <div>
            <h2>{isEditing ? "Update Offer" : "Create New Offer"}</h2>
            <p>Select products and upload offer images from your computer.</p>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div className={styles.field}>
            <label htmlFor="offerName">Offer Name</label>
            <input
              id="offerName"
              type="text"
              value={form.name}
              onChange={(event) => updateForm("name", event.target.value)}
              placeholder="Enter offer name"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="offerBrand">Brand</label>
            <input
              id="offerBrand"
              type="text"
              value={form.brand}
              onChange={(event) => updateForm("brand", event.target.value)}
              placeholder="Enter brand"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="offerCategory">Category</label>
            <input
              id="offerCategory"
              type="text"
              value={form.category}
              onChange={(event) => updateForm("category", event.target.value)}
              placeholder="Enter category"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="offerDiscount">Discount</label>
            <input
              id="offerDiscount"
              type="text"
              value={form.discount}
              onChange={(event) => updateForm("discount", event.target.value)}
              placeholder="Example: 20% OFF"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="oldPrice">Old Price</label>
            <input
              id="oldPrice"
              type="number"
              min="0"
              value={form.oldPrice}
              onChange={(event) => updateForm("oldPrice", event.target.value)}
              placeholder="Enter old price"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="price">Offer Price</label>
            <input
              id="price"
              type="number"
              min="0"
              value={form.price}
              onChange={(event) => updateForm("price", event.target.value)}
              placeholder="Enter offer price"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="prepaidPrice">Prepaid Price</label>
            <input
              id="prepaidPrice"
              type="number"
              min="0"
              value={form.prepaidPrice}
              onChange={(event) =>
                updateForm("prepaidPrice", event.target.value)
              }
              placeholder="Enter prepaid price"
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="rating">Rating</label>
            <input
              id="rating"
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={form.rating}
              onChange={(event) => updateForm("rating", event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="reviews">Reviews</label>
            <input
              id="reviews"
              type="number"
              min="0"
              value={form.reviews}
              onChange={(event) => updateForm("reviews", event.target.value)}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="sortOrder">Sort Order</label>
            <input
              id="sortOrder"
              type="number"
              min="0"
              value={form.sortOrder}
              onChange={(event) => updateForm("sortOrder", event.target.value)}
            />
          </div>
        </div>

        <div className={styles.productSection}>
          <div className={styles.sectionHeading}>
            <div>
              <h3>Select Products</h3>
              <p>
                {selectedProducts.length} product
                {selectedProducts.length === 1 ? "" : "s"} selected
              </p>
            </div>

            <input
              className={styles.searchInput}
              type="search"
              value={searchProduct}
              onChange={(event) => setSearchProduct(event.target.value)}
              placeholder="Search products..."
            />
          </div>

          {loadingProducts ? (
            <div className={styles.emptyState}>Loading products...</div>
          ) : filteredProducts.length === 0 ? (
            <div className={styles.emptyState}>No products found.</div>
          ) : (
            <div className={styles.productGrid}>
              {filteredProducts.map((product) => {
                const selected = selectedProducts.includes(product._id);

                return (
                  <button
                    type="button"
                    key={product._id}
                    className={`${styles.productCard} ${
                      selected ? styles.selectedProduct : ""
                    }`}
                    onClick={() => toggleProduct(product._id)}
                  >
                    <div className={styles.productImageWrapper}>
                      {getProductImage(product) ? (
                        <img
                          src={getImageUrl(getProductImage(product))}
                          alt={getProductName(product)}
                          className={styles.productImage}
                        />
                      ) : (
                        <div className={styles.noImage}>No Image</div>
                      )}
                    </div>

                    <div className={styles.productDetails}>
                      <strong>{getProductName(product)}</strong>

                      {product.brand && <span>{product.brand}</span>}

                      {product.category && <small>{product.category}</small>}

                      {product.price !== undefined && (
                        <b>₹{product.price}</b>
                      )}
                    </div>

                    <span className={styles.selectionIndicator}>
                      {selected ? "✓" : "+"}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <div className={styles.uploadGrid}>
          <div className={styles.uploadBox}>
            <label htmlFor="offerImage">Offer Image</label>

            <input
              id="offerImage"
              type="file"
              accept="image/*"
              onChange={(event) => handleImageChange(event, "image")}
            />

            {imagePreview && (
              <img
                src={imagePreview}
                alt="Offer preview"
                className={styles.previewImage}
              />
            )}

            {imageFile && (
              <p className={styles.fileName}>{imageFile.name}</p>
            )}
          </div>

          <div className={styles.uploadBox}>
            <label htmlFor="offerDemoImage">Demo Image</label>

            <input
              id="offerDemoImage"
              type="file"
              accept="image/*"
              onChange={(event) => handleImageChange(event, "demoImage")}
            />

            {demoImagePreview && (
              <img
                src={demoImagePreview}
                alt="Demo preview"
                className={styles.previewImage}
              />
            )}

            {demoImageFile && (
              <p className={styles.fileName}>{demoImageFile.name}</p>
            )}
          </div>
        </div>

        <div className={styles.bottomOptions}>
          <label className={styles.checkboxLabel}>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) => updateForm("active", event.target.checked)}
            />
            Active offer
          </label>
        </div>

        <div className={styles.formActions}>
          <button
            type="submit"
            className={styles.primaryButton}
            disabled={loading}
          >
            {loading
              ? "Saving..."
              : isEditing
                ? "Update Offer"
                : "Create Offer"}
          </button>

          {isEditing && (
            <button
              type="button"
              className={styles.secondaryButton}
              onClick={resetForm}
              disabled={loading}
            >
              Reset
            </button>
          )}
        </div>
      </form>

      <div className={styles.listCard}>
        <div className={styles.cardHeader}>
          <div>
            <h2>All Offers</h2>
            <p>Manage your existing offers.</p>
          </div>

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={loadOffers}
            disabled={loadingOffers}
          >
            {loadingOffers ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        {loadingOffers ? (
          <div className={styles.emptyState}>Loading offers...</div>
        ) : offers.length === 0 ? (
          <div className={styles.emptyState}>No offers available.</div>
        ) : (
          <div className={styles.offerGrid}>
            {offers.map((offer) => (
              <article className={styles.offerCard} key={offer._id}>
                <div className={styles.offerImageWrapper}>
                  {offer.image ? (
                    <img
                      src={getImageUrl(offer.image)}
                      alt={offer.name}
                      className={styles.offerImage}
                    />
                  ) : (
                    <div className={styles.noImage}>No Image</div>
                  )}

                  <span
                    className={`${styles.statusBadge} ${
                      offer.active
                        ? styles.activeBadge
                        : styles.inactiveBadge
                    }`}
                  >
                    {offer.active ? "Active" : "Inactive"}
                  </span>
                </div>

                <div className={styles.offerContent}>
                  <h3>{offer.name}</h3>

                  <p className={styles.offerMeta}>
                    {offer.brand} • {offer.category}
                  </p>

                  <div className={styles.priceRow}>
                    <span className={styles.oldPrice}>
                      ₹{offer.oldPrice}
                    </span>
                    <strong>₹{offer.price}</strong>
                  </div>

                  <p className={styles.discountText}>{offer.discount}</p>

                  <p className={styles.productCount}>
                    {offer.products?.length || 0} product
                    {(offer.products?.length || 0) === 1 ? "" : "s"} linked
                  </p>

                  <div className={styles.offerActions}>
                    <button
                      type="button"
                      className={styles.editButton}
                      onClick={() => handleEdit(offer)}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className={styles.toggleButton}
                      onClick={() => handleToggle(offer)}
                    >
                      {offer.active ? "Deactivate" : "Activate"}
                    </button>

                    <button
                      type="button"
                      className={styles.deleteButton}
                      onClick={() => handleDelete(offer._id)}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}