import { useEffect, useRef, useState } from "react";
import {
  ChevronRight,
  LogOut,
  Mail,
  Menu,
  Phone,
  Settings,
  ShieldCheck,
  User,
  UserCircle,
  X,
} from "lucide-react";
import "./AdminHeader.css";

interface AdminHeaderProps {
  onMenuClick?: () => void;
  title?: string;
}

interface AdminProfile {
  name: string;
  email: string;
  phone: string;
  role?: string;
}

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/+$/, "");

const AUTH_TOKEN_KEY = "jihaan_auth_token";
const CURRENT_USER_KEY = "jihaan_current_user";

export default function AdminHeader({
  onMenuClick,
  title = "Admin Dashboard",
}: AdminHeaderProps) {
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const [profile, setProfile] = useState<AdminProfile>({
    name: "Admin",
    email: "",
    phone: "",
    role: "",
  });

  const profileRef = useRef<HTMLDivElement>(null);

  /* =========================================================
     LOAD CURRENT ADMIN
  ========================================================= */

  useEffect(() => {
    loadCurrentAdmin();
  }, []);

  const loadCurrentAdmin = () => {
    try {
      const storedUser = localStorage.getItem(CURRENT_USER_KEY);

      if (!storedUser) {
        return;
      }

      const user = JSON.parse(storedUser);

      const loadedProfile: AdminProfile = {
        name:
          user?.name ||
          user?.fullName ||
          user?.username ||
          user?.firstName ||
          "Admin",
        email: user?.email || "",
        phone: user?.phone || user?.mobile || "",
        role: user?.role || "Administrator",
      };

      setProfile(loadedProfile);
    } catch (error) {
      console.error("Failed to load admin profile:", error);
    }
  };

  /* =========================================================
     CLOSE DROPDOWN WHEN CLICKING OUTSIDE
  ========================================================= */

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  /* =========================================================
     LISTEN FOR PROFILE UPDATES
  ========================================================= */

  useEffect(() => {
    const handleProfileUpdate = () => {
      loadCurrentAdmin();
    };

    window.addEventListener(
      "admin-profile-updated",
      handleProfileUpdate,
    );

    window.addEventListener("storage", handleProfileUpdate);

    return () => {
      window.removeEventListener(
        "admin-profile-updated",
        handleProfileUpdate,
      );

      window.removeEventListener("storage", handleProfileUpdate);
    };
  }, []);

  /* =========================================================
     PROFILE TOGGLE
  ========================================================= */

  const toggleProfile = () => {
    loadCurrentAdmin();
    setIsProfileOpen((previous) => !previous);
  };

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(CURRENT_USER_KEY);

    window.location.href = "/login";
  };

  /* =========================================================
     MY ACCOUNT
  ========================================================= */

  const handleMyAccount = () => {
    setIsProfileOpen(false);

    window.location.href = "/admin/account";
  };

  const displayName = profile.name?.trim() || "Admin";

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word.charAt(0).toUpperCase())
      .join("") || "A";

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
        <div
          className="adminProfileContainer"
          ref={profileRef}
        >
          <button
            type="button"
            className="adminProfileButton"
            onClick={toggleProfile}
            aria-label="Open admin profile"
            aria-expanded={isProfileOpen}
          >
            <span className="adminAvatar">
              {initials}
            </span>

            <span className="adminProfileName">
              {displayName}
            </span>

            <ChevronRight
              className={`profileChevron ${
                isProfileOpen ? "profileChevronOpen" : ""
              }`}
              size={16}
            />
          </button>

          {isProfileOpen && (
            <div className="adminProfileDropdown">
              {/* PROFILE SUMMARY */}
              <div className="profileDropdownHeader">
                <div className="largeAdminAvatar">
                  {initials}
                </div>

                <div className="profileHeaderInfo">
                  <strong>{displayName}</strong>

                  <span>
                    {profile.role || "Administrator"}
                  </span>
                </div>

                <button
                  type="button"
                  className="profileCloseButton"
                  onClick={() => setIsProfileOpen(false)}
                  aria-label="Close profile"
                >
                  <X size={18} />
                </button>
              </div>

              {/* ADMIN INFORMATION */}
              <div className="adminInfoSection">
                <div className="adminInfoTitle">
                  <UserCircle size={16} />
                  <span>Admin Information</span>
                </div>

                <div className="adminInfoItem">
                  <User size={17} />

                  <div>
                    <span>Name</span>
                    <strong>
                      {profile.name || "Not available"}
                    </strong>
                  </div>
                </div>

                <div className="adminInfoItem">
                  <Mail size={17} />

                  <div>
                    <span>Email</span>
                    <strong>
                      {profile.email || "Not available"}
                    </strong>
                  </div>
                </div>

                <div className="adminInfoItem">
                  <Phone size={17} />

                  <div>
                    <span>Phone</span>
                    <strong>
                      {profile.phone || "Not available"}
                    </strong>
                  </div>
                </div>

                <div className="adminInfoItem">
                  <ShieldCheck size={17} />

                  <div>
                    <span>Role</span>
                    <strong>
                      {profile.role || "Administrator"}
                    </strong>
                  </div>
                </div>
              </div>

              {/* ACTIONS */}
              <div className="profileDropdownActions">
                <button
                  type="button"
                  className="myAccountButton"
                  onClick={handleMyAccount}
                >
                  <Settings size={17} />

                  <span>My Account</span>

                  <ChevronRight size={16} />
                </button>

                <button
                  type="button"
                  className="profileLogoutButton"
                  onClick={handleLogout}
                >
                  <LogOut size={17} />

                  <span>Logout</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}