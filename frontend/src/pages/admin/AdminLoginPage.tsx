import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import {
  Link,
  useNavigate,
} from "react-router-dom";

import logo from "../../assets/images/jihaan-logo.png";
import styles from "./AdminLoginPage.module.css";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive?: boolean;
  isBlocked?: boolean;
}

interface AdminLoginResponse {
  success?: boolean;
  message?: string;
  token?: string;
  accessToken?: string;
  user?: AdminUser;
  data?: {
    token?: string;
    accessToken?: string;
    user?: AdminUser;
  };
}

interface LoginForm {
  email: string;
  password: string;
}

const API_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api",
).replace(/\/+$/, "");

const ADMIN_TOKEN_KEY = "adminToken";
const AUTH_TOKEN_KEY = "jihaan_auth_token";
const CURRENT_USER_KEY = "jihaan_current_user";

const normalizeRole = (role: string | undefined) => {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
};

const AdminLoginPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState<LoginForm>({
    email: "",
    password: "",
  });

  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));

    setError("");
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    const email = form.email.trim().toLowerCase();
    const password = form.password;

    if (!email || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${API_URL}/auth/admin-login`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        },
      );

      let data: AdminLoginResponse = {};

      try {
        data = (await response.json()) as AdminLoginResponse;
      } catch {
        throw new Error("Invalid response from server.");
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Invalid admin credentials.",
        );
      }

      const token =
        data.token ||
        data.accessToken ||
        data.data?.token ||
        data.data?.accessToken;

      const user = data.user || data.data?.user;

      if (!token || !user) {
        console.error("Invalid admin login response:", data);

        throw new Error(
          "Invalid response from server. Token or user is missing.",
        );
      }

      const role = normalizeRole(user.role);

      const isAdmin =
        role === "admin" ||
        role === "superadmin" ||
        role === "administrator" ||
        role === "superadministrator";

      if (!isAdmin) {
        throw new Error(
          "You are not authorized to access the admin panel.",
        );
      }

      if (user.isActive === false) {
        throw new Error(
          "Your admin account is inactive.",
        );
      }

      if (user.isBlocked === true) {
        throw new Error(
          "Your admin account has been blocked.",
        );
      }

      /*
       * Store the same token under all supported keys.
       * This fixes ProductManager authentication.
       */
      localStorage.setItem(ADMIN_TOKEN_KEY, token);
      localStorage.setItem(AUTH_TOKEN_KEY, token);
      localStorage.setItem("authToken", token);
      localStorage.setItem("accessToken", token);
      localStorage.setItem("token", token);

      localStorage.setItem(
        "adminUser",
        JSON.stringify(user),
      );

      localStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify(user),
      );

      localStorage.setItem(
        "jihaan_user",
        JSON.stringify(user),
      );

      console.log("Admin login successful:", {
        email: user.email,
        role: user.role,
        tokenStored: Boolean(
          localStorage.getItem(ADMIN_TOKEN_KEY),
        ),
      });

      navigate("/admin/dashboard", {
        replace: true,
      });
    } catch (loginError) {
      if (loginError instanceof TypeError) {
        setError(
          "Unable to connect to the server. Please make sure the backend is running.",
        );
      } else {
        setError(
          loginError instanceof Error
            ? loginError.message
            : "Something went wrong. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.backgroundShapeOne} />
      <div className={styles.backgroundShapeTwo} />

      <div className={styles.pageContent}>
        <div className={styles.brand}>
          <Link
            to="/"
            className={styles.logo}
            aria-label="Jihaan Cosmetics home"
          >
            <img
              src={logo}
              alt="Jihaan Cosmetics logo"
              className={styles.logoImage}
            />

            <span className={styles.logoText}>
              <span className={styles.logoMain}>
                JIHAAN COSMETICS
              </span>

              <span className={styles.logoSub}>
                BEAUTY. CONFIDENCE. YOU.
              </span>
            </span>
          </Link>
        </div>

        <section
          className={styles.loginCard}
          aria-labelledby="admin-login-title"
        >
          <div className={styles.cardHeader}>
            <span className={styles.eyebrow}>
              ADMINISTRATION
            </span>

            <h1 id="admin-login-title">
              Sign in to admin panel
            </h1>

            <p className={styles.intro}>
              Manage products, orders, customers, and
              your Jihaan Cosmetics store.
            </p>
          </div>

          <form
            className={styles.form}
            onSubmit={handleSubmit}
          >
            <div className={styles.field}>
              <label htmlFor="admin-email">
                Email address
              </label>

              <div className={styles.inputWrapper}>
                <Mail
                  size={18}
                  strokeWidth={1.7}
                />

                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  placeholder="Enter your admin email"
                  value={form.email}
                  onChange={handleChange}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="admin-password">
                Password
              </label>

              <div className={styles.inputWrapper}>
                <LockKeyhole
                  size={18}
                  strokeWidth={1.7}
                />

                <input
                  id="admin-password"
                  name="password"
                  type={
                    showPassword ? "text" : "password"
                  }
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() =>
                    setShowPassword(
                      (previous) => !previous,
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff
                      size={18}
                      strokeWidth={1.7}
                    />
                  ) : (
                    <Eye
                      size={18}
                      strokeWidth={1.7}
                    />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <p
                className={styles.error}
                role="alert"
              >
                {error}
              </p>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={isSubmitting}
            >
              <span>
                {isSubmitting
                  ? "Signing in..."
                  : "Sign in"}
              </span>

              {!isSubmitting && (
                <ArrowRight
                  size={18}
                  strokeWidth={1.8}
                />
              )}
            </button>
          </form>

          <div className={styles.securityNote}>
            <ShieldCheck
              size={17}
              strokeWidth={1.7}
            />

            <span>
              Only authorized admin accounts can access
              this panel.
            </span>
          </div>

          <div className={styles.divider}>
            <span>Not an administrator?</span>
          </div>

          <Link
            to="/"
            className={styles.backButton}
          >
            Back to website
          </Link>
        </section>

        <footer className={styles.footer}>
          <nav
            className={styles.footerLinks}
            aria-label="Footer navigation"
          >
            <Link to="/about">About us</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/privacy">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </nav>

          <p>
            © {new Date().getFullYear()} Jihaan Cosmetics.
            All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
};

export default AdminLoginPage;