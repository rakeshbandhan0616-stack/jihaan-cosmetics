import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Edit3,
  ImagePlus,
  Package,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
  LoaderCircle,
} from "lucide-react";
import styles from "./ProductManager.module.css";

type Category = {
  _id: string;
  name: string;
  image?: string;
  isActive?: boolean;
};

type DiscountType = "none" | "flat" | "percentage";

type Offer = {
  enabled: boolean;
  title: string;
  description: string;
  badge: string;
  discountType: DiscountType;
  discountValue: string;
  startDate: string;
  endDate: string;
  active: boolean;
};

type Product = {
  _id: string;
  name: string;
  slug: string;
  brand: string;
  category: string;
  subcategory?: string;
  description?: string;
  howToUse?: string;
  ingredients?: string;
  additionalDetails?: string;
  benefits?: string;
  composition?: string;
  tags?: string[];
  price: number;
  oldPrice: number;
  discountType?: DiscountType;
  discountValue?: number;
  rating?: number;
  reviews?: number;
  reviewList?: {
    _id: string;
    user?: string;
    name: string;
    email?: string;
    rating: number;
    comment: string;
    verifiedPurchase?: boolean;
    createdAt?: string;
    updatedAt?: string;
  }[];
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
  newArrivalSortOrder?: number;
  bestSellerSortOrder?: number;
  active?: boolean;
  stock: number;
  lowStockThreshold?: number;
  isOutOfStock?: boolean;
  offer?: {
    enabled?: boolean;
    title?: string;
    description?: string;
    badge?: string;
    discountType?: DiscountType;
    discountValue?: number;
    startDate?: string;
    endDate?: string;
    active?: boolean;
  };
};

type ProductForm = {
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  description: string;
  howToUse: string;
  ingredients: string;
  additionalDetails: string;
  benefits: string;
  composition: string;
  tags: string;
  oldPrice: string;
  discountType: DiscountType;
  discountValue: string;
  youtubeVideoUrl: string;
  shades: string;
  badge: string;
  productType: "new-arrival" | "bestseller" | "regular";
  isNewArrival: boolean;
  isBestseller: boolean;
  newArrivalSortOrder: string;
  bestSellerSortOrder: string;
  active: boolean;
  stock: string;
  offer: Offer;
};

const API_URL =
  import.meta.env.VITE_API_URL || "https://jihaan-cosmetics.onrender.com/api";

const UPLOAD_URL = API_URL.replace(/\/api\/?$/, "");

const AUTH_TOKEN_KEYS = [
  "jihaan_auth_token",
  "authToken",
  "accessToken",
  "token",
];

const getAuthToken = (): string => {
  for (const key of AUTH_TOKEN_KEYS) {
    const token = localStorage.getItem(key);

    if (token) {
      return token;
    }
  }

  return "";
};

const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
};

const initialOffer: Offer = {
  enabled: false,
  title: "",
  description: "",
  badge: "",
  discountType: "none",
  discountValue: "0",
  startDate: "",
  endDate: "",
  active: true,
};

const initialForm: ProductForm = {
  name: "",
  brand: "",
  category: "",
  subcategory: "",
  description: "",
  howToUse: "",
  ingredients: "",
  additionalDetails: "",
  benefits: "",
  composition: "",
  tags: "",
  oldPrice: "",
  discountType: "none",
  discountValue: "0",
  youtubeVideoUrl: "",
  shades: "",
  badge: "",
  productType: "regular",
  isNewArrival: false,
  isBestseller: false,
  newArrivalSortOrder: "0",
  bestSellerSortOrder: "0",
  active: true,
  stock: "0",
  offer: initialOffer,
};

const getImageUrl = (image?: string) => {
  if (!image) return "";

  if (
    image.startsWith("http://") ||
    image.startsWith("https://")
  ) {
    return image;
  }

  return `${UPLOAD_URL}${image.startsWith("/") ? image : `/${image}`}`;
};

const getProductId = (product: Product) => product._id;

const ProductManager = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [form, setForm] = useState<ProductForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [hoverImageFile, setHoverImageFile] = useState<File | null>(null);
  const [beforeImageFile, setBeforeImageFile] = useState<File | null>(null);
  const [afterImageFile, setAfterImageFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingHoverImage, setExistingHoverImage] = useState("");
  const [existingBeforeImage, setExistingBeforeImage] = useState("");
  const [existingAfterImage, setExistingAfterImage] = useState("");
  const [existingVideo, setExistingVideo] = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

  const [loading, setLoading] = useState(false);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isEditing = Boolean(editingId);

  const filteredProducts = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return products.filter((product) => {
      const matchesSearch =
        !search ||
        product.name.toLowerCase().includes(search) ||
        product.brand.toLowerCase().includes(search) ||
        product.category.toLowerCase().includes(search);

      const matchesType =
        filterType === "all" ||
        (filterType === "new-arrival" && product.isNewArrival) ||
        (filterType === "bestseller" && product.isBestseller) ||
        (filterType === "active" && product.active) ||
        (filterType === "inactive" && !product.active);

      return matchesSearch && matchesType;
    });
  }, [products, searchTerm, filterType]);

  const loadProducts = async () => {
    try {
      setLoadingProducts(true);
      setError("");

      const response = await fetch(`${API_URL}/products/admin`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...getAuthHeaders(),
        },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load products.");
      }

      setProducts(result.products || result.data || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load products.",
      );
    } finally {
      setLoadingProducts(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories`, {
        method: "GET",
        credentials: "include",
        headers: {
          Accept: "application/json",
          ...getAuthHeaders(),
        },
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to load categories.");
      }

      setCategories(result.data || result.categories || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load categories.",
      );
    }
  };

  useEffect(() => {
    loadProducts();
    loadCategories();
  }, []);

  const updateForm = (
    field: keyof ProductForm,
    value: string | boolean | Offer,
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const updateOffer = (
    field: keyof Offer,
    value: string | boolean,
  ) => {
    setForm((current) => ({
      ...current,
      offer: {
        ...current.offer,
        [field]: value,
      },
    }));
  };

  const handleImageChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(event.target.files || []);

    if (files.length > 10) {
      setError("You can upload a maximum of 10 images.");
      return;
    }

    setImageFiles(files);
    setError("");
  };

  const handleSingleImageChange = (
    event: ChangeEvent<HTMLInputElement>,
    setter: (file: File | null) => void,
  ) => {
    const file = event.target.files?.[0] || null;
    setter(file);
    setError("");
  };

  const handleVideoChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] || null;
    setVideoFile(file);
    setError("");
  };

  const resetInput = (id: string) => {
    const input = document.getElementById(id) as HTMLInputElement | null;

    if (input) {
      input.value = "";
    }
  };

  const resetForm = () => {
    setForm({
      ...initialForm,
      offer: {
        ...initialOffer,
      },
    });

    setEditingId(null);

    setImageFiles([]);
    setHoverImageFile(null);
    setBeforeImageFile(null);
    setAfterImageFile(null);
    setVideoFile(null);

    setExistingImages([]);
    setExistingHoverImage("");
    setExistingBeforeImage("");
    setExistingAfterImage("");
    setExistingVideo("");

    setUploadProgress(0);

    resetInput("product-images");
    resetInput("product-hover-image");
    resetInput("product-before-image");
    resetInput("product-after-image");
    resetInput("product-video");
  };

  const startEdit = (product: Product) => {
    setEditingId(product._id);

    setForm({
      name: product.name || "",
      brand: product.brand || "",
      category: product.category || "",
      subcategory: product.subcategory || "",
      description: product.description || "",
      howToUse: product.howToUse || "",
      ingredients: product.ingredients || "",
      additionalDetails: product.additionalDetails || "",
      benefits: product.benefits || "",
      composition: product.composition || "",
      tags: product.tags?.join(", ") || "",
      oldPrice: String(product.oldPrice ?? ""),
      discountType: product.discountType || "none",
      discountValue: String(product.discountValue ?? 0),
      youtubeVideoUrl: product.youtubeVideoUrl || "",
      shades: product.shades?.join(", ") || "",
      badge: product.badge || "",
      productType: product.productType || "regular",
      isNewArrival: Boolean(product.isNewArrival),
      isBestseller: Boolean(product.isBestseller),
      newArrivalSortOrder: String(product.newArrivalSortOrder ?? 0),
      bestSellerSortOrder: String(product.bestSellerSortOrder ?? 0),
      active: product.active !== false,
      stock: String(product.stock ?? 0),
      offer: {
        enabled: Boolean(product.offer?.enabled),
        title: product.offer?.title || "",
        description: product.offer?.description || "",
        badge: product.offer?.badge || "",
        discountType: product.offer?.discountType || "none",
        discountValue: String(product.offer?.discountValue ?? 0),
        startDate: product.offer?.startDate
          ? product.offer.startDate.slice(0, 10)
          : "",
        endDate: product.offer?.endDate
          ? product.offer.endDate.slice(0, 10)
          : "",
        active: product.offer?.active !== false,
      },
    });

    setExistingImages(product.images || []);
    setExistingHoverImage(product.hoverImage || "");
    setExistingBeforeImage(product.beforeImage || "");
    setExistingAfterImage(product.afterImage || "");
    setExistingVideo(product.video || "");

    setImageFiles([]);
    setHoverImageFile(null);
    setBeforeImageFile(null);
    setAfterImageFile(null);
    setVideoFile(null);
    setUploadProgress(0);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const createFormData = () => {
    const formData = new FormData();

    formData.append("name", form.name.trim());
    formData.append("brand", form.brand.trim());
    formData.append("category", form.category.trim());
    formData.append("subcategory", form.subcategory.trim());
    formData.append("description", form.description.trim());
    formData.append("howToUse", form.howToUse.trim());
    formData.append("ingredients", form.ingredients.trim());
    formData.append("additionalDetails", form.additionalDetails.trim());
    formData.append("benefits", form.benefits.trim());
    formData.append("composition", form.composition.trim());

    formData.append(
      "tags",
      JSON.stringify(
        form.tags
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    formData.append("oldPrice", form.oldPrice);
    formData.append("discountType", form.discountType);
    formData.append("discountValue", form.discountValue);

    formData.append(
      "shades",
      JSON.stringify(
        form.shades
          .split(",")
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    );

    formData.append("youtubeVideoUrl", form.youtubeVideoUrl.trim());
    formData.append("badge", form.badge.trim());
    formData.append("productType", form.productType);
    formData.append("isNewArrival", String(form.isNewArrival));
    formData.append("isBestseller", String(form.isBestseller));
    formData.append("newArrivalSortOrder", form.newArrivalSortOrder);
    formData.append("bestSellerSortOrder", form.bestSellerSortOrder);
    formData.append("active", String(form.active));
    formData.append("stock", form.stock);

    formData.append(
      "offer",
      JSON.stringify({
        enabled: form.offer.enabled,
        title: form.offer.title.trim(),
        description: form.offer.description.trim(),
        badge: form.offer.badge.trim(),
        discountType: form.offer.discountType,
        discountValue: Number(form.offer.discountValue) || 0,
        startDate: form.offer.startDate || null,
        endDate: form.offer.endDate || null,
        active: form.offer.active,
      }),
    );

    imageFiles.forEach((file) => {
      formData.append("images", file);
    });

    if (hoverImageFile) {
      formData.append("hoverImage", hoverImageFile);
    }

    if (beforeImageFile) {
      formData.append("beforeImage", beforeImageFile);
    }

    if (afterImageFile) {
      formData.append("afterImage", afterImageFile);
    }

    if (videoFile) {
      formData.append("video", videoFile);
    }

    return formData;
  };

  const validateForm = () => {
    if (!form.name.trim()) return "Product name is required.";
    if (!form.brand.trim()) return "Brand is required.";
    if (!form.category.trim()) return "Category is required.";

    if (form.stock.trim() === "") {
      return "Stock quantity is required.";
    }

    const stockValue = Number(form.stock);

    if (!Number.isInteger(stockValue) || stockValue < 0) {
      return "Stock must be a whole number greater than or equal to 0.";
    }

    if (!form.oldPrice || Number(form.oldPrice) < 0) {
      return "Enter a valid original price.";
    }

    if (!isEditing && imageFiles.length === 0) {
      return "Please upload at least one product image.";
    }

    if (
      form.discountType !== "none" &&
      (!form.discountValue || Number(form.discountValue) < 0)
    ) {
      return "Enter a valid discount value.";
    }

    if (
      form.discountType === "percentage" &&
      Number(form.discountValue) > 100
    ) {
      return "Discount percentage cannot exceed 100.";
    }

    if (
      form.offer.enabled &&
      form.offer.discountType === "percentage" &&
      Number(form.offer.discountValue) > 100
    ) {
      return "Offer percentage cannot exceed 100.";
    }

    if (
      form.offer.enabled &&
      form.offer.startDate &&
      form.offer.endDate &&
      new Date(form.offer.startDate) > new Date(form.offer.endDate)
    ) {
      return "Offer start date cannot be after the end date.";
    }

    if (
      Number(form.newArrivalSortOrder) < 0 ||
      Number(form.bestSellerSortOrder) < 0
    ) {
      return "Sort order cannot be negative.";
    }

    if (form.stock === "") {
      return "Stock quantity is required.";
    }

    if (!Number.isInteger(Number(form.stock)) || Number(form.stock) < 0) {
      return "Stock must be a valid whole number greater than or equal to 0.";
    }

    return "";
  };

  const uploadProduct = (
    endpoint: string,
    method: "POST" | "PUT",
    formData: FormData,
  ) => {
    return new Promise<any>((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.open(method, endpoint);
      xhr.withCredentials = true;

      const token = getAuthToken();

      if (token) {
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
      }

      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percentage = Math.round(
            (event.loaded / event.total) * 100,
          );

          setUploadProgress(percentage);
        }
      };

      xhr.onload = () => {
        let result: any = {};

        try {
          result = JSON.parse(xhr.responseText || "{}");
        } catch {
          result = {};
        }

        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(result);
        } else {
          reject(
            new Error(result.message || "Unable to save product."),
          );
        }
      };

      xhr.onerror = () => {
        reject(new Error("Upload failed. Please check your connection."));
      };

      xhr.onabort = () => {
        reject(new Error("Upload was cancelled."));
      };

      xhr.send(formData);
    });
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setLoading(true);
      setUploadProgress(0);
      setError("");
      setMessage("");

      const formData = createFormData();

      const endpoint = editingId
        ? `${API_URL}/products/${editingId}`
        : `${API_URL}/products`;

      await uploadProduct(
        endpoint,
        editingId ? "PUT" : "POST",
        formData,
      );

      setUploadProgress(100);

      setMessage(
        editingId
          ? "Product updated successfully."
          : "Product created successfully.",
      );

      resetForm();
      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to save product.",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${product.name}"?`,
    );

    if (!confirmed) return;

    try {
      setError("");
      setMessage("");

      const response = await fetch(
        `${API_URL}/products/${getProductId(product)}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            Accept: "application/json",
            ...getAuthHeaders(),
          },
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Unable to delete product.");
      }

      setMessage("Product deleted successfully.");
      await loadProducts();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to delete product.",
      );
    }
  };

  const calculatePreviewPrice = () => {
    const oldPrice = Number(form.oldPrice) || 0;
    const discountValue = Number(form.discountValue) || 0;

    if (form.discountType === "flat") {
      return Math.max(0, oldPrice - discountValue);
    }

    if (form.discountType === "percentage") {
      return Math.max(
        0,
        oldPrice - (oldPrice * discountValue) / 100,
      );
    }

    return oldPrice;
  };

  const getStockStatus = (stock: number) => {
    if (stock <= 0) {
      return { label: "Out of stock", className: styles.outOfStockBadge };
    }

    if (stock <= 10) {
      return { label: `Low stock: ${stock}`, className: styles.lowStockBadge };
    }

    return { label: `Stock: ${stock}`, className: styles.stockBadge };
  };

  const getOfferPreviewPrice = () => {
    const basePrice = calculatePreviewPrice();
    const value = Number(form.offer.discountValue) || 0;

    if (form.offer.discountType === "flat") {
      return Math.max(0, basePrice - value);
    }

    if (form.offer.discountType === "percentage") {
      return Math.max(0, basePrice - (basePrice * value) / 100);
    }

    return basePrice;
  };

  return (
    <section className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Store management</p>
          <h1>Products</h1>
          <p className={styles.subtitle}>
            Create, update and manage your beauty products.
          </p>
        </div>

        <button
          type="button"
          className={styles.addButton}
          onClick={resetForm}
        >
          <Plus size={18} />
          New Product
        </button>
      </div>

      {message && (
        <div className={styles.successMessage}>{message}</div>
      )}

      {error && (
        <div className={styles.errorMessage}>{error}</div>
      )}

      <div className={styles.layout}>
        <div className={styles.formCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>{isEditing ? "Edit Product" : "Add Product"}</h2>
              <p>
                {isEditing
                  ? "Update the selected product."
                  : "Enter all product information below."}
              </p>
            </div>

            {isEditing && (
              <button
                type="button"
                className={styles.closeButton}
                onClick={resetForm}
                aria-label="Cancel editing"
              >
                <X size={18} />
              </button>
            )}
          </div>

          <form className={styles.form} onSubmit={handleSubmit}>
            <div className={styles.formSection}>
              <h3>Basic information</h3>

              <div className={styles.formGrid}>
                <label>
                  Product name *
                  <input
                    value={form.name}
                    onChange={(event) =>
                      updateForm("name", event.target.value)
                    }
                    placeholder="Hydrating Face Serum"
                    required
                  />
                </label>

                <label>
                  Brand *
                  <input
                    value={form.brand}
                    onChange={(event) =>
                      updateForm("brand", event.target.value)
                    }
                    placeholder="Jihaan Beauty"
                    required
                  />
                </label>

                <label>
                  Category *
                  <select
                    value={form.category}
                    onChange={(event) =>
                      updateForm("category", event.target.value)
                    }
                    required
                  >
                    <option value="">Select category</option>

                    {categories
                      .filter(
                        (category) => category.isActive !== false,
                      )
                      .map((category) => (
                        <option
                          key={category._id}
                          value={category.name}
                        >
                          {category.name}
                        </option>
                      ))}
                  </select>
                </label>

                <label>
                  Subcategory
                  <input
                    value={form.subcategory}
                    onChange={(event) =>
                      updateForm("subcategory", event.target.value)
                    }
                    placeholder="Face Serum"
                  />
                </label>
              </div>

              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={(event) =>
                    updateForm("description", event.target.value)
                  }
                  placeholder="Describe the product..."
                  rows={4}
                />
              </label>
            </div>

            <div className={styles.formSection}>
              <h3>Product details</h3>

              <div className={styles.formGrid}>
                <label>
                  How to use
                  <textarea
                    value={form.howToUse}
                    onChange={(event) =>
                      updateForm("howToUse", event.target.value)
                    }
                    rows={3}
                    placeholder="Apply a few drops..."
                  />
                </label>

                <label>
                  Ingredients
                  <textarea
                    value={form.ingredients}
                    onChange={(event) =>
                      updateForm("ingredients", event.target.value)
                    }
                    rows={3}
                    placeholder="Vitamin C, Hyaluronic Acid..."
                  />
                </label>

                <label>
                  Benefits
                  <textarea
                    value={form.benefits}
                    onChange={(event) =>
                      updateForm("benefits", event.target.value)
                    }
                    rows={3}
                    placeholder="Hydrates skin..."
                  />
                </label>

                <label>
                  Composition
                  <textarea
                    value={form.composition}
                    onChange={(event) =>
                      updateForm("composition", event.target.value)
                    }
                    rows={3}
                    placeholder="30ml, suitable for all skin types..."
                  />
                </label>
              </div>

              <label>
                Additional details
                <textarea
                  value={form.additionalDetails}
                  onChange={(event) =>
                    updateForm(
                      "additionalDetails",
                      event.target.value,
                    )
                  }
                  rows={3}
                  placeholder="Extra product information..."
                />
              </label>

              <div className={styles.formGrid}>
                <label>
                  Tags
                  <input
                    value={form.tags}
                    onChange={(event) =>
                      updateForm("tags", event.target.value)
                    }
                    placeholder="serum, skincare, hydration"
                  />
                  <span className={styles.fieldHint}>
                    Separate tags using commas.
                  </span>
                </label>

                <label>
                  Shades
                  <input
                    value={form.shades}
                    onChange={(event) =>
                      updateForm("shades", event.target.value)
                    }
                    placeholder="Rose, Nude, Berry"
                  />
                  <span className={styles.fieldHint}>
                    Separate shades using commas.
                  </span>
                </label>
              </div>
            </div>

            <div className={styles.formSection}>
              <h3>Pricing and stock</h3>

              <div className={styles.formGrid}>
                <label>
                  Original price *
                  <input
                    type="number"
                    min="0"
                    value={form.oldPrice}
                    onChange={(event) =>
                      updateForm("oldPrice", event.target.value)
                    }
                    placeholder="799"
                    required
                  />
                </label>

                <label>
                  Discount type
                  <select
                    value={form.discountType}
                    onChange={(event) =>
                      updateForm(
                        "discountType",
                        event.target.value as DiscountType,
                      )
                    }
                  >
                    <option value="none">No discount</option>
                    <option value="flat">Flat amount</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </label>

                <label>
                  Discount value
                  <input
                    type="number"
                    min="0"
                    value={form.discountValue}
                    onChange={(event) =>
                      updateForm("discountValue", event.target.value)
                    }
                    disabled={form.discountType === "none"}
                    placeholder="10"
                  />
                </label>

                <label>
                  Stock quantity *
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={form.stock}
                    onChange={(event) => {
                      const value = event.target.value;
                      if (value === "" || /^\d+$/.test(value)) {
                        updateForm("stock", value);
                      }
                    }}
                    placeholder="100"
                    required
                  />
                  <span className={styles.fieldHint}>
                    Enter the available quantity. Use 0 when the product is out of stock.
                  </span>
                </label>

              </div>

              <div className={styles.pricePreview}>
                <span>Final selling price</span>
                <strong>
                  ₹{calculatePreviewPrice().toFixed(2)}
                </strong>
              </div>
            </div>

            <div className={styles.formSection}>
              <h3>Offers</h3>

              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={form.offer.enabled}
                  onChange={(event) =>
                    updateOffer("enabled", event.target.checked)
                  }
                />
                Enable special offer for this product
              </label>

              {form.offer.enabled && (
                <>
                  <div className={styles.formGrid}>
                    <label>
                      Offer title
                      <input
                        value={form.offer.title}
                        onChange={(event) =>
                          updateOffer("title", event.target.value)
                        }
                        placeholder="Festive Beauty Offer"
                      />
                    </label>

                    <label>
                      Offer badge
                      <input
                        value={form.offer.badge}
                        onChange={(event) =>
                          updateOffer("badge", event.target.value)
                        }
                        placeholder="Limited Time"
                      />
                    </label>

                    <label>
                      Offer discount type
                      <select
                        value={form.offer.discountType}
                        onChange={(event) =>
                          updateOffer(
                            "discountType",
                            event.target.value as DiscountType,
                          )
                        }
                      >
                        <option value="none">No discount</option>
                        <option value="flat">Flat amount</option>
                        <option value="percentage">Percentage</option>
                      </select>
                    </label>

                    <label>
                      Offer discount value
                      <input
                        type="number"
                        min="0"
                        value={form.offer.discountValue}
                        onChange={(event) =>
                          updateOffer(
                            "discountValue",
                            event.target.value,
                          )
                        }
                        disabled={
                          form.offer.discountType === "none"
                        }
                        placeholder="100"
                      />
                    </label>

                    <label>
                      Offer start date
                      <input
                        type="date"
                        value={form.offer.startDate}
                        onChange={(event) =>
                          updateOffer(
                            "startDate",
                            event.target.value,
                          )
                        }
                      />
                    </label>

                    <label>
                      Offer end date
                      <input
                        type="date"
                        value={form.offer.endDate}
                        onChange={(event) =>
                          updateOffer("endDate", event.target.value)
                        }
                      />
                    </label>
                  </div>

                  <label>
                    Offer description
                    <textarea
                      value={form.offer.description}
                      onChange={(event) =>
                        updateOffer(
                          "description",
                          event.target.value,
                        )
                      }
                      rows={3}
                      placeholder="Get an additional discount on this product..."
                    />
                  </label>

                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={form.offer.active}
                      onChange={(event) =>
                        updateOffer("active", event.target.checked)
                      }
                    />
                    Offer is active
                  </label>

                  <div className={styles.pricePreview}>
                    <span>Offer price preview</span>
                    <strong>
                      ₹{getOfferPreviewPrice().toFixed(2)}
                    </strong>
                  </div>
                </>
              )}
            </div>

            <div className={styles.formSection}>
              <h3>Product classification</h3>

              <div className={styles.formGrid}>
                <label>
                  Badge
                  <input
                    value={form.badge}
                    onChange={(event) =>
                      updateForm("badge", event.target.value)
                    }
                    placeholder="Best Seller"
                  />
                </label>

                <label>
                  Product type
                  <select
                    value={form.productType}
                    onChange={(event) =>
                      updateForm(
                        "productType",
                        event.target.value as ProductForm["productType"],
                      )
                    }
                  >
                    <option value="regular">Regular</option>
                    <option value="new-arrival">New Arrival</option>
                    <option value="bestseller">Best Seller</option>
                  </select>
                </label>
              </div>

              <div className={styles.checkboxGrid}>
                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.isNewArrival}
                    onChange={(event) =>
                      updateForm("isNewArrival", event.target.checked)
                    }
                  />
                  Show in New Arrivals
                </label>

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.isBestseller}
                    onChange={(event) =>
                      updateForm("isBestseller", event.target.checked)
                    }
                  />
                  Show in Best Sellers
                </label>

                <label className={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={(event) =>
                      updateForm("active", event.target.checked)
                    }
                  />
                  Product is active
                </label>
              </div>

              <div className={styles.formGrid}>
                <label>
                  New Arrival sort order
                  <input
                    type="number"
                    min="0"
                    value={form.newArrivalSortOrder}
                    onChange={(event) =>
                      updateForm("newArrivalSortOrder", event.target.value)
                    }
                    disabled={!form.isNewArrival}
                    placeholder="0"
                  />
                  <span className={styles.fieldHint}>
                    Lower numbers appear first in New Arrivals.
                  </span>
                </label>

                <label>
                  Best Seller sort order
                  <input
                    type="number"
                    min="0"
                    value={form.bestSellerSortOrder}
                    onChange={(event) =>
                      updateForm("bestSellerSortOrder", event.target.value)
                    }
                    disabled={!form.isBestseller}
                    placeholder="0"
                  />
                  <span className={styles.fieldHint}>
                    Lower numbers appear first in Best Sellers.
                  </span>
                </label>
              </div>
            </div>

            <div className={styles.formSection}>
              <h3>Media</h3>

              <label>
                Product images *
                <div className={styles.fileBox}>
                  <ImagePlus size={22} />
                  <span>
                    {imageFiles.length
                      ? `${imageFiles.length} image(s) selected`
                      : "Choose up to 10 product images"}
                  </span>

                  <input
                    id="product-images"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleImageChange}
                  />
                </div>
              </label>

              {imageFiles.length > 0 && (
                <div className={styles.selectedFiles}>
                  {imageFiles.map((file) => (
                    <span
                      key={`${file.name}-${file.lastModified}`}
                    >
                      {file.name}
                    </span>
                  ))}
                </div>
              )}

              {existingImages.length > 0 && (
                <div className={styles.existingMedia}>
                  <p>Existing images</p>

                  <div className={styles.imageGrid}>
                    {existingImages.map((image, index) => (
                      <img
                        key={`${image}-${index}`}
                        src={getImageUrl(image)}
                        alt={`${form.name} ${index + 1}`}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className={styles.formGrid}>
                <label>
                  Hover image
                  <div className={styles.fileBox}>
                    <ImagePlus size={22} />
                    <span>
                      {hoverImageFile
                        ? hoverImageFile.name
                        : "Choose hover image"}
                    </span>

                    <input
                      id="product-hover-image"
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        handleSingleImageChange(
                          event,
                          setHoverImageFile,
                        )
                      }
                    />
                  </div>
                </label>

                <label>
                  Before image
                  <div className={styles.fileBox}>
                    <ImagePlus size={22} />
                    <span>
                      {beforeImageFile
                        ? beforeImageFile.name
                        : "Choose before image"}
                    </span>

                    <input
                      id="product-before-image"
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        handleSingleImageChange(
                          event,
                          setBeforeImageFile,
                        )
                      }
                    />
                  </div>
                </label>

                <label>
                  After image
                  <div className={styles.fileBox}>
                    <ImagePlus size={22} />
                    <span>
                      {afterImageFile
                        ? afterImageFile.name
                        : "Choose after image"}
                    </span>

                    <input
                      id="product-after-image"
                      type="file"
                      accept="image/*"
                      onChange={(event) =>
                        handleSingleImageChange(
                          event,
                          setAfterImageFile,
                        )
                      }
                    />
                  </div>
                </label>
              </div>

              {(existingHoverImage ||
                existingBeforeImage ||
                existingAfterImage) && (
                <div className={styles.existingMedia}>
                  <p>Existing additional images</p>

                  <div className={styles.imageGrid}>
                    {existingHoverImage && (
                      <img
                        src={getImageUrl(existingHoverImage)}
                        alt="Existing hover image"
                      />
                    )}

                    {existingBeforeImage && (
                      <img
                        src={getImageUrl(existingBeforeImage)}
                        alt="Existing before image"
                      />
                    )}

                    {existingAfterImage && (
                      <img
                        src={getImageUrl(existingAfterImage)}
                        alt="Existing after image"
                      />
                    )}
                  </div>
                </div>
              )}

              <label>
                Product video
                <div className={styles.fileBox}>
                  <Upload size={22} />
                  <span>
                    {videoFile
                      ? videoFile.name
                      : "Choose a product video"}
                  </span>

                  <input
                    id="product-video"
                    type="file"
                    accept="video/*"
                    onChange={handleVideoChange}
                  />
                </div>
              </label>

              {existingVideo && (
                <div className={styles.existingVideo}>
                  <video
                    src={getImageUrl(existingVideo)}
                    controls
                    preload="metadata"
                  />
                </div>
              )}

              <label>
                YouTube video URL
                <input
                  type="url"
                  value={form.youtubeVideoUrl}
                  onChange={(event) =>
                    updateForm(
                      "youtubeVideoUrl",
                      event.target.value,
                    )
                  }
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </label>

              {loading && (
                <div className={styles.uploadProgressWrapper}>
                  <div className={styles.uploadProgressHeader}>
                    <span>Uploading media...</span>
                    <strong>{uploadProgress}%</strong>
                  </div>

                  <div className={styles.uploadProgressTrack}>
                    <div
                      className={styles.uploadProgressBar}
                      style={{
                        width: `${uploadProgress}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            <div className={styles.formActions}>
              <button
                type="submit"
                className={styles.saveButton}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle
                      size={18}
                      className={styles.spin}
                    />
                    Saving {uploadProgress}%
                  </>
                ) : (
                  <>
                    <Upload size={18} />
                    {isEditing ? "Update Product" : "Create Product"}
                  </>
                )}
              </button>

              {isEditing && (
                <button
                  type="button"
                  className={styles.cancelButton}
                  onClick={resetForm}
                  disabled={loading}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>

        <div className={styles.productsCard}>
          <div className={styles.cardHeader}>
            <div>
              <h2>Product List</h2>
              <p>{products.length} products available</p>
            </div>

            <Package size={24} className={styles.headerIcon} />
          </div>

          <div className={styles.filters}>
            <div className={styles.searchBox}>
              <Search size={17} />

              <input
                value={searchTerm}
                onChange={(event) =>
                  setSearchTerm(event.target.value)
                }
                placeholder="Search products..."
              />
            </div>

            <select
              value={filterType}
              onChange={(event) =>
                setFilterType(event.target.value)
              }
            >
              <option value="all">All products</option>
              <option value="new-arrival">New arrivals</option>
              <option value="bestseller">Best sellers</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {loadingProducts ? (
            <div className={styles.emptyState}>
              Loading products...
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className={styles.emptyState}>
              <Package size={35} />
              <p>No products found.</p>
            </div>
          ) : (
            <div className={styles.productList}>
              {filteredProducts.map((product) => {
                const firstImage = product.images?.[0];
                const hoverImage =
                  product.hoverImage || product.images?.[1];
                const sellingPrice = product.price ?? 0;

                return (
                  <article
                    className={styles.productItem}
                    key={getProductId(product)}
                  >
                    <div className={styles.productThumbnail}>
                      {firstImage ? (
                        <div className={styles.hoverImagePreview}>
                          <img
                            src={getImageUrl(firstImage)}
                            alt={product.name}
                          />

                          {hoverImage && (
                            <img
                              src={getImageUrl(hoverImage)}
                              alt={`${product.name} hover preview`}
                            />
                          )}
                        </div>
                      ) : (
                        <Package size={25} />
                      )}
                    </div>

                    <div className={styles.productDetails}>
                      <h3>{product.name}</h3>
                      <p>{product.brand}</p>

                      <div className={styles.productMeta}>
                        <strong>₹{sellingPrice}</strong>

                        {product.oldPrice > sellingPrice && (
                          <del>₹{product.oldPrice}</del>
                        )}
                      </div>

                      <div className={styles.stockStatus}>
                        <span className={getStockStatus(product.stock ?? 0).className}>
                          {getStockStatus(product.stock ?? 0).label}
                        </span>
                      </div>

                      <div className={styles.badges}>
                        {product.isNewArrival && (
                          <span className={styles.newBadge}>
                            New Arrival
                          </span>
                        )}

                        {product.isBestseller && (
                          <span className={styles.bestBadge}>
                            Bestseller
                          </span>
                        )}

                        {product.offer?.enabled &&
                          product.offer.active !== false && (
                            <span className={styles.offerBadge}>
                              {product.offer.badge || "Offer"}
                            </span>
                          )}

                        <span
                          className={
                            product.active
                              ? styles.activeBadge
                              : styles.inactiveBadge
                          }
                        >
                          {product.active ? "Active" : "Inactive"}
                        </span>
                      </div>
                    </div>

                    <div className={styles.productActions}>
                      <button
                        type="button"
                        className={styles.editButton}
                        onClick={() => startEdit(product)}
                        aria-label={`Edit ${product.name}`}
                      >
                        <Edit3 size={17} />
                      </button>

                      <button
                        type="button"
                        className={styles.deleteButton}
                        onClick={() => handleDelete(product)}
                        aria-label={`Delete ${product.name}`}
                      >
                        <Trash2 size={17} />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default ProductManager;