import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  Edit,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react";

import "./NewArrivalManager.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

const BACKEND_URL = API_BASE_URL.replace(/\/api\/?$/, "");

interface NewArrival {
  _id: string;
  name: string;
  brand: string;
  category: string;
  description?: string;
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
  updatedAt?: string;
}

interface NewArrivalForm {
  name: string;
  brand: string;
  category: string;
  description: string;
  rating: string;
  reviews: string;
  oldPrice: string;
  price: string;
  discount: string;
  prepaidPrice: string;
  sortOrder: string;
  active: boolean;
  image: File | null;
  demoImage: File | null;
}

const emptyForm: NewArrivalForm = {
  name: "",
  brand: "",
  category: "",
  description: "",
  rating: "0",
  reviews: "0",
  oldPrice: "",
  price: "",
  discount: "",
  prepaidPrice: "0",
  sortOrder: "0",
  active: true,
  image: null,
  demoImage: null,
};

const getImageUrl = (image?: string) => {
  if (!image) return "";

  if (
    image.startsWith("http://") ||
    image.startsWith("https://") ||
    image.startsWith("data:") ||
    image.startsWith("blob:")
  ) {
    return image;
  }

  return `${BACKEND_URL}${image.startsWith("/") ? image : `/${image}`}`;
};

const getErrorMessage = (error: unknown) => {
  if (axios.isAxiosError(error)) {
    return (
      error.response?.data?.message ||
      error.response?.data?.error ||
      error.message ||
      "Something went wrong"
    );
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong";
};

const NewArrivalManager = () => {
  const [newArrivals, setNewArrivals] = useState<NewArrival[]>([]);
  const [form, setForm] = useState<NewArrivalForm>(emptyForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const [mainPreview, setMainPreview] = useState("");
  const [demoPreview, setDemoPreview] = useState("");

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const fetchNewArrivals = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await axios.get(
        `${API_BASE_URL}/new-arrivals/admin`,
      );

      const data = response.data;

      const arrivals = Array.isArray(data)
        ? data
        : Array.isArray(data?.newArrivals)
          ? data.newArrivals
          : Array.isArray(data?.data)
            ? data.data
            : [];

      setNewArrivals(arrivals);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNewArrivals();
  }, []);

  const filteredNewArrivals = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return [...newArrivals]
      .sort(
        (a, b) =>
          Number(a.sortOrder || 0) - Number(b.sortOrder || 0),
      )
      .filter((item) => {
        if (!search) return true;

        return (
          item.name?.toLowerCase().includes(search) ||
          item.brand?.toLowerCase().includes(search) ||
          item.category?.toLowerCase().includes(search)
        );
      });
  }, [newArrivals, searchTerm]);

  const revokePreviewUrl = (preview: string) => {
    if (preview.startsWith("blob:")) {
      URL.revokeObjectURL(preview);
    }
  };

  const resetForm = () => {
    revokePreviewUrl(mainPreview);
    revokePreviewUrl(demoPreview);

    setForm({ ...emptyForm });
    setEditingId(null);
    setMainPreview("");
    setDemoPreview("");
  };

  const openCreateForm = () => {
    resetForm();
    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const openEditForm = (item: NewArrival) => {
    revokePreviewUrl(mainPreview);
    revokePreviewUrl(demoPreview);

    setEditingId(item._id);

    setForm({
      name: item.name || "",
      brand: item.brand || "",
      category: item.category || "",
      description: item.description || "",
      rating: String(item.rating ?? 0),
      reviews: String(item.reviews ?? 0),
      oldPrice: String(item.oldPrice ?? ""),
      price: String(item.price ?? ""),
      discount: item.discount || "",
      prepaidPrice: String(item.prepaidPrice ?? 0),
      sortOrder: String(item.sortOrder ?? 0),
      active: item.active ?? true,
      image: null,
      demoImage: null,
    });

    setMainPreview(getImageUrl(item.image));
    setDemoPreview(getImageUrl(item.demoImage));

    setError("");
    setSuccess("");
    setShowForm(true);
  };

  const closeForm = () => {
    if (submitting) return;

    resetForm();
    setShowForm(false);
  };

  const handleInputChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleActiveChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setForm((previous) => ({
      ...previous,
      active: event.target.checked,
    }));
  };

  const handleMainImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Main image must be smaller than 5MB.");
      return;
    }

    revokePreviewUrl(mainPreview);

    const previewUrl = URL.createObjectURL(file);

    setForm((previous) => ({
      ...previous,
      image: file,
    }));

    setMainPreview(previewUrl);
    setError("");
  };

  const handleDemoImageChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid demo image file.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("Demo image must be smaller than 5MB.");
      return;
    }

    revokePreviewUrl(demoPreview);

    const previewUrl = URL.createObjectURL(file);

    setForm((previous) => ({
      ...previous,
      demoImage: file,
    }));

    setDemoPreview(previewUrl);
    setError("");
  };

  const validateForm = () => {
    const oldPrice = Number(form.oldPrice);
    const price = Number(form.price);
    const prepaidPrice = Number(form.prepaidPrice);
    const rating = Number(form.rating);
    const reviews = Number(form.reviews);
    const sortOrder = Number(form.sortOrder);

    if (!form.name.trim()) {
      return "Product name is required.";
    }

    if (!form.brand.trim()) {
      return "Brand is required.";
    }

    if (!form.category.trim()) {
      return "Category is required.";
    }

    if (!editingId && !form.image) {
      return "Main image is required.";
    }

    if (!form.oldPrice || !form.price) {
      return "Old price and offer price are required.";
    }

    if (
      !Number.isFinite(oldPrice) ||
      !Number.isFinite(price) ||
      oldPrice < 0 ||
      price < 0
    ) {
      return "Prices must be valid positive numbers.";
    }

    if (price > oldPrice) {
      return "Offer price cannot be greater than old price.";
    }

    if (
      prepaidPrice < 0 ||
      (prepaidPrice > price && prepaidPrice !== 0)
    ) {
      return "Prepaid price cannot be greater than offer price.";
    }

    if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
      return "Rating must be between 0 and 5.";
    }

    if (!Number.isFinite(reviews) || reviews < 0) {
      return "Reviews cannot be negative.";
    }

    if (!Number.isFinite(sortOrder) || sortOrder < 0) {
      return "Sort order cannot be negative.";
    }

    return "";
  };

  const handleSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
      return;
    }

    try {
      setSubmitting(true);
      setError("");
      setSuccess("");

      const formData = new FormData();

      formData.append("name", form.name.trim());
      formData.append("brand", form.brand.trim());
      formData.append("category", form.category.trim());
      formData.append("description", form.description.trim());
      formData.append("rating", form.rating);
      formData.append("reviews", form.reviews);
      formData.append("oldPrice", form.oldPrice);
      formData.append("price", form.price);
      formData.append("discount", form.discount.trim());
      formData.append("prepaidPrice", form.prepaidPrice);
      formData.append("sortOrder", form.sortOrder);
      formData.append("active", String(form.active));

      if (form.image) {
        formData.append("image", form.image);
      }

      if (form.demoImage) {
        formData.append("demoImage", form.demoImage);
      }

      if (editingId) {
        await axios.put(
          `${API_BASE_URL}/new-arrivals/${editingId}`,
          formData,
        );

        setSuccess("New arrival updated successfully.");
      } else {
        await axios.post(
          `${API_BASE_URL}/new-arrivals`,
          formData,
        );

        setSuccess("New arrival created successfully.");
      }

      await fetchNewArrivals();

      resetForm();
      setShowForm(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this new arrival?",
    );

    if (!confirmed) return;

    try {
      setDeletingId(id);
      setError("");
      setSuccess("");

      await axios.delete(`${API_BASE_URL}/new-arrivals/${id}`);

      setNewArrivals((previous) =>
        previous.filter((item) => item._id !== id),
      );

      setSuccess("New arrival deleted successfully.");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggle = async (item: NewArrival) => {
    try {
      setTogglingId(item._id);
      setError("");
      setSuccess("");

      const response = await axios.patch(
        `${API_BASE_URL}/new-arrivals/${item._id}/toggle`,
      );

      const updatedItem =
        response.data?.newArrival ||
        response.data?.data ||
        response.data;

      setNewArrivals((previous) =>
        previous.map((arrival) =>
          arrival._id === item._id
            ? {
                ...arrival,
                active:
                  typeof updatedItem?.active === "boolean"
                    ? updatedItem.active
                    : !arrival.active,
              }
            : arrival,
        ),
      );

      setSuccess(
        item.active
          ? "New arrival disabled successfully."
          : "New arrival activated successfully.",
      );
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setTogglingId(null);
    }
  };

  return (
    <section className="new-arrival-manager">
      <div className="manager-header">
        <div>
          <p className="manager-eyebrow">Catalog Management</p>

          <h1>New Arrivals Manager</h1>

          <p className="manager-subtitle">
            Add, edit, upload images, and manage new arrival products.
          </p>
        </div>

        <button
          type="button"
          className="primary-button"
          onClick={openCreateForm}
        >
          <Plus size={18} />
          Add New Arrival
        </button>
      </div>

      {error && (
        <div className="manager-alert error-alert">
          <span>{error}</span>

          <button
            type="button"
            onClick={() => setError("")}
            aria-label="Close error message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {success && (
        <div className="manager-alert success-alert">
          <span>{success}</span>

          <button
            type="button"
            onClick={() => setSuccess("")}
            aria-label="Close success message"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className="manager-toolbar">
        <div className="search-box">
          <Search size={18} />

          <input
            type="search"
            placeholder="Search by product, brand, or category..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="manager-count">
          {filteredNewArrivals.length} products
        </div>
      </div>

      {loading ? (
        <div className="empty-state">
          <Loader2 className="spin-icon" size={28} />
          <p>Loading new arrivals...</p>
        </div>
      ) : filteredNewArrivals.length === 0 ? (
        <div className="empty-state">
          <ImageIcon size={42} />

          <h3>No new arrivals found</h3>

          <p>Add your first new arrival product.</p>

          <button
            type="button"
            className="primary-button"
            onClick={openCreateForm}
          >
            <Plus size={18} />
            Add New Arrival
          </button>
        </div>
      ) : (
        <div className="new-arrival-table-wrapper">
          <table className="new-arrival-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Brand</th>
                <th>Category</th>
                <th>Price</th>
                <th>Discount</th>
                <th>Sort Order</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {filteredNewArrivals.map((item) => (
                <tr key={item._id}>
                  <td>
                    <div className="product-cell">
                      <div className="product-image-preview">
                        <img
                          src={getImageUrl(item.image)}
                          alt={item.name}
                        />

                        {item.demoImage && (
                          <div className="demo-image-preview">
                            <img
                              src={getImageUrl(item.demoImage)}
                              alt={`${item.name} demo`}
                            />
                          </div>
                        )}
                      </div>

                      <div>
                        <strong>{item.name}</strong>

                        <span>
                          {item.description || "No description"}
                        </span>
                      </div>
                    </div>
                  </td>

                  <td>{item.brand}</td>

                  <td>{item.category}</td>

                  <td>
                    <div className="price-cell">
                      <strong>₹{item.price}</strong>

                      {item.oldPrice > item.price && (
                        <del>₹{item.oldPrice}</del>
                      )}
                    </div>
                  </td>

                  <td>{item.discount || "-"}</td>

                  <td>{item.sortOrder}</td>

                  <td>
                    <button
                      type="button"
                      className={`status-badge ${
                        item.active
                          ? "active-status"
                          : "inactive-status"
                      }`}
                      onClick={() => handleToggle(item)}
                      disabled={togglingId === item._id}
                    >
                      {togglingId === item._id ? (
                        <Loader2 size={13} className="spin-icon" />
                      ) : item.active ? (
                        <Eye size={13} />
                      ) : (
                        <EyeOff size={13} />
                      )}

                      {item.active ? "Active" : "Inactive"}
                    </button>
                  </td>

                  <td>
                    <div className="action-buttons">
                      <button
                        type="button"
                        className="icon-button edit-button"
                        title="Edit new arrival"
                        onClick={() => openEditForm(item)}
                      >
                        <Edit size={17} />
                      </button>

                      <button
                        type="button"
                        className="icon-button delete-button"
                        title="Delete new arrival"
                        onClick={() => handleDelete(item._id)}
                        disabled={deletingId === item._id}
                      >
                        {deletingId === item._id ? (
                          <Loader2
                            size={17}
                            className="spin-icon"
                          />
                        ) : (
                          <Trash2 size={17} />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="modal-overlay">
          <div className="new-arrival-modal">
            <div className="modal-header">
              <div>
                <h2>
                  {editingId
                    ? "Edit New Arrival"
                    : "Add New Arrival"}
                </h2>

                <p>
                  Add product details and upload the main and demo
                  images.
                </p>
              </div>

              <button
                type="button"
                className="modal-close-button"
                onClick={closeForm}
                disabled={submitting}
                aria-label="Close modal"
              >
                <X size={21} />
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid">
                  <div className="form-field">
                    <label htmlFor="name">Product Name *</label>

                    <input
                      id="name"
                      name="name"
                      value={form.name}
                      onChange={handleInputChange}
                      placeholder="Enter product name"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="brand">Brand *</label>

                    <input
                      id="brand"
                      name="brand"
                      value={form.brand}
                      onChange={handleInputChange}
                      placeholder="Enter brand name"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="category">Category *</label>

                    <input
                      id="category"
                      name="category"
                      value={form.category}
                      onChange={handleInputChange}
                      placeholder="Enter category"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="discount">Discount</label>

                    <input
                      id="discount"
                      name="discount"
                      value={form.discount}
                      onChange={handleInputChange}
                      placeholder="Example: 20% OFF"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="oldPrice">Old Price *</label>

                    <input
                      id="oldPrice"
                      name="oldPrice"
                      type="number"
                      min="0"
                      value={form.oldPrice}
                      onChange={handleInputChange}
                      placeholder="Enter old price"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="price">Offer Price *</label>

                    <input
                      id="price"
                      name="price"
                      type="number"
                      min="0"
                      value={form.price}
                      onChange={handleInputChange}
                      placeholder="Enter offer price"
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="prepaidPrice">
                      Prepaid Price
                    </label>

                    <input
                      id="prepaidPrice"
                      name="prepaidPrice"
                      type="number"
                      min="0"
                      value={form.prepaidPrice}
                      onChange={handleInputChange}
                      placeholder="Enter prepaid price"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="rating">Rating</label>

                    <input
                      id="rating"
                      name="rating"
                      type="number"
                      min="0"
                      max="5"
                      step="0.1"
                      value={form.rating}
                      onChange={handleInputChange}
                      placeholder="0 to 5"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="reviews">Reviews</label>

                    <input
                      id="reviews"
                      name="reviews"
                      type="number"
                      min="0"
                      value={form.reviews}
                      onChange={handleInputChange}
                      placeholder="Number of reviews"
                    />
                  </div>

                  <div className="form-field">
                    <label htmlFor="sortOrder">Sort Order</label>

                    <input
                      id="sortOrder"
                      name="sortOrder"
                      type="number"
                      min="0"
                      value={form.sortOrder}
                      onChange={handleInputChange}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label htmlFor="description">Description</label>

                  <textarea
                    id="description"
                    name="description"
                    rows={4}
                    value={form.description}
                    onChange={handleInputChange}
                    placeholder="Enter product description"
                  />
                </div>

                <div className="image-upload-grid">
                  <div className="image-upload-card">
                    <div className="upload-card-header">
                      <div>
                        <h3>Main Image *</h3>
                        <p>Default product image</p>
                      </div>

                      <Upload size={19} />
                    </div>

                    <label className="upload-area">
                      {mainPreview ? (
                        <img
                          src={mainPreview}
                          alt="Main preview"
                        />
                      ) : (
                        <>
                          <ImageIcon size={32} />
                          <span>
                            Click to upload main image
                          </span>
                        </>
                      )}

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMainImageChange}
                      />
                    </label>
                  </div>

                  <div className="image-upload-card">
                    <div className="upload-card-header">
                      <div>
                        <h3>Demo Image</h3>
                        <p>Shown on cursor hover</p>
                      </div>

                      <Upload size={19} />
                    </div>

                    <label className="upload-area">
                      {demoPreview ? (
                        <img
                          src={demoPreview}
                          alt="Demo preview"
                        />
                      ) : (
                        <>
                          <ImageIcon size={32} />
                          <span>
                            Click to upload demo image
                          </span>
                        </>
                      )}

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleDemoImageChange}
                      />
                    </label>
                  </div>
                </div>

                <label className="checkbox-field">
                  <input
                    type="checkbox"
                    checked={form.active}
                    onChange={handleActiveChange}
                  />

                  <span>Show this product as active</span>
                </label>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={closeForm}
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={submitting}
                >
                  {submitting ? (
                    <>
                      <Loader2
                        size={18}
                        className="spin-icon"
                      />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Upload size={18} />

                      {editingId
                        ? "Update New Arrival"
                        : "Save New Arrival"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
};

export default NewArrivalManager;