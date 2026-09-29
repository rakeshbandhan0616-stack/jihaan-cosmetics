import { FormEvent, useEffect, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  KeyRound,
  Mail,
  MapPin,
  Phone,
  Save,
  ShieldCheck,
  User,
  UserCircle,
} from "lucide-react";
import "./AdminAccountPage.css";

interface AdminProfile {
  _id?: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;

  // Login activity
  lastLoginAt?: string | null;
  lastLoginIp?: string;
}

interface ApiResponse {
  success?: boolean;
  message?: string;
  user?: AdminProfile;
}

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/+$/, "");

const AUTH_TOKEN_KEY = "jihaan_auth_token";
const CURRENT_USER_KEY = "jihaan_current_user";

/*
|--------------------------------------------------------------------------
| Get authentication token
|--------------------------------------------------------------------------
*/

const getToken = () => {
  return (
    localStorage.getItem(AUTH_TOKEN_KEY) ||
    localStorage.getItem("token") ||
    localStorage.getItem("authToken") ||
    localStorage.getItem("accessToken") ||
    ""
  );
};

/*
|--------------------------------------------------------------------------
| Get stored admin user
|--------------------------------------------------------------------------
*/

const getStoredUser = (): AdminProfile | null => {
  try {
    const storedUser = localStorage.getItem(CURRENT_USER_KEY);

    if (!storedUser) {
      return null;
    }

    return JSON.parse(storedUser) as AdminProfile;
  } catch (error) {
    console.error("Failed to read admin user:", error);
    return null;
  }
};

/*
|--------------------------------------------------------------------------
| Admin Account Page
|--------------------------------------------------------------------------
*/

export default function AdminAccountPage() {
  const [profile, setProfile] = useState<AdminProfile>({
    name: "",
    email: "",
    phone: "",
    role: "",
    lastLoginAt: null,
    lastLoginIp: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
  |--------------------------------------------------------------------------
  | Load admin profile
  |--------------------------------------------------------------------------
  */

  useEffect(() => {
    loadAdminProfile();
  }, []);

  const loadAdminProfile = async () => {
    setIsLoading(true);
    setError("");

    try {
      const token = getToken();

      if (!token) {
        setError(
          "Your admin session has expired. Please login again.",
        );
        setIsLoading(false);
        return;
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/account/profile`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        },
      );

      const data: ApiResponse = await response.json();

      if (!response.ok || !data.success || !data.user) {
        throw new Error(
          data.message || "Failed to load admin profile.",
        );
      }

      const adminUser = data.user;

      setProfile({
        _id: adminUser._id,
        name: adminUser.name || "",
        email: adminUser.email || "",
        phone: adminUser.phone || "",
        role: adminUser.role || "",
        isActive: adminUser.isActive,
        createdAt: adminUser.createdAt,
        updatedAt: adminUser.updatedAt,

        // Login activity
        lastLoginAt: adminUser.lastLoginAt || null,
        lastLoginIp: adminUser.lastLoginIp || "",
      });

      /*
       * Keep localStorage synchronized.
       */
      localStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify(adminUser),
      );
    } catch (loadError) {
      console.error(
        "Load admin profile error:",
        loadError,
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load admin profile.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Input change
  |--------------------------------------------------------------------------
  */

  const handleChange = (
    field: keyof Pick<
      AdminProfile,
      "name" | "email" | "phone"
    >,
    value: string,
  ) => {
    setProfile((previous) => ({
      ...previous,
      [field]: value,
    }));

    setError("");
    setSuccess("");
  };

  /*
  |--------------------------------------------------------------------------
  | Save profile
  |--------------------------------------------------------------------------
  */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name = profile.name.trim();
    const email = profile.email.trim().toLowerCase();
    const phone = profile.phone.trim();

    /*
    |--------------------------------------------------------------------------
    | Name validation
    |--------------------------------------------------------------------------
    */

    if (!name) {
      setError("Please enter your name.");
      return;
    }

    if (name.length < 2) {
      setError(
        "Name must contain at least 2 characters.",
      );
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Email validation
    |--------------------------------------------------------------------------
    */

    if (!email) {
      setError("Please enter your email address.");
      return;
    }

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setError(
        "Please enter a valid email address.",
      );
      return;
    }

    /*
    |--------------------------------------------------------------------------
    | Save
    |--------------------------------------------------------------------------
    */

    setIsSaving(true);

    try {
      const token = getToken();

      if (!token) {
        throw new Error(
          "Your admin session has expired. Please login again.",
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/admin/account/profile`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
          body: JSON.stringify({
            name,
            email,
            phone,
          }),
        },
      );

      const data: ApiResponse = await response.json();

      if (
        !response.ok ||
        !data.success ||
        !data.user
      ) {
        throw new Error(
          data.message ||
            "Failed to update admin profile.",
        );
      }

      const updatedUser = data.user;

      setProfile({
        _id: updatedUser._id,
        name: updatedUser.name || "",
        email: updatedUser.email || "",
        phone: updatedUser.phone || "",
        role: updatedUser.role || "",
        isActive: updatedUser.isActive,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,

        // Preserve login activity
        lastLoginAt:
          updatedUser.lastLoginAt || null,
        lastLoginIp:
          updatedUser.lastLoginIp || "",
      });

      /*
      |--------------------------------------------------------------------------
      | Update local admin session
      |--------------------------------------------------------------------------
      */

      const existingUser = getStoredUser();

      localStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify({
          ...existingUser,
          ...updatedUser,
        }),
      );

      /*
      |--------------------------------------------------------------------------
      | Tell AdminHeader to reload profile
      |--------------------------------------------------------------------------
      */

      window.dispatchEvent(
        new CustomEvent(
          "admin-profile-updated",
        ),
      );

      setSuccess(
        "Your profile has been updated successfully.",
      );
    } catch (saveError) {
      console.error(
        "Update admin profile error:",
        saveError,
      );

      setError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to update admin profile.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Format date
  |--------------------------------------------------------------------------
  */

  const formatDate = (date?: string | null) => {
    if (!date) {
      return "Not available";
    }

    try {
      const parsedDate = new Date(date);

      if (Number.isNaN(parsedDate.getTime())) {
        return "Not available";
      }

      return parsedDate.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        },
      );
    } catch {
      return "Not available";
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Format date + time
  |--------------------------------------------------------------------------
  */

  const formatDateTime = (
    date?: string | null,
  ) => {
    if (!date) {
      return "No login information available";
    }

    try {
      const parsedDate = new Date(date);

      if (Number.isNaN(parsedDate.getTime())) {
        return "No login information available";
      }

      return parsedDate.toLocaleString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        },
      );
    } catch {
      return "No login information available";
    }
  };

  /*
  |--------------------------------------------------------------------------
  | Initials
  |--------------------------------------------------------------------------
  */

  const displayName =
    profile.name.trim() || "Admin";

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((word) =>
        word.charAt(0).toUpperCase(),
      )
      .join("") || "A";

  /*
  |--------------------------------------------------------------------------
  | Loading
  |--------------------------------------------------------------------------
  */

  if (isLoading) {
    return (
      <div className="adminAccountPage">
        <div className="adminAccountLoading">
          <div className="adminAccountSpinner" />

          <p>Loading admin profile...</p>
        </div>
      </div>
    );
  }

  /*
  |--------------------------------------------------------------------------
  | Page
  |--------------------------------------------------------------------------
  */

  return (
    <div className="adminAccountPage">
      <div className="adminAccountContainer">

        {/* =====================================================
            PAGE HEADER
        ====================================================== */}

        <div className="adminAccountPageHeader">
          <div>
            <div className="adminAccountBreadcrumb">
              <span>Admin</span>
              <span>/</span>
              <strong>My Account</strong>
            </div>

            <h1>My Account</h1>

            <p>
              Manage your administrator profile and
              account information.
            </p>
          </div>

          <div className="adminAccountHeaderIcon">
            <UserCircle
              size={28}
              strokeWidth={1.7}
            />
          </div>
        </div>

        {/* =====================================================
            ALERTS
        ====================================================== */}

        {success && (
          <div className="adminAccountAlert adminAccountAlertSuccess">
            <CheckCircle2 size={19} />
            <span>{success}</span>
          </div>
        )}

        {error && (
          <div className="adminAccountAlert adminAccountAlertError">
            <AlertCircle size={19} />
            <span>{error}</span>
          </div>
        )}

        {/* =====================================================
            MAIN GRID
        ====================================================== */}

        <div className="adminAccountGrid">

          {/* =================================================
              PROFILE SUMMARY
          ================================================== */}

          <aside className="adminAccountProfileCard">

            <div className="adminAccountProfileTop">
              <div className="adminAccountLargeAvatar">
                {initials}
              </div>

              <h2>{displayName}</h2>

              <p>
                {profile.email ||
                  "No email available"}
              </p>

              <span className="adminRoleBadge">
                <ShieldCheck size={14} />
                {profile.role ||
                  "Administrator"}
              </span>
            </div>

            <div className="adminAccountProfileDetails">

              <div className="adminProfileDetail">
                <span>Account Status</span>

                <strong
                  className={
                    profile.isActive === false
                      ? "statusInactive"
                      : "statusActive"
                  }
                >
                  <span className="statusDot" />
                  {profile.isActive === false
                    ? "Inactive"
                    : "Active"}
                </strong>
              </div>

              <div className="adminProfileDetail">
                <span>Account Created</span>

                <strong>
                  {formatDate(
                    profile.createdAt,
                  )}
                </strong>
              </div>

              <div className="adminProfileDetail">
                <span>Last Updated</span>

                <strong>
                  {formatDate(
                    profile.updatedAt,
                  )}
                </strong>
              </div>

            </div>
          </aside>

          {/* =================================================
              ACCOUNT FORM
          ================================================== */}

          <section className="adminAccountFormCard">

            <div className="adminAccountCardHeader">
              <div>
                <h2>Personal Information</h2>

                <p>
                  Update the information associated
                  with your administrator account.
                </p>
              </div>

              <div className="adminAccountCardIcon">
                <User size={21} />
              </div>
            </div>

            <form
              id="admin-account-form"
              onSubmit={handleSubmit}
              className="adminAccountForm"
            >

              {/* NAME */}

              <div className="adminFormGroup">
                <label htmlFor="admin-name">
                  Full Name
                </label>

                <div className="adminInputWrapper">
                  <User size={18} />

                  <input
                    id="admin-name"
                    type="text"
                    value={profile.name}
                    onChange={(event) =>
                      handleChange(
                        "name",
                        event.target.value,
                      )
                    }
                    placeholder="Enter your full name"
                    autoComplete="name"
                    disabled={isSaving}
                  />
                </div>
              </div>

              {/* EMAIL */}

              <div className="adminFormGroup">
                <label htmlFor="admin-email">
                  Email Address
                </label>

                <div className="adminInputWrapper">
                  <Mail size={18} />

                  <input
                    id="admin-email"
                    type="email"
                    value={profile.email}
                    onChange={(event) =>
                      handleChange(
                        "email",
                        event.target.value,
                      )
                    }
                    placeholder="Enter your email address"
                    autoComplete="email"
                    disabled={isSaving}
                  />
                </div>
              </div>

              {/* PHONE */}

              <div className="adminFormGroup">
                <label htmlFor="admin-phone">
                  Phone Number
                </label>

                <div className="adminInputWrapper">
                  <Phone size={18} />

                  <input
                    id="admin-phone"
                    type="tel"
                    value={profile.phone}
                    onChange={(event) =>
                      handleChange(
                        "phone",
                        event.target.value,
                      )
                    }
                    placeholder="Enter your phone number"
                    autoComplete="tel"
                    disabled={isSaving}
                  />
                </div>
              </div>

              {/* ROLE */}

              <div className="adminFormGroup">
                <label htmlFor="admin-role">
                  Account Role
                </label>

                <div className="adminInputWrapper adminInputReadonly">
                  <ShieldCheck size={18} />

                  <input
                    id="admin-role"
                    type="text"
                    value={
                      profile.role ||
                      "Administrator"
                    }
                    readOnly
                    tabIndex={-1}
                  />

                  <span className="readonlyBadge">
                    Protected
                  </span>
                </div>

                <small>
                  Your administrator role cannot
                  be changed from this page.
                </small>
              </div>

              {/* SAVE */}

              <div className="adminFormActions">
                <button
                  type="submit"
                  className="adminSaveButton"
                  disabled={isSaving}
                >
                  <Save size={17} />

                  {isSaving
                    ? "Saving Changes..."
                    : "Save Changes"}
                </button>
              </div>

            </form>
          </section>
        </div>

        {/* =====================================================
            LOGIN ACTIVITY
        ====================================================== */}

        <section className="adminLoginActivityCard">

          <div className="adminLoginActivityHeader">

            <div className="adminLoginActivityTitle">
              <div className="adminLoginActivityIcon">
                <Clock3 size={21} />
              </div>

              <div>
                <h2>Login Activity</h2>

                <p>
                  Information about your most
                  recent successful login.
                </p>
              </div>
            </div>

            <span className="adminLoginActivityBadge">
              <CheckCircle2 size={14} />
              Secure
            </span>

          </div>

          <div className="adminLoginActivityGrid">

            {/* LAST LOGIN */}

            <div className="adminLoginActivityItem">

              <div className="adminLoginActivityItemIcon">
                <Clock3 size={18} />
              </div>

              <div>
                <span>Last Login</span>

                <strong>
                  {formatDateTime(
                    profile.lastLoginAt,
                  )}
                </strong>
              </div>

            </div>

            {/* IP ADDRESS */}

            <div className="adminLoginActivityItem">

              <div className="adminLoginActivityItemIcon">
                <MapPin size={18} />
              </div>

              <div>
                <span>IP Address</span>

                <strong>
                  {profile.lastLoginIp ||
                    "Not available"}
                </strong>
              </div>

            </div>

          </div>

          {!profile.lastLoginAt && (
            <div className="adminLoginActivityNotice">
              <AlertCircle size={16} />

              <span>
                Login activity will appear after
                your next successful login.
              </span>
            </div>
          )}

        </section>

        {/* =====================================================
            SECURITY INFORMATION
        ====================================================== */}

        <section className="adminSecurityCard">

          <div className="adminSecurityIcon">
            <KeyRound size={22} />
          </div>

          <div className="adminSecurityContent">
            <h2>Account Security</h2>

            <p>
              Your account is protected by
              administrator authentication.
              Password and access permissions
              are managed separately from your
              profile information.
            </p>
          </div>

          <div className="adminSecurityStatus">
            <CheckCircle2 size={17} />
            <span>Protected</span>
          </div>

        </section>

      </div>
    </div>
  );
}