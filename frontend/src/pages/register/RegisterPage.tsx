import {
  ChangeEvent,
  FormEvent,
  useState,
} from "react";
import {
  Eye,
  EyeOff,
  Lock,
  Mail,
  UserRound,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

import logo from "../../assets/images/jihaan-logo.jpeg";
import styles from "./RegisterPage.module.css";

type RegisterForm = {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
};

type RegisterResponse = {
  message?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
  };
};

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api",
).replace(/\/$/, "");

const RegisterPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));

    setError("");
    setSuccess("");
  };

  const validateForm = () => {
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = form.phone.trim();
    const password = form.password;
    const confirmPassword = form.confirmPassword;

    if (
      !name ||
      !email ||
      !phone ||
      !password ||
      !confirmPassword
    ) {
      setError("Please fill in all fields.");
      return false;
    }

    if (name.length < 2) {
      setError("Please enter a valid full name.");
      return false;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setError("Please enter a valid email address.");
      return false;
    }

    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      setError("Please enter a valid 10-digit Indian mobile number.");
      return false;
    }

    if (password.length < 4) {
      setError("Password must contain at least 4 characters.");
      return false;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }

    return true;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          password: form.password,
        }),
      });

      const data = (await response.json()) as RegisterResponse;

      if (!response.ok) {
        throw new Error(
          data.message || "Unable to create your account.",
        );
      }

      setSuccess(
        data.message || "Registration successful. Redirecting to login...",
      );

      setForm({
        name: "",
        email: "",
        phone: "",
        password: "",
        confirmPassword: "",
      });

      setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: {
            message: "Registration successful. Please log in.",
            email: form.email.trim().toLowerCase(),
          },
        });
      }, 900);
    } catch (registerError) {
      const message =
        registerError instanceof Error
          ? registerError.message
          : "Unable to create your account. Please try again.";

      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.backgroundShapeOne} />
      <div className={styles.backgroundShapeTwo} />

      <header className={styles.brand}>
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
            <span className={styles.logoMain}>JIHAAN COSMETICS</span>

            <span className={styles.logoSub}>
              BEAUTY. CONFIDENCE. YOU.
            </span>
          </span>
        </Link>
      </header>

      <section className={styles.registerCard}>
        <div className={styles.cardHeader}>
          <span className={styles.eyebrow}>WELCOME TO JIHAAN</span>

          <h1>Create your account</h1>

          <p className={styles.intro}>
            Join Jihaan Cosmetics and discover beauty essentials made
            for you.
          </p>
        </div>

        {success && (
          <p className={styles.success} role="status">
            {success}
          </p>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label htmlFor="name">Full name</label>

            <div className={styles.inputWrapper}>
              <UserRound
                size={18}
                className={styles.inputIcon}
                aria-hidden="true"
              />

              <input
                id="name"
                name="name"
                type="text"
                placeholder="Enter your full name"
                value={form.name}
                onChange={handleChange}
                autoComplete="name"
                minLength={2}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="email">Email address</label>

            <div className={styles.inputWrapper}>
              <Mail
                size={18}
                className={styles.inputIcon}
                aria-hidden="true"
              />

              <input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                value={form.email}
                onChange={handleChange}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="phone">Mobile number</label>

            <div className={styles.inputWrapper}>
              <span className={styles.phonePrefix}>+91</span>

              <input
                id="phone"
                name="phone"
                type="tel"
                placeholder="Enter 10-digit mobile number"
                value={form.phone}
                onChange={handleChange}
                autoComplete="tel"
                inputMode="numeric"
                maxLength={10}
                required
              />
            </div>
          </div>

          <div className={styles.field}>
            <label htmlFor="password">Password</label>

            <div className={styles.inputWrapper}>
              <Lock
                size={18}
                className={styles.inputIcon}
                aria-hidden="true"
              />

              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a password"
                value={form.password}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={4}
                required
              />

              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() =>
                  setShowPassword((previous) => !previous)
                }
                aria-label={
                  showPassword ? "Hide password" : "Show password"
                }
              >
                {showPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            <span className={styles.helperText}>
              Use at least 4 characters.
            </span>
          </div>

          <div className={styles.field}>
            <label htmlFor="confirmPassword">Confirm password</label>

            <div className={styles.inputWrapper}>
              <Lock
                size={18}
                className={styles.inputIcon}
                aria-hidden="true"
              />

              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Re-enter your password"
                value={form.confirmPassword}
                onChange={handleChange}
                autoComplete="new-password"
                minLength={4}
                required
              />

              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() =>
                  setShowConfirmPassword((previous) => !previous)
                }
                aria-label={
                  showConfirmPassword
                    ? "Hide confirm password"
                    : "Show confirm password"
                }
              >
                {showConfirmPassword ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
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
            {isSubmitting ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p className={styles.terms}>
          By creating an account, you agree to our{" "}
          <Link to="/terms">Terms of Service</Link> and{" "}
          <Link to="/privacy">Privacy Policy</Link>.
        </p>

        <div className={styles.divider}>
          <span>Already have an account?</span>
        </div>

        <Link to="/login" className={styles.loginButton}>
          Log in
        </Link>
      </section>

      <footer className={styles.footer}>
        <nav className={styles.footerLinks} aria-label="Footer navigation">
          <Link to="/about">About us</Link>
          <Link to="/contact">Contact</Link>
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
        </nav>

        <p>
          © {new Date().getFullYear()} Jihaan Cosmetics. All rights
          reserved.
        </p>
      </footer>
    </main>
  );
};

export default RegisterPage;