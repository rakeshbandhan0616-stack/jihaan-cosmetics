import type { ElementType } from "react";

import {
  BarChart3,
  BadgePercent,
  ChevronLeft,
  ClipboardList,
  Image,
  LayoutDashboard,
  LogOut,
  Mail,
  Package,
  Settings,
  Tags,
  Users,
  X,
} from "lucide-react";

import "./AdminSidebar.css";

export type AdminSection =
  | "overview"
  | "products"
  | "categories"
  | "brands"
  | "hero"
  | "offers"
  | "new-arrivals"
  | "orders"
  | "customers"
  | "contact"
  | "analytics"
  | "settings";

interface AdminSidebarProps {
  activeSection: AdminSection;
  onSectionChange: (section: AdminSection) => void;
  isOpen?: boolean;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

interface MenuItem {
  id: AdminSection;
  label: string;
  description?: string;
  icon: ElementType;
}

const menuItems: MenuItem[] = [
  {
    id: "overview",
    label: "Dashboard Overview",
    icon: LayoutDashboard,
  },
  {
    id: "products",
    label: "Products",
    icon: Package,
  },
  {
    id: "categories",
    label: "Categories",
    icon: Tags,
  },
  {
    id: "hero",
    label: "Hero Banners",
    icon: Image,
  },
  {
    id: "offers",
    label: "Offers",
    icon: BadgePercent,
  },
  {
    id: "orders",
    label: "Orders",
    description: "Manage orders, payments and tracking",
    icon: ClipboardList,
  },
  {
    id: "customers",
    label: "User Management",
    icon: Users,
  },
  {
    id: "contact",
    label: "Contact Messages",
    description: "Manage customer enquiries and replies",
    icon: Mail,
  },
  {
    id: "analytics",
    label: "Analytics",
    icon: BarChart3,
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
  },
];

export default function AdminSidebar({
  activeSection,
  onSectionChange,
  isOpen = false,
  onClose,
  collapsed = false,
  onToggleCollapse,
}: AdminSidebarProps) {
  const handleSectionChange = (section: AdminSection) => {
    onSectionChange(section);
    onClose?.();
  };

  const handleLogout = () => {
    localStorage.removeItem("adminToken");
    localStorage.removeItem("token");
    localStorage.removeItem("jihaan_auth_token");

    window.location.href = "/admin/login";
  };

  return (
    <>
      {isOpen && (
        <button
          type="button"
          className="sidebarOverlay"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}

      <aside
        className={[
          "adminSidebar",
          isOpen ? "sidebarOpen" : "sidebarClosed",
          collapsed ? "sidebarCollapsed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="sidebarBrand">
          <div className="brandLogo">V</div>

          {!collapsed && (
            <div className="brandText">
              <strong>Jihaan Cosmetics</strong>
              <span>Admin Panel</span>
            </div>
          )}

          <button
            type="button"
            className="sidebarCloseButton"
            onClick={onClose}
            aria-label="Close sidebar"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="sidebarNavigation" aria-label="Admin navigation">
          {!collapsed && <p className="sidebarLabel">MAIN MENU</p>}

          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={[
                  "sidebarMenuItem",
                  isActive ? "active" : "",
                  item.id === "orders" ? "ordersMenuItem" : "",
                  item.id === "contact" ? "contactMenuItem" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
                onClick={() => handleSectionChange(item.id)}
                title={
                  collapsed
                    ? item.description
                      ? `${item.label} - ${item.description}`
                      : item.label
                    : undefined
                }
                aria-current={isActive ? "page" : undefined}
              >
                <Icon size={20} />

                {!collapsed && (
                  <span className="sidebarMenuContent">
                    <span className="sidebarMenuLabel">{item.label}</span>

                    {item.id === "orders" && (
                      <span className="sidebarMenuDescription">
                        Orders & Tracking
                      </span>
                    )}

                    {item.id === "contact" && (
                      <span className="sidebarMenuDescription">
                        Customer Enquiries
                      </span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="sidebarBottom">
          {onToggleCollapse && (
            <button
              type="button"
              className="sidebarMenuItem collapseButton"
              onClick={onToggleCollapse}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={
                collapsed ? "Expand sidebar" : "Collapse sidebar"
              }
            >
              <ChevronLeft
                size={20}
                className={collapsed ? "rotateIcon" : ""}
              />

              {!collapsed && <span>Collapse Sidebar</span>}
            </button>
          )}

          <button
            type="button"
            className="sidebarMenuItem logoutButton"
            onClick={handleLogout}
            title="Logout"
          >
            <LogOut size={20} />

            {!collapsed && <span>Logout</span>}
          </button>
        </div>
      </aside>
    </>
  );
}