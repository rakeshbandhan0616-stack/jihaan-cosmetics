
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

import logo from "../../assets/images/jihaan-logo.jpeg";
import styles from "./AdminLoginPage.module.css";

/* =========================================================
   TYPES
========================================================= */

interface AdminUser {
  id?: string;
  _id?: string;
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

/* =========================================================
   API CONFIGURATION
========================================================= */

/*
 * Production backend.
 *
 * This is intentionally fixed to the Render API so an old
 * VITE_API_BASE_URL value cannot point the login elsewhere.
 */

const API_URL =
  "https://jihaan-cosmetics.onrender.com/api";

/* =========================================================
   STORAGE KEYS
========================================================= */

const ADMIN_TOKEN_KEY = "adminToken";
const ADMIN_USER_KEY = "adminUser";

const STAFF_TOKEN_KEY = "staffToken";
const STAFF_USER_KEY = "staffUser";

const AUTH_TOKEN_KEY = "jihaan_auth_token";
const CURRENT_USER_KEY = "jihaan_current_user";

/* =========================================================
   ALLOWED ADMIN ROLES
========================================================= */

const ADMIN_ROLES = [
  "superadmin",
  "admin",
];

/* =========================================================
   HELPERS
========================================================= */

const normalizeEmail = (
  email: string,
): string => {
  return String(email || "")
    .trim()
    .toLowerCase();
};

const normalizeRole = (
  role?: string,
): string => {
  return String(role || "")
    .trim()
    .toLowerCase()
    .replace(/[\s_-]+/g, "");
};

const extractToken = (
  data: AdminLoginResponse,
): string => {
  return String(
    data.token ||
      data.accessToken ||
      data.data?.token ||
      data.data?.accessToken ||
      "",
  ).trim();
};

const extractUser = (
  data: AdminLoginResponse,
): AdminUser | null => {
  return (
    data.user ||
    data.data?.user ||
    null
  );
};

const clearPreviousSession = () => {
  localStorage.removeItem(
    ADMIN_TOKEN_KEY,
  );

  localStorage.removeItem(
    ADMIN_USER_KEY,
  );

  localStorage.removeItem(
    STAFF_TOKEN_KEY,
  );

  localStorage.removeItem(
    STAFF_USER_KEY,
  );

  localStorage.removeItem(
    AUTH_TOKEN_KEY,
  );

  localStorage.removeItem(
    CURRENT_USER_KEY,
  );

  localStorage.removeItem(
    "authToken",
  );

  localStorage.removeItem(
    "accessToken",
  );

  localStorage.removeItem(
    "token",
  );

  localStorage.removeItem(
    "jihaan_user",
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const AdminLoginPage = () => {
  const navigate = useNavigate();

  /* =======================================================
     STATE
  ======================================================= */

  const [form, setForm] =
    useState<LoginForm>({
      email: "",
      password: "",
    });

  const [error, setError] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  /* =========================================================
     INPUT CHANGE
  ========================================================= */

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const {
      name,
      value,
    } = event.target;

    setForm(
      (previousForm) => ({
        ...previousForm,
        [name]: value,
      }),
    );

    setError("");
  };

  /* =========================================================
     LOGIN
  ========================================================= */

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");

    const email =
      normalizeEmail(form.email);

    const password =
      String(form.password || "");

    /* -------------------------------------------------------
       REQUIRED FIELDS
    ------------------------------------------------------- */

    if (!email) {
      setError(
        "Please enter your email address.",
      );
      return;
    }

    if (!password) {
      setError(
        "Please enter your password.",
      );
      return;
    }

    /* -------------------------------------------------------
       EMAIL FORMAT
    ------------------------------------------------------- */

    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      setError(
        "Please enter a valid email address.",
      );
      return;
    }

    setIsSubmitting(true);

    try {
      /* =====================================================
         CLEAR OLD LOGIN
      ===================================================== */

      clearPreviousSession();

      /* =====================================================
         API ENDPOINT
      ===================================================== */

      const endpoint =
        `${API_URL}/auth/admin-login`;

      console.log(
        "========================================",
      );

      console.log(
        "JIHAAN ADMIN LOGIN",
      );

      console.log(
        "API:",
        endpoint,
      );

      console.log(
        "Email:",
        email,
      );

      console.log(
        "========================================",
      );

      /* =====================================================
         REQUEST
      ===================================================== */

      const response =
        await fetch(
          endpoint,
          {
            method: "POST",

            credentials: "include",

            headers: {
              "Content-Type":
                "application/json",

              Accept:
                "application/json",
            },

            body: JSON.stringify({
              email,
              password,
            }),
          },
        );

      /* =====================================================
         READ RESPONSE
      ===================================================== */

      let data:
        AdminLoginResponse =
        {};

      const contentType =
        response.headers.get(
          "content-type",
        ) || "";

      if (
        contentType.includes(
          "application/json",
        )
      ) {
        try {
          data =
            (await response.json()) as AdminLoginResponse;
        } catch {
          throw new Error(
            "The server returned invalid JSON.",
          );
        }
      } else {
        const serverText =
          await response.text();

        console.error(
          "Non-JSON response:",
          serverText,
        );

        throw new Error(
          `The server returned an invalid response (${response.status}).`,
        );
      }

      /* =====================================================
         DEBUG
      ===================================================== */

      console.log(
        "LOGIN RESPONSE:",
        {
          status:
            response.status,
          success:
            data.success,
          message:
            data.message,
          user:
            data.user ||
            data.data?.user,
        },
      );

      /* =====================================================
         SERVER ERROR
      ===================================================== */

      if (!response.ok) {
        const serverMessage =
          String(
            data.message || "",
          ).trim();

        if (
          serverMessage
            .toLowerCase()
            .includes(
              "staff account not found",
            )
        ) {
          throw new Error(
            "Staff account not found. The Render backend cannot find this email with an allowed staff role. Make sure Render is connected to the jihaan database.",
          );
        }

        if (
          serverMessage
            .toLowerCase()
            .includes(
              "invalid staff email or password",
            )
        ) {
          throw new Error(
            "Invalid staff email or password.",
          );
        }

        throw new Error(
          serverMessage ||
            `Login failed with status ${response.status}.`,
        );
      }

      /* =====================================================
         GET TOKEN
      ===================================================== */

      const token =
        extractToken(data);

      if (!token) {
        console.error(
          "Token missing:",
          data,
        );

        throw new Error(
          "Login succeeded but the server did not return an authentication token.",
        );
      }

      /* =====================================================
         GET USER
      ===================================================== */

      const user =
        extractUser(data);

      if (!user) {
        console.error(
          "User missing:",
          data,
        );

        throw new Error(
          "Login succeeded but the server did not return the staff user.",
        );
      }

      /* =====================================================
         NORMALIZE ROLE
      ===================================================== */

      const role =
        normalizeRole(
          user.role,
        );

      console.log(
        "Staff role:",
        user.role,
      );

      console.log(
        "Normalized role:",
        role,
      );

      /* =====================================================
         ADMIN ROLE CHECK
      ===================================================== */

      if (
        !ADMIN_ROLES.includes(
          role,
        )
      ) {
        throw new Error(
          `The account role "${user.role}" does not have access to the admin panel.`,
        );
      }

      /* =====================================================
         ACCOUNT STATUS
      ===================================================== */

      if (
        user.isActive === false
      ) {
        throw new Error(
          "Your admin account is inactive.",
        );
      }

      if (
        user.isBlocked === true
      ) {
        throw new Error(
          "Your admin account has been blocked.",
        );
      }

      /* =====================================================
         SAVE TOKEN
      ===================================================== */

      localStorage.setItem(
        ADMIN_TOKEN_KEY,
        token,
      );

      localStorage.setItem(
        STAFF_TOKEN_KEY,
        token,
      );

      localStorage.setItem(
        AUTH_TOKEN_KEY,
        token,
      );

      localStorage.setItem(
        "authToken",
        token,
      );

      localStorage.setItem(
        "accessToken",
        token,
      );

      localStorage.setItem(
        "token",
        token,
      );

      /* =====================================================
         SAVE USER
      ===================================================== */

      const serializedUser =
        JSON.stringify(user);

      localStorage.setItem(
        ADMIN_USER_KEY,
        serializedUser,
      );

      localStorage.setItem(
        STAFF_USER_KEY,
        serializedUser,
      );

      localStorage.setItem(
        CURRENT_USER_KEY,
        serializedUser,
      );

      localStorage.setItem(
        "jihaan_user",
        serializedUser,
      );

      /* =====================================================
         VERIFY SESSION
      ===================================================== */

      if (
        !localStorage.getItem(
          ADMIN_TOKEN_KEY,
        ) ||
        !localStorage.getItem(
          ADMIN_USER_KEY,
        )
      ) {
        throw new Error(
          "Unable to save the login session.",
        );
      }

      /* =====================================================
         SUCCESS
      ===================================================== */

      console.log(
        "========================================",
      );

      console.log(
        "ADMIN LOGIN SUCCESSFUL",
      );

      console.log(
        "Email:",
        user.email,
      );

      console.log(
        "Role:",
        user.role,
      );

      console.log(
        "Token saved:",
        true,
      );

      console.log(
        "========================================",
      );

      /* =====================================================
         REDIRECT
      ===================================================== */

      navigate(
        "/admin/dashboard",
        {
          replace: true,
        },
      );
    } catch (
      loginError
    ) {
      console.error(
        "ADMIN LOGIN ERROR:",
        loginError,
      );

      if (
        loginError instanceof TypeError
      ) {
        setError(
          "Unable to connect to the Jihaan Cosmetics backend. Please check your Render backend.",
        );
      } else if (
        loginError instanceof Error
      ) {
        setError(
          loginError.message,
        );
      } else {
        setError(
          "Something went wrong. Please try again.",
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <main
      className={
        styles.page
      }
    >
      <div
        className={
          styles.backgroundShapeOne
        }
      />

      <div
        className={
          styles.backgroundShapeTwo
        }
      />

      <div
        className={
          styles.pageContent
        }
      >
        {/* ===================================================
            BRAND
        =================================================== */}

        <div
          className={
            styles.brand
          }
        >
          <Link
            to="/"
            className={
              styles.logo
            }
            aria-label="Jihaan Cosmetics home"
          >
            <img
              src={logo}
              alt="Jihaan Cosmetics logo"
              className={
                styles.logoImage
              }
            />

            <span
              className={
                styles.logoText
              }
            >
              <span
                className={
                  styles.logoMain
                }
              >
                Jini COSMETICS
              </span>

              <span
                className={
                  styles.logoSub
                }
              >
                BEAUTY. CONFIDENCE. YOU.
              </span>
            </span>
          </Link>
        </div>

        {/* ===================================================
            LOGIN CARD
        =================================================== */}

        <section
          className={
            styles.loginCard
          }
          aria-labelledby="admin-login-title"
        >
          {/* =================================================
              HEADER
          ================================================= */}

          <div
            className={
              styles.cardHeader
            }
          >
            <span
              className={
                styles.eyebrow
              }
            >
              ADMINISTRATION
            </span>

            <h1 id="admin-login-title">
              Sign in to admin panel
            </h1>

            <p
              className={
                styles.intro
              }
            >
              Manage products, orders,
              customers, and your Jini
              Cosmetics store.
            </p>
          </div>

          {/* =================================================
              LOGIN FORM
          ================================================= */}

          <form
            className={
              styles.form
            }
            onSubmit={
              handleSubmit
            }
          >
            {/* -------------------------------------------------
                EMAIL
            ------------------------------------------------- */}

            <div
              className={
                styles.field
              }
            >
              <label htmlFor="admin-email">
                Email address
              </label>

              <div
                className={
                  styles.inputWrapper
                }
              >
                <Mail
                  size={18}
                  strokeWidth={1.7}
                />

                <input
                  id="admin-email"
                  name="email"
                  type="email"
                  placeholder="Enter your admin email"
                  value={
                    form.email
                  }
                  onChange={
                    handleChange
                  }
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck={false}
                  disabled={
                    isSubmitting
                  }
                  required
                />
              </div>
            </div>

            {/* -------------------------------------------------
                PASSWORD
            ------------------------------------------------- */}

            <div
              className={
                styles.field
              }
            >
              <label htmlFor="admin-password">
                Password
              </label>

              <div
                className={
                  styles.inputWrapper
                }
              >
                <LockKeyhole
                  size={18}
                  strokeWidth={1.7}
                />

                <input
                  id="admin-password"
                  name="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={
                    form.password
                  }
                  onChange={
                    handleChange
                  }
                  autoComplete="current-password"
                  disabled={
                    isSubmitting
                  }
                  required
                />

                <button
                  type="button"
                  className={
                    styles.passwordToggle
                  }
                  onClick={() =>
                    setShowPassword(
                      (
                        previous,
                      ) =>
                        !previous,
                    )
                  }
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                  disabled={
                    isSubmitting
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

            {/* -------------------------------------------------
                ERROR
            ------------------------------------------------- */}

            {error && (
              <p
                className={
                  styles.error
                }
                role="alert"
              >
                {error}
              </p>
            )}

            {/* -------------------------------------------------
                SUBMIT
            ------------------------------------------------- */}

            <button
              type="submit"
              className={
                styles.submitButton
              }
              disabled={
                isSubmitting
              }
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

          {/* =================================================
              SECURITY NOTE
          ================================================= */}

          <div
            className={
              styles.securityNote
            }
          >
            <ShieldCheck
              size={17}
              strokeWidth={1.7}
            />

            <span>
              Only authorized admin
              accounts can access this
              panel.
            </span>
          </div>

          {/* =================================================
              DIVIDER
          ================================================= */}

          <div
            className={
              styles.divider
            }
          >
            <span>
              Not an administrator?
            </span>
          </div>

          {/* =================================================
              BACK TO WEBSITE
          ================================================= */}

          <Link
            to="/"
            className={
              styles.backButton
            }
          >
            Back to website
          </Link>
        </section>

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer
          className={
            styles.footer
          }
        >
          <nav
            className={
              styles.footerLinks
            }
            aria-label="Footer navigation"
          >
            <Link to="/about">
              About us
            </Link>

            <Link to="/contact">
              Contact
            </Link>

            <Link to="/privacy">
              Privacy
            </Link>

            <Link to="/terms">
              Terms
            </Link>
          </nav>

          <p>
            ©{" "}
            {new Date().getFullYear()}{" "}
            Jini Cosmetics. All rights
            reserved.
          </p>
        </footer>
      </div>
    </main>
  );
};

export default AdminLoginPage;

