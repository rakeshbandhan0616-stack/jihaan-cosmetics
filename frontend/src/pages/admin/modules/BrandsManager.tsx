import {
  FormEvent,
  useEffect,
  useState,
} from "react";

import {
  apiRequest,
  getArray,
  getEntityId,
} from "../utils/adminApi";

import type { Brand } from "../types/admin.types";
import "./AdminModules.css"
interface BrandForm {
  name: string;
  description: string;
  logo: string;
  website: string;
  displayOrder: number;
  active: boolean;
}

const initialForm: BrandForm = {
  name: "",
  description: "",
  logo: "",
  website: "",
  displayOrder: 1,
  active: true,
};

export default function BrandsManager() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [form, setForm] = useState<BrandForm>(initialForm);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const loadBrands = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await apiRequest<any>("/brands");

      const items = getArray<any>(response, [
        "brands",
        "data",
      ]);

      const normalizedBrands: Brand[] = items.map((brand) => ({
        id: getEntityId(brand),
        name: brand.name || "",
        description: brand.description || "",
        logo: brand.logo || brand.logoUrl || "",
        website: brand.website || "",
        displayOrder: Number(brand.displayOrder || 1),
        active: brand.active ?? true,
      }));

      setBrands(
        normalizedBrands.sort(
          (first, second) =>
            (first.displayOrder || 0) -
            (second.displayOrder || 0)
        )
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load brands"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBrands();
  }, []);

  const updateField = (
    field: keyof BrandForm,
    value: string | number | boolean
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm(initialForm);
    setEditingId(null);
    setError("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>
  ) => {
    event.preventDefault();

    if (!form.name.trim()) {
      setError("Brand name is required");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      const payload = {
        name: form.name.trim(),
        description: form.description.trim(),
        logo: form.logo.trim(),
        website: form.website.trim(),
        displayOrder: Number(form.displayOrder),
        active: form.active,
      };

      if (editingId) {
        await apiRequest(`/brands/${editingId}`, {
          method: "PUT",
          body: JSON.stringify(payload),
        });

        setSuccess("Brand updated successfully");
      } else {
        await apiRequest("/brands", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        setSuccess("Brand created successfully");
      }

      resetForm();
      await loadBrands();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to save brand"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (brand: Brand) => {
    setEditingId(brand.id);

    setForm({
      name: brand.name,
      description: brand.description || "",
      logo: brand.logo || "",
      website: brand.website || "",
      displayOrder: brand.displayOrder || 1,
      active: brand.active,
    });

    setError("");
    setSuccess("");
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm(
      "Are you sure you want to delete this brand?"
    );

    if (!confirmed) return;

    try {
      setError("");
      setSuccess("");

      await apiRequest(`/brands/${id}`, {
        method: "DELETE",
      });

      setSuccess("Brand deleted successfully");
      await loadBrands();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to delete brand"
      );
    }
  };

  const toggleBrand = async (brand: Brand) => {
    try {
      setError("");
      setSuccess("");

      await apiRequest(`/brands/${brand.id}`, {
        method: "PUT",
        body: JSON.stringify({
          active: !brand.active,
        }),
      });

      setSuccess(
        `Brand ${brand.active ? "deactivated" : "activated"} successfully`
      );

      await loadBrands();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to update brand status"
      );
    }
  };

  return (
    <section className="adminSection">
      <div className="pageHeading">
        <div>
          <h2>Brands Management</h2>
          <p>Add, edit and manage beauty brands.</p>
        </div>
      </div>

      {error && <div className="errorMessage">{error}</div>}
      {success && <div className="successMessage">{success}</div>}

      <form className="adminForm" onSubmit={handleSubmit}>
        <h3>{editingId ? "Edit Brand" : "Add Brand"}</h3>

        <div className="formGrid">
          <label>
            Brand Name
            <input
              type="text"
              value={form.name}
              onChange={(event) =>
                updateField("name", event.target.value)
              }
              placeholder="Enter brand name"
              required
            />
          </label>

          <label>
            Display Order
            <input
              type="number"
              min={1}
              value={form.displayOrder}
              onChange={(event) =>
                updateField(
                  "displayOrder",
                  Number(event.target.value)
                )
              }
            />
          </label>

          <label className="fullWidth">
            Logo URL
            <input
              type="url"
              value={form.logo}
              onChange={(event) =>
                updateField("logo", event.target.value)
              }
              placeholder="https://example.com/logo.png"
            />
          </label>

          <label className="fullWidth">
            Website
            <input
              type="url"
              value={form.website}
              onChange={(event) =>
                updateField("website", event.target.value)
              }
              placeholder="https://example.com"
            />
          </label>

          <label className="fullWidth">
            Description
            <textarea
              rows={4}
              value={form.description}
              onChange={(event) =>
                updateField(
                  "description",
                  event.target.value
                )
              }
              placeholder="Enter brand description"
            />
          </label>

          <label className="checkboxLabel">
            <input
              type="checkbox"
              checked={form.active}
              onChange={(event) =>
                updateField("active", event.target.checked)
              }
            />
            Active brand
          </label>
        </div>

        {form.logo && (
          <div className="formImagePreview">
            <p>Logo Preview</p>

            <img
              src={form.logo}
              alt="Brand logo preview"
            />
          </div>
        )}

        <div className="formActions">
          <button type="submit" disabled={saving}>
            {saving
              ? "Saving..."
              : editingId
                ? "Update Brand"
                : "Add Brand"}
          </button>

          {editingId && (
            <button
              type="button"
              className="secondaryButton"
              onClick={resetForm}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      <div className="brandGrid">
        {loading ? (
          <p>Loading brands...</p>
        ) : brands.length === 0 ? (
          <p>No brands found.</p>
        ) : (
          brands.map((brand) => (
            <article className="brandCard" key={brand.id}>
              <div className="brandLogoPreview">
                {brand.logo ? (
                  <img
                    src={brand.logo}
                    alt={brand.name}
                  />
                ) : (
                  <span>
                    {brand.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>

              <div className="brandCardContent">
                <div className="brandCardHeading">
                  <h3>{brand.name}</h3>

                  <span
                    className={
                      brand.active
                        ? "statusActive"
                        : "statusInactive"
                    }
                  >
                    {brand.active ? "Active" : "Inactive"}
                  </span>
                </div>

                {brand.description && (
                  <p>{brand.description}</p>
                )}

                {brand.website && (
                  <a
                    href={brand.website}
                    target="_blank"
                    rel="noreferrer"
                    className="brandWebsite"
                  >
                    Visit Website
                  </a>
                )}

                <small>
                  Display order: {brand.displayOrder || 1}
                </small>

                <div className="cardActions">
                  <button
                    type="button"
                    onClick={() => handleEdit(brand)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => toggleBrand(brand)}
                  >
                    {brand.active
                      ? "Deactivate"
                      : "Activate"}
                  </button>

                  <button
                    type="button"
                    className="dangerButton"
                    onClick={() => handleDelete(brand.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}