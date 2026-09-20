import {
  Bell,
  Menu,
  Search,
  UserCircle,
} from "lucide-react";
import "./AdminHeader.css";
interface AdminHeaderProps {
  onMenuClick?: () => void;
  title?: string;
}

export default function AdminHeader({
  onMenuClick,
  title = "Admin Dashboard",
}: AdminHeaderProps) {
  return (
    <header className="adminHeader">
      <div className="adminHeaderLeft">
        <button
          type="button"
          className="mobileMenuButton"
          onClick={onMenuClick}
          aria-label="Open sidebar"
        >
          <Menu size={22} />
        </button>

        <div>
          <h1>{title}</h1>
          <p>Manage your beauty store</p>
        </div>
      </div>

      <div className="adminHeaderRight">
        <div className="adminSearchBox">
          <Search size={18} />
          <input
            type="search"
            placeholder="Search..."
            aria-label="Search"
          />
        </div>

        <button
          type="button"
          className="headerIconButton"
          aria-label="Notifications"
        >
          <Bell size={20} />
          <span className="notificationDot" />
        </button>

        <button
          type="button"
          className="adminProfileButton"
          aria-label="Admin profile"
        >
          <UserCircle size={25} />
          <span>Admin</span>
        </button>
      </div>
    </header>
  );
}