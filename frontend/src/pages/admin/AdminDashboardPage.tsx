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
  settings: "Settings",
};

export default function AdminDashboardPage() {
  const [activeSection, setActiveSection] =
    useState<AdminSection>("overview");

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const getPageTitle = (): string => {
    return PAGE_TITLES[activeSection] ?? "Admin Dashboard";
  };

  const handleSectionChange = (section: AdminSection) => {
    setActiveSection(section);
    setSidebarOpen(false);
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "overview":
        return <DashboardOverview />;

      case "products":
        return <ProductsManager />;

      case "categories":
        return <CategoriesManager />;

      case "brands":
        return <BrandsManager />;

      case "hero":
        return <HeroBannersManager />;

      case "offers":
        return <OffersManager />;

      case "new-arrivals":
        return <NewArrivalManager />;

      case "orders":
        return <OrdersManager />;

      case "customers":
        return <UsersManager />;

      case "contact":
        return <ContactUsManager />;

      case "analytics":
        return <AnalyticsManager />;

      case "settings":
        return (
          <section className="emptyAdminSection">
            <div className="emptyAdminSectionIcon">⚙️</div>
            <h2>Settings</h2>
            <p>Settings management will be available soon.</p>
          </section>
        );

      default:
        return <DashboardOverview />;
    }
  };

  const mainClassName = [
    "adminMain",
    sidebarCollapsed ? "mainWithCollapsedSidebar" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="adminLayout">
      <AdminSidebar
        activeSection={activeSection}
        onSectionChange={handleSectionChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => {
          setSidebarCollapsed((previous) => !previous);
        }}
      />

      <div className={mainClassName}>
        <AdminHeader
          onMenuClick={() => setSidebarOpen(true)}
          title={getPageTitle()}
        />

        <main className="adminContent">{renderActiveSection()}</main>
      </div>
    </div>
  );
}