import {
  BarChart3,
  Boxes,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  PackageCheck,
  Truck,
} from "lucide-react";

import type { StaffRole } from "../../api/staffApi";

import styles from "./StaffSidebar.module.css";

interface StaffSidebarProps {
  role: StaffRole;
  active: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
}

const StaffSidebar = ({
  role,
  active,
  onNavigate,
  onLogout,
}: StaffSidebarProps) => {
  const accountsMenu = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "sales",
      label: "Sales",
      icon: BarChart3,
    },
    {
      id: "orders",
      label: "Orders",
      icon: ClipboardList,
    },
    {
      id: "inventory",
      label: "Inventory",
      icon: Boxes,
    },
  ];

  const logisticsMenu = [
    {
      id: "overview",
      label: "Overview",
      icon: LayoutDashboard,
    },
    {
      id: "orders",
      label: "Orders",
      icon: ClipboardList,
    },
    {
      id: "shipments",
      label: "Shipments",
      icon: Truck,
    },
    {
      id: "deliveries",
      label: "Expected Deliveries",
      icon: PackageCheck,
    },
  ];

  const menu =
    role === "accounts"
      ? accountsMenu
      : logisticsMenu;

  const roleLabel =
    role === "accounts"
      ? "Accounts"
      : "Logistics";

  const handleNavigation = (page: string) => {
    onNavigate(page);
  };

  const handleLogout = () => {
    onLogout();
  };

  return (
    <aside className={styles.sidebar}>
      {/* =====================================================
          BRAND
      ===================================================== */}
      <div className={styles.brand}>
        <div className={styles.logoWrapper}>
          <img
            src="/jihaan-logo.png"
            alt="Jihaan Cosmetics"
            className={styles.logo}
            onError={(event) => {
              event.currentTarget.style.display = "none";

              const fallback =
                event.currentTarget
                  .parentElement
                  ?.querySelector(
                    `.${styles.logoFallback}`,
                  ) as HTMLElement | null;

              if (fallback) {
                fallback.style.display = "flex";
              }
            }}
          />

          <div
            className={styles.logoFallback}
            aria-hidden="true"
          >
            J
          </div>
        </div>

        <div className={styles.brandText}>
          <h2>Jihaan</h2>
          <span>Beauty</span>
        </div>
      </div>

      {/* =====================================================
          ROLE BOX
      ===================================================== */}
      <div className={styles.roleBox}>
        <div className={styles.roleIcon}>
          {role === "accounts" ? (
            <BarChart3 size={18} />
          ) : (
            <Truck size={18} />
          )}
        </div>

        <div className={styles.roleContent}>
          <small>Logged in as</small>
          <strong>{roleLabel}</strong>
        </div>
      </div>

      {/* =====================================================
          NAVIGATION
      ===================================================== */}
      <nav
        className={styles.navigation}
        aria-label={`${roleLabel} navigation`}
      >
        <div className={styles.sectionTitle}>
          DASHBOARD
        </div>

        <div className={styles.menuList}>
          {menu.map((item) => {
            const Icon = item.icon;

            const isActive =
              active === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={
                  isActive
                    ? `${styles.navItem} ${styles.active}`
                    : styles.navItem
                }
                onClick={() =>
                  handleNavigation(item.id)
                }
                title={item.label}
                aria-current={
                  isActive ? "page" : undefined
                }
              >
                <span className={styles.navIcon}>
                  <Icon size={19} strokeWidth={2} />
                </span>

                <span className={styles.navLabel}>
                  {item.label}
                </span>

                {isActive && (
                  <span
                    className={styles.activeIndicator}
                    aria-hidden="true"
                  />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* =====================================================
          BOTTOM / LOGOUT
      ===================================================== */}
      <div className={styles.sidebarBottom}>
        <button
          type="button"
          className={styles.logout}
          onClick={handleLogout}
          title="Logout"
        >
          <span className={styles.logoutIcon}>
            <LogOut
              size={19}
              strokeWidth={2}
            />
          </span>

          <span className={styles.logoutLabel}>
            Logout
          </span>
        </button>
      </div>
    </aside>
  );
};

export default StaffSidebar;