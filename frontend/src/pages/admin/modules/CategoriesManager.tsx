import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  apiRequest,
  getArray,
  getEntityId,
} from "../utils/adminApi";

import type { Category } from "../types/admin.types";

import "./CategoriesManager.css";

interface CategoryForm {
  name: string;
  description: string;
  isActive: boolean;
}

interface CategoryApiItem {
  _id?: string;
  id?: string;
  name?: string;
  description?: string;
  image?: string;
  isActive?: boolean;
  active?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

const emptyForm: CategoryForm = {
  name: "",
  description: "",
  isActive: true,
};

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/$/, "");

const SERVER_BASE_URL = API_BASE_URL.replace(/\/api$/, "");

const getImageUrl = (imagePath?: string): string => {
  if (!imagePath) {
    return "";
  }

  if (
    imagePath.startsWith("http://") ||
    imagePath.startsWith("https://") ||
    imagePath.startsWith("data:") ||
    imagePath.startsWith("blob:")
  ) {
    return imagePath;
  }

  return `${SERVER_BASE_URL}/${imagePath.replace(/^\/+/, "")}`;
};

const getErrorMessage = (
  error: unknown,
  fallbackMessage: string,
): string => {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  return fallbackMessage;
};

export default function CategoriesManager() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryForm>(emptyForm);

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");

  const [editingId, setEditingId] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(
    null,
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadCategories = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest<{
        success?: boolean;
        categories?: CategoryApiItem[];
        data?:
          | CategoryApiItem[]
          | {
              categories?: CategoryApiItem[];
            };
      }>("/categories/all");

      const items = getArray<CategoryApiItem>(response, [
        "categories",
        "data",
      ]);

      const normalizedCategories: Category[] = items.map(
        (category) => ({
          id: getEntityId(category),
          name: category.name?.trim() || "",
          description: category.description?.trim() || "",
          image: getImageUrl(category.image),
          isActive:
            category.isActive ??
            category.active ??
            true,
        }),
      );

      setCategories(normalizedCategories);
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to load categories.",
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadCategories();
  }, []);

  useEffect(() => {
    return () => {
      if (imagePreview.startsWith("blob:")) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const updateField = (
    field: keyof CategoryForm,
    value: string | boolean,
  ) => {
    setForm((previousForm) => ({
      ...previousForm,
      [field]: value,
    }));
  };

  const handleImageChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0] || null;

    setError("");

    if (!file) {
      setImageFile(null);
      setImagePreview("");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file.");
      event.target.value = "";
      return;
    }

    const maxFileSize = 5 * 1024 * 1024;

    if (file.size > maxFileSize) {
      setError("Image size must be less than 5 MB.");
      event.target.value = "";
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const resetForm = () => {
    setForm(emptyForm);
    setImageFile(null);
    setImagePreview("");
    setEditingId(null);
    setError("");
  };

  const submitForm = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    const trimmedName = form.name.trim();
    const trimmedDescription = form.description.trim();

    if (!trimmedName) {
      setError("Category name is required.");
      return;
    }

    if (!editingId && !imageFile) {
      setError("Category image is required.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const formData = new FormData();

      formData.append("name", trimmedName);
      formData.append(
        "description",
        trimmedDescription,
      );
      formData.append(
        "isActive",
        String(form.isActive),
      );

      if (imageFile) {
        formData.append("image", imageFile);
      }

      if (editingId) {
        await apiRequest(`/categories/${editingId}`, {
          method: "PUT",
          body: formData,
        });

        setSuccess("Category updated successfully.");
      } else {
        await apiRequest("/categories", {
          method: "POST",
          body: formData,
        });

        setSuccess("Category created successfully.");
      }

      resetForm();
      await loadCategories();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to save category.",
        ),
      );
    } finally {
      setSaving(false);
    }
  };

  const editCategory = (category: Category) => {
    setEditingId(category.id);

    setForm({
      name: category.name || "",
      description: category.description || "",
      isActive: category.isActive ?? true,
    });

    setImageFile(null);
    setImagePreview(category.image || "");

    setError("");
    setSuccess("");
  };

  const deleteCategory = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete this category?",
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(id);
      setError("");
      setSuccess("");

      await apiRequest(`/categories/${id}`, {
        method: "DELETE",
      });

      if (editingId === id) {
        resetForm();
      }

      setSuccess("Category deleted successfully.");
      await loadCategories();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to delete category.",
        ),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const toggleCategoryStatus = async (
    category: Category,
  ) => {
    try {
      setError("");
      setSuccess("");

      const formData = new FormData();

      formData.append(
        "isActive",
        String(!category.isActive),
      );

      await apiRequest(`/categories/${category.id}`, {
        method: "PUT",
        body: formData,
      });

      setSuccess(
        `Category ${
          !category.isActive
            ? "activated"
            : "deactivated"
        } successfully.`,
      );

      await loadCategories();
    } catch (err) {
      setError(
        getErrorMessage(
          err,
          "Unable to update category status.",
        ),
      );
    }
  };

  return (
    <section className="adminSection">
      <div className="pageHeading">
        <div>
          <h2>Categories</h2>
          <p>
            Create, update, activate, deactivate and
            delete product categories.
          </p>
        </div>
      </div>

      {error && (
        <div className="errorMessage" role="alert">
          {error}
        </div>
      )}

      {success && (
        <div className="successMessage" role="status">
          {success}
        </div>
      )}

      <form
        className="adminForm"
        onSubmit={submitForm}
      >
        <h3>
          {editingId
            ? "Edit Category"
            : "Add Category"}
        </h3>

        <div className="formGrid">
          <label>
            Category Name

            <input
              type="text"
              value={form.name}
              onChange={(event) => {
                updateField(
                  "name",
                  event.target.value,
                );
              }}
              placeholder="Example: Skincare"
              maxLength={100}
              required
            />
          </label>

          <label>
            Category Image

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleImageChange}
              required={!editingId}
            />
          </label>

          {imagePreview && (
            <div className="imagePreviewContainer">
              <img
                src={imagePreview}
                alt="Category preview"
                className="imagePreview"
              />

              <button
                type="button"
                className="secondaryButton"
                onClick={() => {
                  setImageFile(null);
                  setImagePreview("");
                }}
              >
                Remove Image
              </button>
            </div>
          )}

          <label className="fullWidth">
            Description

            <textarea
              value={form.description}
              onChange={(event) => {
                updateField(
                  "description",
                  event.target.value,
                );
              }}
              placeholder="Enter category description"
              rows={4}
              maxLength={500}
            />
          </label>

          <label className="checkboxLabel">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => {
                updateField(
                  "isActive",
                  event.target.checked,
                );
              }}
            />

            <span>Active category</span>
          </label>
        </div>

        <div className="formActions">
          <button
            type="submit"
            disabled={saving}
          >
            {saving
              ? "Saving..."
              : editingId
                ? "Update Category"
                : "Add Category"}
          </button>

          {editingId && (
            <button
              type="button"
              className="secondaryButton"
              onClick={resetForm}
              disabled={saving}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="tableWrapper">
        <table className="dataTable">
          <thead>
            <tr>
              <th>Image</th>
              <th>Name</th>
              <th>Description</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5}>
                  Loading categories...
                </td>
              </tr>
            ) : categories.length === 0 ? (
              <tr>
                <td colSpan={5}>
                  No categories found.
                </td>
              </tr>
            ) : (
              categories.map((category) => (
                <tr key={category.id}>
                  <td>
                    {category.image ? (
                      <img
                        src={category.image}
                        alt={category.name}
                        className="tableImage"
                        loading="lazy"
                      />
                    ) : (
                      "—"
                    )}
                  </td>

                  <td>
                    <strong>{category.name}</strong>
                  </td>

                  <td>
                    {category.description || "—"}
                  </td>

                  <td>
                    <button
                      type="button"
                      className={
                        category.isActive
                          ? "statusActive"
                          : "statusInactive"
                      }
                      onClick={() => {
                        void toggleCategoryStatus(
                          category,
                        );
                      }}
                    >
                      {category.isActive
                        ? "Active"
                        : "Inactive"}
                    </button>
                  </td>

                  <td className="tableActions">
                    <button
                      type="button"
                      onClick={() => {
                        editCategory(category);
                      }}
                    >
                      Edit
                    </button>

                    <button
                      type="button"
                      className="dangerButton"
                      disabled={
                        deletingId === category.id
                      }
                      onClick={() => {
                        void deleteCategory(
                          category.id,
                        );
                      }}
                    >
                      {deletingId === category.id
                        ? "Deleting..."
                        : "Delete"}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}