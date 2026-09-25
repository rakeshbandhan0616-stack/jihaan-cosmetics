import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Truck,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import styles from "./LogisticPartnerAuthPage.module.css";

interface LogisticPartnerUser {
  id?: string;
  _id?: string;
  partnerName?: string;
  companyName?: string;
  businessName?: string;
  name?: string;
  email?: string;
  referenceNumber?: string;
  status?: string;
  role?: string;
  partnerType?: string;
}

interface LoginResponse {
  message?: string;
  token?: string;
  referenceNumber?: string;
  status?: string;
  adminNote?: string;
  user?: LogisticPartnerUser;
}

const API_URL = "https://jihaan-cosmetics.onrender.com/api/partners/login";

export default function LogisticPartnerLoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");

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
          partnerType: "logisticpartner",
          email: cleanEmail,
          password,
        }),
      });

      const responseText = await response.text();

      let data: LoginResponse = {};

      try {
        data = responseText
          ? (JSON.parse(responseText) as LoginResponse)
          : {};
      } catch {
        console.error(
          "Non-JSON response received from backend:",
          responseText
        );

        throw new Error(
          "Backend returned an invalid response. Check the API URL and backend server."
        );
      }

      if (!response.ok) {
        const statusText = data.status ? ` Status: ${data.status}.` : "";

        const referenceText = data.referenceNumber
          ? ` Reference number: ${data.referenceNumber}.`
          : "";

        const noteText = data.adminNote
          ? ` Admin note: ${data.adminNote}`
          : "";

        throw new Error(
          `${data.message || "Login failed."}${statusText}${referenceText}${noteText}`
        );
      }

      if (!data.token || !data.user) {
        throw new Error("Invalid login response from server.");
      }

      localStorage.setItem("logisticPartnerToken", data.token);
      localStorage.setItem(
        "logisticPartnerUser",
        JSON.stringify(data.user)
      );

      setSuccess("Login successful. Redirecting...");

      navigate("/logistic-partner/dashboard", {
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
    <main className={styles.authPage}>
      <div className={styles.backgroundShapeOne} />
      <div className={styles.backgroundShapeTwo} />

      <section className={styles.authContainer}>
        <div className={styles.brandSection}>
          <div className={styles.brandIcon}>
            <Truck size={28} aria-hidden="true" />
          </div>

          <div>
            <h1>Jihaan Logistics</h1>
            <p>Delivery Partner Network</p>
          </div>
        </div>

        <div className={styles.authCard}>
          <div className={styles.cardHeader}>
            <span className={styles.eyebrow}>Partner portal</span>

            <h2>Logistic partner login</h2>

            <p>
              Login after your registration has been approved by the
              administrator.
            </p>
          </div>

          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className={styles.successMessage} role="status">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.field}>
              <label htmlFor="email">Email address</label>

              <div className={styles.inputWrapper}>
                <Mail size={18} aria-hidden="true" />

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="partner@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Password</label>

              <div className={styles.inputWrapper}>
                <LockKeyhole size={18} aria-hidden="true" />

                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => setShowPassword((value) => !value)}
                  aria-label={
                    showPassword ? "Hide password" : "Show password"
                  }
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff size={18} aria-hidden="true" />
                  ) : (
                    <Eye size={18} aria-hidden="true" />
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}

              {!loading && <ArrowRight size={18} aria-hidden="true" />}
            </button>
          </form>

          <p className={styles.bottomText}>
            Not registered yet?{" "}
            <Link to="/logistic-partner/register">Create an account</Link>
          </p>

          <p className={styles.bottomText}>
            <Link to="/partner-application-status">
              Check application status
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}