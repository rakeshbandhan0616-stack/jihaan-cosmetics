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
  Smartphone,
} from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import logo from "../../assets/images/jihaan-logo.png";
import styles from "./LoginPage.module.css";

type LoginForm = {
  identifier: string;
  password: string;
};

type LocationState = {
  message?: string;
  email?: string;
  identifier?: string;
};

type LoginUser = {
  id: string;
  name: string;
  email: string;
  phone?: string;
  role: string;
  profileImage?: string;
  isActive?: boolean;
  isBlocked?: boolean;
  isEmailVerified?: boolean;
  createdAt?: string;
};

type LoginResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  accessToken?: string;
  user?: LoginUser;
  data?: {
    token?: string;
    accessToken?: string;
    user?: LoginUser;
  };
};

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    "http://localhost:5000/api",
).replace(/\/+$/, "");

const CURRENT_USER_STORAGE_KEY = "jihaan_current_user";
const AUTH_TOKEN_STORAGE_KEY = "jihaan_auth_token";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const locationState = (location.state || {}) as LocationState;

  const [form, setForm] = useState<LoginForm>({
    identifier:
      locationState.identifier ||
      locationState.email ||
      "",
    password: "",
  });

  const [error, setError] = useState("");
  const [success, setSuccess] = useState(
    locationState.message || "",
  );
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
    setSuccess("");
  };

  const validateForm = () => {
    const identifier = form.identifier.trim();
    const password = form.password;

    if (!identifier || !password) {
      setError(
        "Please enter your email/mobile number and password.",
      );
      return false;
    }

    const isEmail = identifier.includes("@");

    if (isEmail) {
      const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (!emailPattern.test(identifier.toLowerCase())) {
        setError("Please enter a valid email address.");
        return false;
      }
    } else {
      const normalizedPhone = identifier.replace(/\D/g, "");

      const phone =
        normalizedPhone.startsWith("91") &&
        normalizedPhone.length === 12
          ? normalizedPhone.slice(2)
          : normalizedPhone;

      if (!/^[6-9][0-9]{9}$/.test(phone)) {
        setError(
          "Please enter a valid 10-digit mobile number.",
        );
        return false;
      }
    }

    if (password.length < 4) {
      setError("Password must contain at least 4 characters.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/login`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            identifier: form.identifier.trim(),
            password: form.password,
          }),
        },
      );

      let data: LoginResponse;

      try {
        data = (await response.json()) as LoginResponse;
      } catch {
        throw new Error(
          "Invalid response received from the server.",
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Invalid email/mobile number or password.",
        );
      }

      const token =
        data.token ||
        data.accessToken ||
        data.data?.token ||
        data.data?.accessToken;

      const user = data.user || data.data?.user;

      if (!token || !user) {
        console.error("Invalid login response:", data);

        throw new Error(
          "Login response does not contain a valid token or user.",
        );
      }

      /*
       * Store the token using the main key used by the application.
       */
      localStorage.setItem(
        AUTH_TOKEN_STORAGE_KEY,
        token,
      );

      /*
       * Store aliases as well so other authenticated API
       * requests can find the same token.
       */
      localStorage.setItem("authToken", token);
      localStorage.setItem("accessToken", token);
      localStorage.setItem("token", token);

      localStorage.setItem(
        CURRENT_USER_STORAGE_KEY,
        JSON.stringify(user),
      );

      /*
       * Remove any old user data that could cause role conflicts.
       */
      localStorage.setItem(
        "jihaan_user",
        JSON.stringify(user),
      );

      console.log("Login successful:", {
        userId: user.id,
        email: user.email,
        role: user.role,
        tokenStored: Boolean(
          localStorage.getItem(AUTH_TOKEN_STORAGE_KEY),
        ),
      });

      setSuccess("Login successful. Redirecting...");

      /*
       * Navigate according to the authenticated user's role.
       */
      const normalizedRole = String(user.role || "")
        .trim()
        .toLowerCase()
        .replace(/[\s_-]+/g, "");

      const isAdmin =
        normalizedRole === "admin" ||
        normalizedRole === "superadmin" ||
        normalizedRole === "administrator" ||
        normalizedRole === "superadministrator";

      navigate(isAdmin ? "/admin/dashboard" : "/", {
        replace: true,
        state: {
          message: "Welcome back to Jihaan Cosmetics!",
        },
      });
    } catch (loginError) {
      const message =
        loginError instanceof Error
          ? loginError.message
          : "Unable to log in. Please try again.";

      setError(message);
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

        <section className={styles.loginCard}>
          <div className={styles.cardHeader}>
            <span className={styles.eyebrow}>
              WELCOME BACK
            </span>

            <h1>Sign in to your account</h1>

            <p className={styles.intro}>
              Access your orders, wishlist, and personalized
              beauty experience.
            </p>
          </div>

          {success && (
            <p className={styles.success} role="status">
              {success}
            </p>
          )}

          <form
            className={styles.form}
            onSubmit={handleSubmit}
          >
            <div className={styles.field}>
              <label htmlFor="identifier">
                Email or mobile number
              </label>

              <div className={styles.inputWrapper}>
                {form.identifier.includes("@") ? (
                  <Mail size={18} strokeWidth={1.7} />
                ) : (
                  <Smartphone size={18} strokeWidth={1.7} />
                )}

                <input
                  id="identifier"
                  name="identifier"
                  type="text"
                  placeholder="Enter email or mobile number"
                  value={form.identifier}
                  onChange={handleChange}
                  autoComplete="username"
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <div className={styles.passwordLabel}>
                <label htmlFor="password">
                  Password
                </label>

                <Link
                  to="/forgot-password"
                  className={styles.forgotLink}
                >
                  Forgot password?
                </Link>
              </div>

              <div className={styles.inputWrapper}>
                <LockKeyhole
                  size={18}
                  strokeWidth={1.7}
                />

                <input
                  id="password"
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
              <p className={styles.error} role="alert">
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
              Your account information is kept private
              and secure.
            </span>
          </div>

          <div className={styles.divider}>
            <span>New to Jihaan Cosmetics?</span>
          </div>

          <Link
            to="/register"
            className={styles.registerButton}
          >
            Create an account
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

export default LoginPage;