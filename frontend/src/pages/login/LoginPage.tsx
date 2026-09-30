import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Smartphone,
} from "lucide-react";
import { FaFacebookF, FaGoogle } from "react-icons/fa6";
import { Link, useLocation, useNavigate } from "react-router-dom";

import logo from "../../assets/images/jihaan-logo.jpeg";
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
  isPhoneVerified?: boolean;
  authProvider?: "local" | "google" | "facebook";
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

type GoogleCredentialResponse = {
  credential?: string;
};

type GoogleAccountsId = {
  initialize: (options: {
    client_id: string;
    callback: (response: GoogleCredentialResponse) => void;
    auto_select?: boolean;
    cancel_on_tap_outside?: boolean;
  }) => void;
  renderButton: (
    element: HTMLElement,
    options: {
      theme?: string;
      size?: string;
      width?: number;
      text?: string;
      shape?: string;
      logo_alignment?: string;
    },
  ) => void;
  prompt?: () => void;
};

type GoogleGlobal = {
  accounts: {
    id: GoogleAccountsId;
  };
};

type FacebookLoginResponse = {
  authResponse?: {
    accessToken?: string;
    userID?: string;
  };
  status?: string;
};

type FacebookGlobal = {
  init: (options: {
    appId: string;
    cookie?: boolean;
    xfbml?: boolean;
    version: string;
  }) => void;
  login: (
    callback: (response: FacebookLoginResponse) => void,
    options?: {
      scope?: string;
      return_scopes?: boolean;
    },
  ) => void;
};

declare global {
  interface Window {
    google?: GoogleGlobal;
    FB?: FacebookGlobal;
    fbAsyncInit?: () => void;
  }
}

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/+$/, "");

const GOOGLE_CLIENT_ID = String(
  import.meta.env.VITE_GOOGLE_CLIENT_ID || "",
).trim();

const FACEBOOK_APP_ID = String(
  import.meta.env.VITE_FACEBOOK_APP_ID || "",
).trim();

const FACEBOOK_GRAPH_VERSION = String(
  import.meta.env.VITE_FACEBOOK_GRAPH_VERSION || "v24.0",
).trim();

const CURRENT_USER_STORAGE_KEY = "jihaan_current_user";
const AUTH_TOKEN_STORAGE_KEY = "jihaan_auth_token";

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const facebookSdkLoadedRef = useRef(false);

  const locationState = (location.state || {}) as LocationState;

  const [form, setForm] = useState<LoginForm>({
    identifier:
      locationState.identifier ||
      locationState.email ||
      "",
    password: "",
  });


  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showRegisterPrompt, setShowRegisterPrompt] = useState(false);

  const [showPassword, setShowPassword] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isFacebookLoading, setIsFacebookLoading] =
    useState(false);


  /*
   * ---------------------------------------------------------
   * Common helpers
   * ---------------------------------------------------------
   */

  const clearMessages = () => {
    setError("");
    setSuccess("");
    setShowRegisterPrompt(false);
  };

  const storeAuthenticatedUser = (
    token: string,
    user: LoginUser,
  ) => {
    localStorage.setItem(
      AUTH_TOKEN_STORAGE_KEY,
      token,
    );

    localStorage.setItem("authToken", token);
    localStorage.setItem("accessToken", token);
    localStorage.setItem("token", token);

    localStorage.setItem(
      CURRENT_USER_STORAGE_KEY,
      JSON.stringify(user),
    );

    localStorage.setItem(
      "jihaan_user",
      JSON.stringify(user),
    );
  };

  const redirectAfterLogin = (user: LoginUser) => {
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
        message: "Welcome back to Jini Cosmetics!",
      },
    });
  };

  const handleSuccessfulLogin = (
    responseData: LoginResponse,
  ) => {
    const token =
      responseData.token ||
      responseData.accessToken ||
      responseData.data?.token ||
      responseData.data?.accessToken;

    const user =
      responseData.user ||
      responseData.data?.user;

    if (!token || !user) {
      throw new Error(
        "Login response does not contain a valid token or user.",
      );
    }

    storeAuthenticatedUser(token, user);

    setSuccess("Login successful. Redirecting...");

    redirectAfterLogin(user);
  };

  /*
   * ---------------------------------------------------------
   * Normal login
   * ---------------------------------------------------------
   */

  const handleChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;

    setForm((previousForm) => ({
      ...previousForm,
      [name]: value,
    }));

    clearMessages();
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
      const emailPattern =
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

      if (
        !emailPattern.test(
          identifier.toLowerCase(),
        )
      ) {
        setError(
          "Please enter a valid email address.",
        );
        return false;
      }
    } else {
      const normalizedPhone =
        identifier.replace(/\D/g, "");

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
      setError(
        "Password must contain at least 4 characters.",
      );
      return false;
    }

    return true;
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    clearMessages();

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
        data =
          (await response.json()) as LoginResponse;
      } catch {
        throw new Error(
          "Invalid response received from the server.",
        );
      }

      if (!response.ok) {
        if (
          response.status === 404 ||
          (data as LoginResponse & {
            accountNotFound?: boolean;
          }).accountNotFound === true
        ) {
          setError(
            "No account was found with these details. Please create an account first.",
          );
          setShowRegisterPrompt(true);
          return;
        }

        throw new Error(
          data.message ||
            "Invalid email/mobile number or password.",
        );
      }

      handleSuccessfulLogin(data);
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

  /*
   * ---------------------------------------------------------
   * Google Login
   * ---------------------------------------------------------
   */

  const handleGoogleCredential = async (
    response: GoogleCredentialResponse,
  ) => {
    if (!response.credential) {
      setError(
        "Google authentication did not return a valid credential.",
      );
      setIsGoogleLoading(false);
      return;
    }

    try {
      clearMessages();

      const serverResponse = await fetch(
        `${API_BASE_URL}/auth/google`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            credential: response.credential,
          }),
        },
      );

      const data =
        (await serverResponse.json()) as SocialLoginResponse;

      if (!serverResponse.ok) {
        if (
          (data as LoginResponse & {
            requiresRegistration?: boolean;
          }).requiresRegistration === true
        ) {
          setError(
            data.message ||
              "No account exists with this Google account. Please create an account first.",
          );
          setShowRegisterPrompt(true);
          return;
        }

        throw new Error(
          data.message ||
            "Unable to continue with Google.",
        );
      }

      /*
       * Existing Google account
       */
      const token =
        data.token ||
        data.accessToken ||
        data.data?.token ||
        data.data?.accessToken;

      const user =
        data.user ||
        data.data?.user;

      if (token && user) {
        handleSuccessfulLogin(data);
        return;
      }

      /*
       * Google authentication always creates/logs in the account
       * immediately. No phone number or WhatsApp OTP is required.
       */
      throw new Error(
        data.message ||
          "Google authentication completed but login information was not returned.",
      );
    } catch (googleError) {
      const message =
        googleError instanceof Error
          ? googleError.message
          : "Unable to continue with Google.";

      setError(message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const initializeGoogle = () => {
    if (
      !GOOGLE_CLIENT_ID ||
      !window.google ||
      !googleButtonRef.current
    ) {
      return;
    }

    googleButtonRef.current.innerHTML = "";

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: handleGoogleCredential,
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    window.google.accounts.id.renderButton(
      googleButtonRef.current,
      {
        theme: "outline",
        size: "large",
        width: 360,
        text: "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
      },
    );
  };

  useEffect(() => {
    if (!GOOGLE_CLIENT_ID) {
      return;
    }

    if (window.google) {
      initializeGoogle();
      return;
    }

    const existingScript =
      document.querySelector<HTMLScriptElement>(
        'script[src="https://accounts.google.com/gsi/client"]',
      );

    if (existingScript) {
      existingScript.addEventListener(
        "load",
        initializeGoogle,
      );

      return () => {
        existingScript.removeEventListener(
          "load",
          initializeGoogle,
        );
      };
    }

    const script =
      document.createElement("script");

    script.src =
      "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;

    script.onload = initializeGoogle;

    document.head.appendChild(script);

    return () => {
      script.onload = null;
    };
  }, []);

  const handleGoogleButtonClick = () => {
    clearMessages();

    if (!GOOGLE_CLIENT_ID) {
      setError(
        "Google login is not configured on this website.",
      );
      return;
    }

    if (!window.google) {
      setError(
        "Google login is still loading. Please try again.",
      );
      return;
    }

    setIsGoogleLoading(true);

    /*
     * The actual Google GIS button is rendered into
     * googleButtonRef. Triggering click here is avoided
     * because Google's button handles its own popup.
     */
    setTimeout(() => {
      setIsGoogleLoading(false);
    }, 15000);
  };

  /*
   * ---------------------------------------------------------
   * Facebook Login
   * ---------------------------------------------------------
   */

  const loadFacebookSdk = () => {
    if (window.FB) {
      facebookSdkLoadedRef.current = true;
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const existingScript =
        document.querySelector<HTMLScriptElement>(
          "#facebook-jssdk",
        );

      if (existingScript) {
        window.fbAsyncInit = () => {
          if (!window.FB) {
            reject(
              new Error(
                "Facebook SDK failed to initialize.",
              ),
            );
            return;
          }

          window.FB.init({
            appId: FACEBOOK_APP_ID,
            cookie: true,
            xfbml: true,
            version: FACEBOOK_GRAPH_VERSION,
          });

          facebookSdkLoadedRef.current = true;
          resolve();
        };

        return;
      }

      window.fbAsyncInit = () => {
        if (!window.FB) {
          reject(
            new Error(
              "Facebook SDK failed to initialize.",
            ),
          );
          return;
        }

        window.FB.init({
          appId: FACEBOOK_APP_ID,
          cookie: true,
          xfbml: true,
          version: FACEBOOK_GRAPH_VERSION,
        });

        facebookSdkLoadedRef.current = true;
        resolve();
      };

      const script =
        document.createElement("script");

      script.id = "facebook-jssdk";
      script.src =
        "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;

      script.onerror = () => {
        reject(
          new Error(
            "Unable to load Facebook login.",
          ),
        );
      };

      document.body.appendChild(script);
    });
  };

  const handleFacebookLogin = async () => {
    clearMessages();

    if (!FACEBOOK_APP_ID) {
      setError(
        "Facebook login is not configured on this website.",
      );
      return;
    }

    setIsFacebookLoading(true);

    try {
      await loadFacebookSdk();

      if (!window.FB) {
        throw new Error(
          "Facebook login is unavailable right now.",
        );
      }

      window.FB.login(
        async (loginResponse) => {
          try {
            if (
              !loginResponse.authResponse?.accessToken
            ) {
              throw new Error(
                "Facebook login was cancelled or did not return an access token.",
              );
            }

            const accessToken =
              loginResponse.authResponse.accessToken;

            const serverResponse = await fetch(
              `${API_BASE_URL}/auth/facebook`,
              {
                method: "POST",
                credentials: "include",
                headers: {
                  "Content-Type":
                    "application/json",
                  Accept: "application/json",
                },
                body: JSON.stringify({
                  accessToken,
                }),
              },
            );

            const data =
              (await serverResponse.json()) as SocialLoginResponse;

            if (!serverResponse.ok) {
              if (
                (data as LoginResponse & {
                  requiresRegistration?: boolean;
                }).requiresRegistration === true
              ) {
                setError(
                  data.message ||
                    "No account exists with this Facebook account. Please create an account first.",
                );
                setShowRegisterPrompt(true);
                return;
              }

              throw new Error(
                data.message ||
                  "Unable to continue with Facebook.",
              );
            }

            const token =
              data.token ||
              data.accessToken ||
              data.data?.token ||
              data.data?.accessToken;

            const user =
              data.user ||
              data.data?.user;

            /*
             * Existing Facebook account
             */
            if (token && user) {
              handleSuccessfulLogin(data);
              return;
            }

            /*
             * Facebook authentication always creates/logs in the account
             * immediately. No phone number or WhatsApp OTP is required.
             */
            throw new Error(
              data.message ||
                "Facebook authentication completed but login information was not returned.",
            );
          } catch (facebookError) {
            const message =
              facebookError instanceof Error
                ? facebookError.message
                : "Unable to continue with Facebook.";

            setError(message);
          } finally {
            setIsFacebookLoading(false);
          }
        },
        {
          scope: "email,public_profile",
          return_scopes: true,
        },
      );
    } catch (facebookError) {
      const message =
        facebookError instanceof Error
          ? facebookError.message
          : "Unable to continue with Facebook.";

      setError(message);
      setIsFacebookLoading(false);
    }
  };

  /*
   * ---------------------------------------------------------
   * Render
   * ---------------------------------------------------------
   */

  return (
    <main className={styles.page}>
      <div
        className={styles.backgroundShapeOne}
        aria-hidden="true"
      />

      <div
        className={styles.backgroundShapeTwo}
        aria-hidden="true"
      />

      <div
        className={styles.backgroundOrbOne}
        aria-hidden="true"
      />

      <div
        className={styles.backgroundOrbTwo}
        aria-hidden="true"
      />

      <div className={styles.pageContent}>
        <div className={styles.brand}>
          <Link
            to="/"
            className={styles.logo}
            aria-label="Jini Cosmetics home"
          >
            <img
              src={logo}
              alt="Jini Cosmetics logo"
              className={styles.logoImage}
            />

            <span className={styles.logoText}>
              <span className={styles.logoMain}>
                JINI COSMETICS
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
              Access your orders, wishlist, and personalized beauty experience.
            </p>
          </div>

          {success && (
            <p
              className={styles.success}
              role="status"
            >
              <CheckCircle2
                size={16}
                strokeWidth={1.8}
              />
              <span>{success}</span>
            </p>
          )}

          {error && (
            <p
              className={styles.error}
              role="alert"
            >
              {error}
            </p>
          )}

          {showRegisterPrompt && (
            <div
              className={styles.registerPrompt}
              role="alert"
            >
              <span>
                Don't have an account yet?
              </span>

              <Link
                to="/register"
                className={styles.registerPromptLink}
              >
                Create an account
              </Link>
            </div>
          )}


            <>
              {/* ---------------------------------------------
               * SOCIAL LOGIN
               * --------------------------------------------- */}

              <div className={styles.socialButtons}>
                {GOOGLE_CLIENT_ID ? (
                  <div
                    className={
                      styles.googleButtonWrapper
                    }
                    onClick={
                      handleGoogleButtonClick
                    }
                  >
                    <div
                      ref={googleButtonRef}
                      className={
                        styles.googleButton
                      }
                    />

                    {isGoogleLoading && (
                      <span
                        className={
                          styles.socialLoading
                        }
                      >
                        Connecting...
                      </span>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    className={
                      styles.socialButton
                    }
                    disabled
                  >
                    <FaGoogle className={styles.googleG} aria-hidden="true" />
                    Continue with Google
                  </button>
                )}

                <button
                  type="button"
                  className={
                    styles.socialButton
                  }
                  onClick={
                    handleFacebookLogin
                  }
                  disabled={
                    isFacebookLoading
                  }
                >
                  <FaFacebookF size={17} aria-hidden="true" />

                  <span>
                    {isFacebookLoading
                      ? "Connecting..."
                      : "Continue with Facebook"}
                  </span>
                </button>
              </div>

              <div
                className={styles.socialDivider}
              >
                <span>OR CONTINUE WITH EMAIL</span>
              </div>

              {/* ---------------------------------------------
               * NORMAL LOGIN
               * --------------------------------------------- */}

              <form
                className={styles.form}
                onSubmit={handleSubmit}
              >
                <div className={styles.field}>
                  <label htmlFor="identifier">
                    Email or mobile number
                  </label>

                  <div
                    className={
                      styles.inputWrapper
                    }
                  >
                    {form.identifier.includes(
                      "@",
                    ) ? (
                      <Mail
                        size={18}
                        strokeWidth={1.7}
                      />
                    ) : (
                      <Smartphone
                        size={18}
                        strokeWidth={1.7}
                      />
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
                  <div
                    className={
                      styles.passwordLabel
                    }
                  >
                    <label htmlFor="password">
                      Password
                    </label>

                    <Link
                      to="/forgot-password"
                      className={
                        styles.forgotLink
                      }
                    >
                      Forgot password?
                    </Link>
                  </div>

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
                      id="password"
                      name="password"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      placeholder="Enter your password"
                      value={form.password}
                      onChange={handleChange}
                      autoComplete="current-password"
                      required
                    />

                    <button
                      type="button"
                      className={
                        styles.passwordToggle
                      }
                      onClick={() =>
                        setShowPassword(
                          (previous) =>
                            !previous,
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

                <button
                  type="submit"
                  className={
                    styles.submitButton
                  }
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
                  Your account information is kept
                  private and secure.
                </span>
              </div>

              <div
                className={styles.divider}
              >
                <span>
                  New to Jini Cosmetics?
                </span>
              </div>

              <Link
                to="/register"
                className={
                  styles.registerButton
                }
              >
                Create an account
              </Link>
            </>
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
            © {new Date().getFullYear()} Jini
            Cosmetics. All rights reserved.
          </p>
        </footer>
      </div>
    </main>
  );
};

export default LoginPage;