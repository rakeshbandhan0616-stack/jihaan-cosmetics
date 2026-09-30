import {
  BarChart3,
  Boxes,
  ChevronLeft,
  ChevronRight,
  IndianRupee,
  LayoutDashboard,
  LogOut,
  ShoppingBag,
  User,
  X,
} from "lucide-react";

import styles from "./AccountsSidebar.module.css";

interface AccountsSidebarProps {
  active: string;
  onNavigate: (page: string) => void;
  onLogout: () => void | Promise<void>;
  open: boolean;
  onClose: () => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

const AccountsSidebar = ({
  active,
  onNavigate,
  onLogout,
  open,
  onClose,
  collapsed,
  onToggleCollapse,
}: AccountsSidebarProps) => {
  const menu = [
    { id: "overview", label: "Overview", icon: LayoutDashboard },
    { id: "sales", label: "Sales", icon: BarChart3 },
    { id: "orders", label: "Orders", icon: ShoppingBag },
    { id: "inventory", label: "Inventory", icon: Boxes },
    { id: "account", label: "Account", icon: User },
  ];

  return (
    <>
      {open && (
        <button
          type="button"
          className={styles.mobileOverlay}
          onClick={onClose}
          aria-label="Close navigation"
        />
      )}

      <aside
        className={`${styles.sidebar}${open ? ` ${styles.open}` : ""}${collapsed ? ` ${styles.collapsed}` : ""}`}
        aria-label="Accounts navigation"
      >
        <button
          type="button"
          className={styles.mobileClose}
          onClick={onClose}
          aria-label="Close navigation menu"
          title="Close menu"
        >
          <X size={21} strokeWidth={2.4} />
        </button>

        <button
          type="button"
          className={styles.collapseButton}
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Show sidebar" : "Hide sidebar"}
          title={collapsed ? "Show sidebar" : "Hide sidebar"}
        >
          {collapsed ? <ChevronRight size={17} /> : <ChevronLeft size={17} />}
        </button>

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
        </div>

        <div className={styles.roleCard}>
          <div className={styles.roleIcon}>
            <IndianRupee size={19} />
          </div>
          <div className={styles.roleText}>
            <small>Logged in as</small>
            <strong>Accounts</strong>
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
                className={`${styles.navItem}${isActive ? ` ${styles.active}` : ""}`}
                onClick={() => onNavigate(item.id)}
                aria-current={isActive ? "page" : undefined}
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
            onClick={() => void onLogout()}
            title="Logout"
          >
            <LogOut size={19} />
            <span className={styles.logoutLabel}>Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default AccountsSidebar;
