import { useEffect, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  PackageCheck,
  Truck,
  X,
} from "lucide-react";

import styles from "./LogisticsSidebar.module.css";

interface LogisticsSidebarProps {
  active: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  logoutLoading: boolean;
  collapsed: boolean;
  onCollapsedChange: (collapsed: boolean) => void;
  mobileOpen: boolean;
  onMobileOpenChange: (open: boolean) => void;
}

const LogisticsSidebar = ({
  active,
  onNavigate,
  onLogout,
  logoutLoading,
  collapsed,
  onCollapsedChange,
  mobileOpen,
  onMobileOpenChange,
}: LogisticsSidebarProps) => {
  const menu = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "orders", label: "Orders", icon: ClipboardList },
    { id: "shipments", label: "Shipments", icon: Truck },
    { id: "deliveries", label: "Expected Deliveries", icon: PackageCheck },
  ];

  const handleNavigate = (page: string) => {
    onNavigate(page);
    onMobileOpenChange(false);
  };

  useEffect(() => {
    if (!mobileOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onMobileOpenChange(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [mobileOpen, onMobileOpenChange]);

  return (
    <>
      <button
        type="button"
        className={styles.mobileMenuButton}
        onClick={() => onMobileOpenChange(true)}
        aria-label="Open logistics navigation"
        aria-expanded={mobileOpen}
      >
        <Menu size={22} />
      </button>

      {mobileOpen && (
        <button
          type="button"
          className={styles.mobileOverlay}
          onClick={() => onMobileOpenChange(false)}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={`${styles.sidebar} ${
          collapsed ? styles.collapsed : ""
        } ${mobileOpen ? styles.mobileOpen : ""}`}
        aria-label="Logistics navigation"
      >
        <div className={styles.brand}>
          <div className={styles.brandMark}>
            <img
              src="/jihaan-logo.jpeg"
              alt="Jihaan Beauty"
              onError={(event) => {
                event.currentTarget.style.display = "none";
                const parent = event.currentTarget.parentElement;
                if (parent) parent.textContent = "J";
              }}
            />
          </div>

          <div className={styles.brandText}>
            <strong>Jini</strong>
            <span>Cosmetics</span>
          </div>

          <button
            type="button"
            className={styles.mobileClose}
            onClick={() => onMobileOpenChange(false)}
            aria-label="Close logistics navigation"
          >
            <X size={20} />
          </button>
        </div>

        <div className={styles.roleCard}>
          <div className={styles.roleIcon}>
            <Truck size={19} />
          </div>
          <div className={styles.roleText}>
            <small>Logged in as</small>
            <strong>Logistics</strong>
          </div>
        </div>

        <div className={styles.sectionTitle}>Dashboard</div>

        <nav className={styles.navigation}>
          {menu.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;

            return (
              <button
                key={item.id}
                type="button"
                className={`${styles.navItem} ${
                  isActive ? styles.active : ""
                }`}
                onClick={() => handleNavigate(item.id)}
                title={collapsed ? item.label : undefined}
              >
                <span className={styles.navIcon}>
                  <Icon size={19} />
                </span>
                <span className={styles.navLabel}>{item.label}</span>
                {isActive && <span className={styles.activeDot} />}
              </button>
            );
          })}
        </nav>

        <div className={styles.bottom}>
          <button
            type="button"
            className={styles.logout}
            onClick={onLogout}
            disabled={logoutLoading}
            title={collapsed ? "Logout" : undefined}
          >
            <LogOut size={19} />
            <span className={styles.logoutLabel}>
              {logoutLoading ? "Logging out..." : "Logout"}
            </span>
          </button>
        </div>

        <button
          type="button"
          className={styles.collapseButton}
          onClick={() => onCollapsedChange(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>
      </aside>
    </>
  );
};

export default LogisticsSidebar;
