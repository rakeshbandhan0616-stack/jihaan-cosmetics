import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import {
  Edit,
  Eye,
  Image as ImageIcon,
  Plus,
  Save,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";

import "./HeroBannersManager.css";

type BannerType = "image" | "video";

interface HeroBanner {
  _id: string;
  title?: string;
  description?: string;
  type: BannerType;
  category?: string;
  desktopSrc?: string;
  mobileSrc?: string;
  buttonText?: string;
  productId?: string;
  productSlug?: string;
  alt?: string;
  displayOrder?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface BannerForm {
  title: string;
  description: string;
  type: BannerType;
  category: string;
  buttonText: string;
  productId: string;
  productSlug: string;
  alt: string;
  displayOrder: string;
  isActive: boolean;
  desktopFile: File | null;
  mobileFile: File | null;
}

interface FileResolution {
  width: number;
  height: number;
}

const API_BASE_URL =
  import.meta.env.VITE_API_URL || "https://jihaan-cosmetics.onrender.com";

const HERO_BANNERS_ENDPOINT = `${API_BASE_URL}/api/hero-banners`;

const initialForm: BannerForm = {
  title: "",
  description: "",
  type: "image",
  category: "",
  buttonText: "Shop Now",
  productId: "",
  productSlug: "",
  alt: "",
  displayOrder: "0",
  isActive: true,
  desktopFile: null,
  mobileFile: null,
};

const allowedImageTypes = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/avif",
];

const allowedVideoTypes = [
  "video/mp4",
  "video/webm",
  "video/quicktime",
];

const MAX_FILE_SIZE = 100 * 1024 * 1024;

function getAuthHeaders(): HeadersInit {
  const token =
    localStorage.getItem("token") ||
    localStorage.getItem("accessToken") ||
    localStorage.getItem("adminToken");

  return token
    ? {
        Authorization: `Bearer ${token}`,
      }
    : {};
}

function getFileUrl(filePath?: string): string {
  if (!filePath) {
    return "";
  }

  if (filePath.startsWith("http://") || filePath.startsWith("https://")) {
    return filePath;
  }

  if (filePath.startsWith("/")) {
    return `${API_BASE_URL}${filePath}`;
  }

  return `${API_BASE_URL}/${filePath}`;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Something went wrong. Please try again.";
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getExpectedResolution(type: BannerType, mobile: boolean): string {
  if (type === "video") {
    return mobile ? "1080 × 1350 px" : "1920 × 700 px";
  }

  return mobile ? "1080 × 1350 px" : "1920 × 700 px";
}

function validateResolution(
  resolution: FileResolution,
  type: BannerType,
  mobile: boolean
): string | null {
  const minimumWidth = mobile ? 600 : 1200;
  const minimumHeight = mobile ? 700 : 400;

  if (
    resolution.width < minimumWidth ||
    resolution.height < minimumHeight
  ) {
    return mobile
      ? `Mobile ${type} resolution is too small. Use at least ${minimumWidth} × ${minimumHeight}px.`
      : `Desktop ${type} resolution is too small. Use at least ${minimumWidth} × ${minimumHeight}px.`;
  }

  return null;
}

function readImageResolution(file: File): Promise<FileResolution> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);

      resolve({
        width: image.naturalWidth,
        height: image.naturalHeight,
      });
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read image resolution."));
    };

    image.src = objectUrl;
  });
}

function readVideoResolution(file: File): Promise<FileResolution> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);

    video.preload = "metadata";

    video.onloadedmetadata = () => {
      URL.revokeObjectURL(objectUrl);

      resolve({
        width: video.videoWidth,
        height: video.videoHeight,
      });
    };

    video.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("Unable to read video resolution."));
    };

    video.src = objectUrl;
  });
}

async function validateUploadedFile(
  file: File,
  type: BannerType,
  mobile: boolean
): Promise<void> {
  const allowedTypes =
    type === "image" ? allowedImageTypes : allowedVideoTypes;

  if (!allowedTypes.includes(file.type)) {
    throw new Error(
      `Invalid file type. Please upload a supported ${type} file.`
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new Error(
      `File size must be less than 100 MB. Current size: ${formatFileSize(
        file.size
      )}`
    );
  }

  const resolution =
    type === "image"
      ? await readImageResolution(file)
      : await readVideoResolution(file);

  const resolutionError = validateResolution(resolution, type, mobile);

  if (resolutionError) {
    throw new Error(
      `${resolutionError} Recommended resolution: ${getExpectedResolution(
        type,
        mobile
      )}.`
    );
  }
}

export default function HeroBannersManager() {
  const [banners, setBanners] = useState<HeroBanner[]>([]);
  const [form, setForm] = useState<BannerForm>(initialForm);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [desktopPreview, setDesktopPreview] = useState("");
  const [mobilePreview, setMobilePreview] = useState("");

  const sortedBanners = useMemo(() => {
    return [...banners].sort(
      (first, second) =>
        Number(first.displayOrder || 0) - Number(second.displayOrder || 0)
    );
  }, [banners]);

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    return () => {
      if (desktopPreview.startsWith("blob:")) {
        URL.revokeObjectURL(desktopPreview);
      }

      if (mobilePreview.startsWith("blob:")) {
        URL.revokeObjectURL(mobilePreview);
      }
    };
  }, [desktopPreview, mobilePreview]);

  async function fetchBanners() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(HERO_BANNERS_ENDPOINT, {
        method: "GET",
        headers: {
          ...getAuthHeaders(),
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch hero banners.");
      }

      const bannerList = Array.isArray(data)
        ? data
        : data.banners || data.data || [];

      setBanners(bannerList);
    } catch (fetchError) {
      setError(getErrorMessage(fetchError));
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setEditingId(null);
    setDesktopPreview("");
    setMobilePreview("");
    setError("");
    setSuccess("");
  }

  function openCreateForm() {
    resetForm();
    setShowForm(true);
  }

  function openEditForm(banner: HeroBanner) {
    setEditingId(banner._id);
    setShowForm(true);
    setError("");
    setSuccess("");

    setForm({
      title: banner.title || "",
      description: banner.description || "",
      type: banner.type || "image",
      category: banner.category || "",
      buttonText: banner.buttonText || "Shop Now",
      productId: banner.productId || "",
      productSlug: banner.productSlug || "",
      alt: banner.alt || "",
      displayOrder: String(banner.displayOrder || 0),
      isActive: banner.isActive !== false,
      desktopFile: null,
      mobileFile: null,
    });

    setDesktopPreview(getFileUrl(banner.desktopSrc));
    setMobilePreview(getFileUrl(banner.mobileSrc));
  }

  function closeForm() {
    if (saving) {
      return;
    }

    setShowForm(false);
    resetForm();
  }

  function handleInputChange(
    event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  function handleActiveChange(event: ChangeEvent<HTMLInputElement>) {
    setForm((previous) => ({
      ...previous,
      isActive: event.target.checked,
    }));
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>,
    field: "desktopFile" | "mobileFile"
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const isMobile = field === "mobileFile";

    try {
      setError("");
      setSuccess("");

      await validateUploadedFile(file, form.type, isMobile);

      const previewUrl = URL.createObjectURL(file);

      if (field === "desktopFile") {
        setDesktopPreview(previewUrl);
      } else {
        setMobilePreview(previewUrl);
      }

      setForm((previous) => ({
        ...previous,
        [field]: file,
      }));
    } catch (fileError) {
      event.target.value = "";
      setError(getErrorMessage(fileError));
    }
  }

  function removeSelectedFile(field: "desktopFile" | "mobileFile") {
    if (field === "desktopFile") {
      setForm((previous) => ({
        ...previous,
        desktopFile: null,
      }));
      setDesktopPreview("");
    } else {
      setForm((previous) => ({
        ...previous,
        mobileFile: null,
      }));
      setMobilePreview("");
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");
      setSuccess("");

      if (!editingId && !form.desktopFile) {
        throw new Error("Please upload a desktop image or video.");
      }

      if (!editingId && !form.mobileFile) {
        throw new Error("Please upload a mobile image or video.");
      }

      if (form.desktopFile) {
        await validateUploadedFile(
          form.desktopFile,
          form.type,
          false
        );
      }

      if (form.mobileFile) {
        await validateUploadedFile(
          form.mobileFile,
          form.type,
          true
        );
      }

      const formData = new FormData();

      formData.append("type", form.type);
      formData.append("title", form.title.trim());
      formData.append("description", form.description.trim());
      formData.append("category", form.category.trim());
      formData.append("buttonText", form.buttonText.trim() || "Shop Now");
      formData.append("productId", form.productId.trim());
      formData.append("productSlug", form.productSlug.trim());
      formData.append("alt", form.alt.trim());
      formData.append("displayOrder", form.displayOrder || "0");
      formData.append("isActive", String(form.isActive));

      if (form.desktopFile) {
        formData.append("desktopSrc", form.desktopFile);
      }

      if (form.mobileFile) {
        formData.append("mobileSrc", form.mobileFile);
      }

      const endpoint = editingId
        ? `${HERO_BANNERS_ENDPOINT}/${editingId}`
        : HERO_BANNERS_ENDPOINT;

      const response = await fetch(endpoint, {
        method: editingId ? "PUT" : "POST",
        headers: {
          ...getAuthHeaders(),
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to save hero banner.");
      }

      setSuccess(
        editingId
          ? "Hero banner updated successfully."
          : "Hero banner created successfully."
      );

      await fetchBanners();

      setTimeout(() => {
        setShowForm(false);
        resetForm();
      }, 700);
    } catch (submitError) {
      setError(getErrorMessage(submitError));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(banner: HeroBanner) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${banner.title || "this banner"}"?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setDeletingId(banner._id);
      setError("");
      setSuccess("");

      const response = await fetch(
        `${HERO_BANNERS_ENDPOINT}/${banner._id}`,
        {
          method: "DELETE",
          headers: {
            ...getAuthHeaders(),
          },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to delete hero banner.");
      }

      setBanners((previous) =>
        previous.filter((item) => item._id !== banner._id)
      );

      setSuccess("Hero banner deleted successfully.");
    } catch (deleteError) {
      setError(getErrorMessage(deleteError));
    } finally {
      setDeletingId(null);
    }
  }

  async function handleToggleStatus(banner: HeroBanner) {
    try {
      setError("");
      setSuccess("");

      const formData = new FormData();

      formData.append("isActive", String(!banner.isActive));

      const response = await fetch(
        `${HERO_BANNERS_ENDPOINT}/${banner._id}`,
        {
          method: "PUT",
          headers: {
            ...getAuthHeaders(),
          },
          body: formData,
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to update banner status.");
      }

      setBanners((previous) =>
        previous.map((item) =>
          item._id === banner._id
            ? {
                ...item,
                isActive: !item.isActive,
              }
            : item
        )
      );
    } catch (toggleError) {
      setError(getErrorMessage(toggleError));
    }
  }

  function renderMedia(
    source: string | undefined,
    type: BannerType,
    alt: string
  ) {
    const mediaUrl = getFileUrl(source);

    if (!mediaUrl) {
      return (
        <div className="heroBannerMediaPlaceholder">
          <ImageIcon size={28} />
          <span>No media</span>
        </div>
      );
    }

    if (type === "video") {
      return (
        <video
          className="heroBannerMedia"
          src={mediaUrl}
          controls
          muted
          preload="metadata"
        />
      );
    }

    return (
      <img
        className="heroBannerMedia"
        src={mediaUrl}
        alt={alt || "Hero banner"}
      />
    );
  }

  function renderPreview(
    source: string,
    type: BannerType,
    alt: string
  ) {
    if (!source) {
      return null;
    }

    if (type === "video") {
      return (
        <video
          className="heroBannerUploadPreview"
          src={source}
          controls
          muted
        />
      );
    }

    return (
      <img
        className="heroBannerUploadPreview"
        src={source}
        alt={alt || "Selected banner preview"}
      />
    );
  }

  return (
    <section className="heroBannersManager">
      <div className="heroBannersHeader">
        <div>
          <p className="heroBannersEyebrow">Store content</p>
          <h2>Hero Banners</h2>
          <p className="heroBannersDescription">
            Upload responsive image or video banners for your beauty store.
          </p>
        </div>

        <button
          type="button"
          className="heroPrimaryButton"
          onClick={openCreateForm}
        >
          <Plus size={18} />
          Add Hero Banner
        </button>
      </div>

      {error && <div className="heroAlert heroAlertError">{error}</div>}
      {success && (
        <div className="heroAlert heroAlertSuccess">{success}</div>
      )}

      {showForm && (
        <div className="heroBannerFormCard">
          <div className="heroBannerFormHeader">
            <div>
              <h3>{editingId ? "Edit Hero Banner" : "Create Hero Banner"}</h3>
              <p>
                Recommended desktop resolution: 1920 × 700 px. Recommended
                mobile resolution: 1080 × 1350 px.
              </p>
            </div>

            <button
              type="button"
              className="heroCloseButton"
              onClick={closeForm}
              aria-label="Close form"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="heroBannerForm">
            <div className="heroFormGrid">
              <label className="heroFormField">
                <span>Banner title</span>
                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleInputChange}
                  placeholder="Summer Beauty Sale"
                  required
                />
              </label>

              <label className="heroFormField">
                <span>Category</span>
                <input
                  type="text"
                  name="category"
                  value={form.category}
                  onChange={handleInputChange}
                  placeholder="Skincare, Makeup, Haircare"
                  required
                />
              </label>

              <label className="heroFormField">
                <span>Media type</span>
                <select
                  name="type"
                  value={form.type}
                  onChange={(event) => {
                    setForm((previous) => ({
                      ...previous,
                      type: event.target.value as BannerType,
                      desktopFile: null,
                      mobileFile: null,
                    }));

                    setDesktopPreview("");
                    setMobilePreview("");
                  }}
                >
                  <option value="image">Image</option>
                  <option value="video">Video</option>
                </select>
              </label>

              <label className="heroFormField">
                <span>Button text</span>
                <input
                  type="text"
                  name="buttonText"
                  value={form.buttonText}
                  onChange={handleInputChange}
                  placeholder="Shop Now"
                />
              </label>

              <label className="heroFormField">
                <span>Product ID</span>
                <input
                  type="text"
                  name="productId"
                  value={form.productId}
                  onChange={handleInputChange}
                  placeholder="Optional product ID"
                />
              </label>

              <label className="heroFormField">
                <span>Product slug</span>
                <input
                  type="text"
                  name="productSlug"
                  value={form.productSlug}
                  onChange={handleInputChange}
                  placeholder="Optional product slug"
                />
              </label>

              <label className="heroFormField">
                <span>Display order</span>
                <input
                  type="number"
                  name="displayOrder"
                  value={form.displayOrder}
                  onChange={handleInputChange}
                  min="0"
                />
              </label>

              <label className="heroFormField">
                <span>Alt text</span>
                <input
                  type="text"
                  name="alt"
                  value={form.alt}
                  onChange={handleInputChange}
                  placeholder="Beauty products promotional banner"
                />
              </label>
            </div>

            <label className="heroFormField">
              <span>Description</span>
              <textarea
                name="description"
                value={form.description}
                onChange={handleInputChange}
                rows={3}
                placeholder="Discover our latest beauty collection..."
              />
            </label>

            <div className="heroUploadGrid">
              <div className="heroUploadBox">
                <div className="heroUploadBoxHeader">
                  <div>
                    <h4>Desktop media</h4>
                    <p>
                      {form.type === "image"
                        ? "Recommended: 1920 × 700 px"
                        : "Recommended: 1920 × 700 px MP4/WebM"}
                    </p>
                  </div>
                  {form.type === "image" ? (
                    <ImageIcon size={22} />
                  ) : (
                    <Video size={22} />
                  )}
                </div>

                <label className="heroUploadLabel">
                  <Upload size={20} />
                  <span>Choose desktop file</span>
                  <small>
                    {form.type === "image"
                      ? "JPG, PNG, WEBP, AVIF"
                      : "MP4, WebM, MOV"}
                  </small>
                  <input
                    type="file"
                    accept={
                      form.type === "image"
                        ? "image/jpeg,image/png,image/webp,image/avif"
                        : "video/mp4,video/webm,video/quicktime"
                    }
                    onChange={(event) =>
                      handleFileChange(event, "desktopFile")
                    }
                  />
                </label>

                {desktopPreview && (
                  <div className="heroPreviewWrapper">
                    {renderPreview(
                      desktopPreview,
                      form.type,
                      form.alt
                    )}

                    <button
                      type="button"
                      className="heroRemoveFileButton"
                      onClick={() => removeSelectedFile("desktopFile")}
                    >
                      <X size={15} />
                      Remove
                    </button>
                  </div>
                )}
              </div>

              <div className="heroUploadBox">
                <div className="heroUploadBoxHeader">
                  <div>
                    <h4>Mobile media</h4>
                    <p>
                      {form.type === "image"
                        ? "Recommended: 1080 × 1350 px"
                        : "Recommended: 1080 × 1350 px MP4/WebM"}
                    </p>
                  </div>
                  {form.type === "image" ? (
                    <ImageIcon size={22} />
                  ) : (
                    <Video size={22} />
                  )}
                </div>

                <label className="heroUploadLabel">
                  <Upload size={20} />
                  <span>Choose mobile file</span>
                  <small>
                    {form.type === "image"
                      ? "JPG, PNG, WEBP, AVIF"
                      : "MP4, WebM, MOV"}
                  </small>
                  <input
                    type="file"
                    accept={
                      form.type === "image"
                        ? "image/jpeg,image/png,image/webp,image/avif"
                        : "video/mp4,video/webm,video/quicktime"
                    }
                    onChange={(event) =>
                      handleFileChange(event, "mobileFile")
                    }
                  />
                </label>

                {mobilePreview && (
                  <div className="heroPreviewWrapper">
                    {renderPreview(mobilePreview, form.type, form.alt)}

                    <button
                      type="button"
                      className="heroRemoveFileButton"
                      onClick={() => removeSelectedFile("mobileFile")}
                    >
                      <X size={15} />
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <label className="heroCheckboxField">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={handleActiveChange}
              />
              <span>Show this banner on the website</span>
            </label>

            <div className="heroFormActions">
              <button
                type="button"
                className="heroSecondaryButton"
                onClick={closeForm}
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                className="heroPrimaryButton"
                disabled={saving}
              >
                <Save size={18} />
                {saving
                  ? "Saving..."
                  : editingId
                  ? "Update Banner"
                  : "Create Banner"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="heroBannerList">
        {loading ? (
          <div className="heroEmptyState">Loading hero banners...</div>
        ) : sortedBanners.length === 0 ? (
          <div className="heroEmptyState">
            <ImageIcon size={40} />
            <h3>No hero banners found</h3>
            <p>Create your first image or video hero banner.</p>
            <button
              type="button"
              className="heroPrimaryButton"
              onClick={openCreateForm}
            >
              <Plus size={18} />
              Add Hero Banner
            </button>
          </div>
        ) : (
          sortedBanners.map((banner) => (
            <article className="heroBannerCard" key={banner._id}>
              <div className="heroBannerCardMedia">
                {renderMedia(
                  banner.desktopSrc,
                  banner.type,
                  banner.alt || banner.title || "Hero banner"
                )}
              </div>

              <div className="heroBannerCardContent">
                <div className="heroBannerCardTop">
                  <div>
                    <span className="heroBannerCategory">
                      {banner.category || "Uncategorized"}
                    </span>
                    <h3>{banner.title || "Untitled banner"}</h3>
                  </div>

                  <span
                    className={
                      banner.isActive
                        ? "heroStatus heroStatusActive"
                        : "heroStatus heroStatusInactive"
                    }
                  >
                    {banner.isActive ? "Active" : "Inactive"}
                  </span>
                </div>

                {banner.description && <p>{banner.description}</p>}

                <div className="heroBannerMeta">
                  <span>
                    {banner.type === "video" ? (
                      <Video size={15} />
                    ) : (
                      <ImageIcon size={15} />
                    )}
                    {banner.type}
                  </span>

                  <span>Order: {banner.displayOrder || 0}</span>

                  {banner.buttonText && (
                    <span>Button: {banner.buttonText}</span>
                  )}
                </div>

                <div className="heroBannerActions">
                  <button
                    type="button"
                    className="heroActionButton"
                    onClick={() => openEditForm(banner)}
                  >
                    <Edit size={16} />
                    Edit
                  </button>

                  <button
                    type="button"
                    className="heroActionButton"
                    onClick={() => handleToggleStatus(banner)}
                  >
                    <Eye size={16} />
                    {banner.isActive ? "Hide" : "Show"}
                  </button>

                  <button
                    type="button"
                    className="heroActionButton heroDeleteButton"
                    onClick={() => handleDelete(banner)}
                    disabled={deletingId === banner._id}
                  >
                    <Trash2 size={16} />
                    {deletingId === banner._id ? "Deleting..." : "Delete"}
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