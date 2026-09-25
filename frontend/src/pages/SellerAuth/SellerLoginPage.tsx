import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./SellerAuthPage.module.css";

interface SellerLoginResponse {
  message?: string;
  token?: string;
  user?: {
    id?: string;
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
    status?: string;
    partnerType?: string;
  };
}

const API_URL = "https://jihaan-cosmetics.onrender.com/api/partners/login";

const SellerLoginPage = () => {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");

    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          partnerType: "seller",
          email: cleanEmail,
          password,
        }),
      });

      const responseText = await response.text();

      let data: SellerLoginResponse = {};

      try {
        data = responseText
          ? (JSON.parse(responseText) as SellerLoginResponse)
          : {};
      } catch {
        console.error("Non-JSON response received from backend:", responseText);

        throw new Error(
          "Backend returned an invalid response. Please check the API URL and backend server."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message || "Invalid seller credentials. Please try again."
        );
      }

      if (!data.token || !data.user) {
        throw new Error("Invalid response from server. Please try again.");
      }

      const storage = rememberMe ? localStorage : sessionStorage;

      storage.setItem("sellerToken", data.token);
      storage.setItem("sellerUser", JSON.stringify(data.user));

      navigate("/seller/dashboard", {
        replace: true,
      });
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Unable to login. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <div className={styles.backgroundShapeOne} />
      <div className={styles.backgroundShapeTwo} />

      <section className={styles.authContainer}>
        <div className={styles.authBrand}>
          <Link to="/" className={styles.brandLogo}>
            <div className={styles.brandIcon}>J</div>

            <div>
              <strong>Jihaan Cosmetics</strong>
              <span>Seller Partner Portal</span>
            </div>
          </Link>
        </div>

        <div className={styles.authCard}>
          <div className={styles.authHeader}>
            <span className={styles.eyebrow}>SELLER LOGIN</span>

            <h1>Welcome back</h1>

            <p>Login to manage your products, orders and store.</p>
          </div>

          <form className={styles.authForm} onSubmit={handleSubmit}>
            <label className={styles.field}>
              Email Address

              <div className={styles.inputWithIcon}>
                <Mail size={18} aria-hidden="true" />

                <input
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="seller@example.com"
                  autoComplete="email"
                  required
                />
              </div>
            </label>

            <label className={styles.field}>
              Password

              <div className={styles.inputWithIcon}>
                <LockKeyhole size={18} aria-hidden="true" />

                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className={styles.passwordToggle}
                  onClick={() => setShowPassword((current) => !current)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
            </label>

            <div className={styles.formOptions}>
              <label className={styles.rememberLabel}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(event) => setRememberMe(event.target.checked)}
                />

                <span>Remember me</span>
              </label>

              <Link to="/seller/forgot-password">Forgot password?</Link>
            </div>

            {error && (
              <p className={styles.errorMessage} role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login as Seller"}

              {!loading && <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </form>

          <div className={styles.securityNote}>
            <ShieldCheck size={18} aria-hidden="true" />

            <span>
              Your seller account is protected with secure authentication.
            </span>
          </div>

          <div className={styles.divider}>
            <span>New seller?</span>
          </div>

          <Link to="/seller/register" className={styles.outlineButton}>
            Create Seller Account
          </Link>
        </div>

        <p className={styles.bottomText}>
          © {new Date().getFullYear()} Jihaan Cosmetics. Seller Partner Portal.
        </p>
      </section>
    </main>
  );
};

export default SellerLoginPage;