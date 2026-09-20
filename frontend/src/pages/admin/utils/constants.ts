export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "";

export const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";

export const ADMIN_SECTIONS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: "dashboard",
  },
  {
    key: "categories",
    label: "Categories",
    icon: "categories",
  },
  {
    key: "hero",
    label: "Hero Banners",
    icon: "hero",
  },
  {
    key: "offers",
    label: "Offers",
    icon: "offers",
  },
  {
    key: "new-arrivals",
    label: "New Arrivals",
    icon: "new-arrivals",
  },
  {
    key: "best-sellers",
    label: "Best Sellers",
    icon: "best-sellers",
  },
  {
    key: "brands",
    label: "Brands",
    icon: "brands",
  },
  {
    key: "partner-applications",
    label: "Partner Applications",
    icon: "partners",
  },
  {
    key: "profile",
    label: "Profile",
    icon: "profile",
  },
  {
    key: "settings",
    label: "Settings",
    icon: "settings",
  },
] as const;