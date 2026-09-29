import { useState } from "react";

import AdminHeader from "./components/AdminHeader";
import AdminSidebar from "./components/AdminSidebar";
import type { AdminSection } from "./components/AdminSidebar";

import DashboardOverview from "./components/DashboardOverview";

import ProductsManager from "./modules/ProductsManager";
import CategoriesManager from "./modules/CategoriesManager";
import BrandsManager from "./modules/BrandsManager";
import HeroBannersManager from "./modules/HeroBannersManager";
import OffersManager from "./modules/OffersManager";
import NewArrivalManager from "./modules/NewArrivalManager";
import OrdersManager from "./modules/OrdersManager";
import UsersManager from "./modules/UsersManager";
import ContactUsManager from "./modules/ContactUsManager";
import AnalyticsManager from "./modules/AnalyticsManager";
import NotificationsManager from "./modules/NotificationsManager";

import "./AdminDashboardPage.css";

const PAGE_TITLES: Record<AdminSection, string> = {
  overview: "Dashboard Overview",
  products: "Products",
  categories: "Categories",
  brands: "Brands",
  hero: "Hero Banners",
  offers: "Offers",
  "new-arrivals": "New Arrivals",
  orders: "Orders",
  customers: "Customers",
  contact: "Contact Messages",
  analytics: "Analytics",
  notifications: "Notifications",
  settings: "Settings",
};

export default function AdminDashboardPage() {
  const [activeSection, setActiveSection] =
    useState<AdminSection>("overview");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] =
    useState(false);

  const getPageTitle = (): string => {
    return (
      PAGE_TITLES[activeSection] ??
      "Admin Dashboard"
    );
  };

  const handleSectionChange = (
    section: AdminSection,
  ) => {
    setActiveSection(section);
    setSidebarOpen(false);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      /*
       * ---------------------------------------------------------
       * DASHBOARD
       * ---------------------------------------------------------
       */

      case "overview":
        return <DashboardOverview />;

      /*
       * ---------------------------------------------------------
       * PRODUCTS
       * ---------------------------------------------------------
       */

      case "products":
        return <ProductsManager />;

      /*
       * ---------------------------------------------------------
       * CATEGORIES
       * ---------------------------------------------------------
       */

      case "categories":
        return <CategoriesManager />;

      /*
       * ---------------------------------------------------------
       * BRANDS
       * ---------------------------------------------------------
       */

      case "brands":
        return <BrandsManager />;

      /*
       * ---------------------------------------------------------
       * HERO BANNERS
       * ---------------------------------------------------------
       */

      case "hero":
        return <HeroBannersManager />;

      /*
       * ---------------------------------------------------------
       * OFFERS
       * ---------------------------------------------------------
       */

      case "offers":
        return <OffersManager />;

      /*
       * ---------------------------------------------------------
       * NEW ARRIVALS
       * ---------------------------------------------------------
       */

      case "new-arrivals":
        return <NewArrivalManager />;

      /*
       * ---------------------------------------------------------
       * ORDERS
       * ---------------------------------------------------------
       */

      case "orders":
        return <OrdersManager />;

      /*
       * ---------------------------------------------------------
       * CUSTOMERS
       * ---------------------------------------------------------
       */

      case "customers":
        return <UsersManager />;

      /*
       * ---------------------------------------------------------
       * CONTACT
       * ---------------------------------------------------------
       */

      case "contact":
        return <ContactUsManager />;

      /*
       * ---------------------------------------------------------
       * ANALYTICS
       * ---------------------------------------------------------
       */

      case "analytics":
        return <AnalyticsManager />;

      /*
       * ---------------------------------------------------------
       * NOTIFICATIONS
       * ---------------------------------------------------------
       *
       * Admin and Super Admin can create, edit,
       * activate/deactivate and delete notifications.
       */

      case "notifications":
        return <NotificationsManager />;

      /*
       * ---------------------------------------------------------
       * SETTINGS
       * ---------------------------------------------------------
       */

      case "settings":
        return (
          <section className="emptyAdminSection">
            <div className="emptyAdminSectionIcon">
              ⚙️
            </div>

            <h2>Settings</h2>

            <p>
              Settings management will be available
              soon.
            </p>
          </section>
        );

      /*
       * ---------------------------------------------------------
       * FALLBACK
       * ---------------------------------------------------------
       */

      default:
        return <DashboardOverview />;
    }
  };

  const mainClassName = [
    "adminMain",
    sidebarCollapsed
      ? "mainWithCollapsedSidebar"
      : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="adminLayout">
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={
          handleSectionChange
        }
        isOpen={sidebarOpen}
        onClose={() =>
          setSidebarOpen(false)
        }
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => {
          setSidebarCollapsed(
            (previous) => !previous,
          );
        }}
      />

      <div className={mainClassName}>
        <AdminHeader
          onMenuClick={() =>
            setSidebarOpen(true)
          }
          title={getPageTitle()}
        />

        <main className="adminContent">
          {renderActiveSection()}
        </main>
      </div>
    </div>
  );
}