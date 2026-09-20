import { FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  LoaderCircle,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Truck,
  WalletCards,
} from "lucide-react";

import styles from "./StaffLogin.module.css";
import { staffLogin } from "../../api/staffApi";

type StaffRole = "superadmin" | "admin" | "accounts" | "logistics";

type LocationState = {
  from?: string;
};

const ROLE_CONFIG: Record<
  StaffRole,
  {
    title: string;
    subtitle: string;
    description: string;
    icon: typeof ShieldCheck;
    dashboard: string;
  }
> = {
  superadmin: {
    title: "Super Admin Login",
    subtitle: "Complete system administration",
    description:
      "Access users, products, orders, reports, settings and complete store management.",
    icon: ShieldCheck,
    dashboard: "/staff",
  },

  admin: {
    title: "Admin Login",
    subtitle: "Store administration",
    description:
      "Manage products, categories, orders, customers and other store operations.",
    icon: ShieldCheck,
    dashboard: "/staff",
  },

  accounts: {
    title: "Accounts Login",
    subtitle: "Sales & financial operations",
    description:
      "View sales, orders, inventory and financial information.",
    icon: WalletCards,
    dashboard: "/accounts/dashboard",
  },

  logistics: {
    title: "Logistics Login",
    subtitle: "Orders & delivery operations",
    description:
      "Manage order status, shipments, tracking and delivery information.",
    icon: Truck,
    dashboard: "/logistics/dashboard",
  },
};

function StaffLogin() {
  const navigate = useNavigate();
  const location = useLocation();

  const queryParams = useMemo(
    () => new URLSearchParams(location.search),
    [location.search]
  );

  const roleFromQuery = queryParams.get("role") as StaffRole | null;

  const [selectedRole, setSelectedRole] = useState<StaffRole>(
    roleFromQuery &&
      ["superadmin", "admin", "accounts", "logistics"].includes(roleFromQuery)
      ? roleFromQuery
      : "admin"
  );

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (
      roleFromQuery &&
      ["superadmin", "admin", "accounts", "logistics"].includes(roleFromQuery)
    ) {
      setSelectedRole(roleFromQuery);
    }
  }, [roleFromQuery]);

  const roleConfig = ROLE_CONFIG[selectedRole];
  const RoleIcon = roleConfig.icon;

  const handleRoleChange = (role: StaffRole) => {
    setSelectedRole(role);

    setError("");
    setSuccess("");

    const params = new URLSearchParams();

    if (role !== "admin") {
      params.set("role", role);
    }

    const query = params.toString();

    navigate(`/staff/login${query ? `?${query}` : ""}`, {
      replace: true,
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError("Please enter your email address.");
      return;
    }

    if (!password) {
      setError("Please enter your password.");
      return;
    }

    if (!normalizedEmail.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    try {
      setLoading(true);

      const response = await staffLogin({
        email: normalizedEmail,
        password,
      });

      const loggedInUser = response?.user;

      if (!loggedInUser) {
        throw new Error("Invalid login response from server.");
      }

      const loggedInRole = String(loggedInUser.role || "").toLowerCase() as
        | StaffRole
        | "";

      if (
        !["superadmin", "admin", "accounts", "logistics"].includes(
          loggedInRole
        )
      ) {
        throw new Error(
          "This account does not have staff access."
        );
      }

      /*
       * The backend HTTP-only cookie is the real authentication mechanism.
       *
       * These localStorage values are only used by the frontend
       * to remember the logged-in staff information and redirect
       * appropriately.
       */
      localStorage.setItem(
        "staffUser",
        JSON.stringify(loggedInUser)
      );

      if (response.token) {
        localStorage.setItem("staffToken", response.token);
      }

      setSuccess("Login successful. Redirecting...");

      /*
       * Respect a route that originally requested staff access.
       * Otherwise redirect according to the actual backend role.
       */
      const state = location.state as LocationState | null;

      const requestedPath = state?.from;

      if (
        requestedPath &&
        requestedPath !== "/staff/login" &&
        requestedPath !== "/admin/login"
      ) {
        setTimeout(() => {
          navigate(requestedPath, { replace: true });
        }, 400);

        return;
      }

      const dashboard =
        ROLE_CONFIG[loggedInRole]?.dashboard || "/staff";

      setTimeout(() => {
        navigate(dashboard, { replace: true });
      }, 400);
    } catch (err: unknown) {
      let message = "Unable to login. Please try again.";

      if (err instanceof Error && err.message) {
        message = err.message;
      }

      /*
       * Axios errors usually contain response.data.message.
       * This safely handles that structure without requiring
       * AxiosError typing.
       */
      if (typeof err === "object" && err !== null) {
        const possibleError = err as {
          response?: {
            data?: {
              message?: string;
              error?: string;
            };
          };
        };

        const serverMessage =
          possibleError.response?.data?.message ||
          possibleError.response?.data?.error;

        if (serverMessage) {
          message = serverMessage;
        }
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.page}>
      <div className={styles.backgroundGlow} />

      <div className={styles.loginWrapper}>
        {/* Back to website */}
        <Link to="/" className={styles.backLink}>
          <ArrowLeft size={17} />
          <span>Back to Jihaan Cosmetics</span>
        </Link>

        <div className={styles.loginCard}>
          {/* ================= LEFT PANEL ================= */}
          <div className={styles.brandPanel}>
            <div className={styles.brandPanelContent}>
              <div className={styles.brandMark}>
                <ShieldCheck size={30} />
              </div>

              <span className={styles.eyebrow}>
                JIHAAN COSMETICS
              </span>

              <h1>
                Staff
                <br />
                <span>Portal</span>
              </h1>

              <p>
                Secure access to your Jihaan Cosmetics
                management systems.
              </p>

              <div className={styles.featureList}>
                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>
                    <ShieldCheck size={16} />
                  </span>

                  <div>
                    <strong>Secure Access</strong>
                    <small>
                      Protected staff authentication
                    </small>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>
                    <WalletCards size={16} />
                  </span>

                  <div>
                    <strong>Business Operations</strong>
                    <small>
                      Access role-specific information
                    </small>
                  </div>
                </div>

                <div className={styles.featureItem}>
                  <span className={styles.featureIcon}>
                    <Truck size={16} />
                  </span>

                  <div>
                    <strong>Order Management</strong>
                    <small>
                      Monitor orders and deliveries
                    </small>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* ================= RIGHT PANEL ================= */}
          <div className={styles.formPanel}>
            <div className={styles.formHeader}>
              <div className={styles.roleIcon}>
                <RoleIcon size={23} />
              </div>

              <div>
                <h2>{roleConfig.title}</h2>

                <p>{roleConfig.subtitle}</p>
              </div>
            </div>

            {/* ================= ROLE SELECTOR ================= */}
            <div className={styles.roleSection}>
              <label className={styles.sectionLabel}>
                Select Staff Role
              </label>

              <div className={styles.roleGrid}>
                <button
                  type="button"
                  className={`${styles.roleButton} ${
                    selectedRole === "admin"
                      ? styles.roleButtonActive
                      : ""
                  }`}
                  onClick={() => handleRoleChange("admin")}
                >
                  <ShieldCheck size={18} />

                  <span>
                    <strong>Admin</strong>
                    <small>Store Management</small>
                  </span>
                </button>

                <button
                  type="button"
                  className={`${styles.roleButton} ${
                    selectedRole === "accounts"
                      ? styles.roleButtonActive
                      : ""
                  }`}
                  onClick={() => handleRoleChange("accounts")}
                >
                  <WalletCards size={18} />

                  <span>
                    <strong>Accounts</strong>
                    <small>Sales &amp; Finance</small>
                  </span>
                </button>

                <button
                  type="button"
                  className={`${styles.roleButton} ${
                    selectedRole === "logistics"
                      ? styles.roleButtonActive
                      : ""
                  }`}
                  onClick={() => handleRoleChange("logistics")}
                >
                  <Truck size={18} />

                  <span>
                    <strong>Logistics</strong>
                    <small>Orders &amp; Delivery</small>
                  </span>
                </button>
              </div>
            </div>

            {/* Role Description */}
            <div className={styles.roleDescription}>
              <RoleIcon size={16} />

              <span>{roleConfig.description}</span>
            </div>

            {/* ================= ERROR ================= */}
            {error && (
              <div className={styles.errorMessage} role="alert">
                <span className={styles.messageIcon}>!</span>

                <span>{error}</span>
              </div>
            )}

            {/* ================= SUCCESS ================= */}
            {success && (
              <div
                className={styles.successMessage}
                role="status"
              >
                <span className={styles.messageIcon}>✓</span>

                <span>{success}</span>
              </div>
            )}

            {/* ================= LOGIN FORM ================= */}
            <form
              className={styles.form}
              onSubmit={handleSubmit}
              noValidate
            >
              {/* Email */}
              <div className={styles.inputGroup}>
                <label htmlFor="staff-email">
                  Email Address
                </label>

                <div className={styles.inputWrapper}>
                  <Mail
                    size={18}
                    className={styles.inputIcon}
                  />

                  <input
                    id="staff-email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    placeholder="Enter your staff email"
                    autoComplete="email"
                    disabled={loading}
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className={styles.inputGroup}>
                <label htmlFor="staff-password">
                  Password
                </label>

                <div className={styles.inputWrapper}>
                  <LockKeyhole
                    size={18}
                    className={styles.inputIcon}
                  />

                  <input
                    id="staff-password"
                    type={
                      showPassword ? "text" : "password"
                    }
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    disabled={loading}
                    required
                  />

                  <button
                    type="button"
                    className={styles.passwordToggle}
                    onClick={() =>
                      setShowPassword((value) => !value)
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    disabled={loading}
                  >
                    {showPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* Login Button */}
              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoaderCircle
                      size={19}
                      className={styles.spinner}
                    />

                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={19} />

                    <span>
                      Sign in as{" "}
                      {selectedRole === "accounts"
                        ? "Accounts"
                        : selectedRole === "logistics"
                        ? "Logistics"
                        : "Admin"}
                    </span>
                  </>
                )}
              </button>
            </form>

            {/* Security Note */}
            <div className={styles.securityNote}>
              <LockKeyhole size={14} />

              <span>
                Your staff session is protected by secure
                authentication.
              </span>
            </div>

            {/* Customer Login */}
            <div className={styles.customerLogin}>
              <span>Are you a customer?</span>

              <Link to="/login">Customer Login</Link>
            </div>
          </div>
        </div>

        <p className={styles.copyright}>
          © {new Date().getFullYear()} Jihaan Cosmetics.
          All rights reserved.
        </p>
      </div>
    </div>
  );
}

export default StaffLogin;