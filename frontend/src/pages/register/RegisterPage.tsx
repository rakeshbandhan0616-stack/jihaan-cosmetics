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

  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
  UserRound,
} from "lucide-react";
import { FaFacebookF, FaGoogle } from "react-icons/fa6";
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

type SocialRegistrationForm = {
  phone: string;
  otp: string;
};

type RegisterResponse = {
  success?: boolean;
  message?: string;
  token?: string;
  accessToken?: string;
  socialToken?: string;
  requiresPhone?: boolean;
  requiresOtp?: boolean;
  provider?: "google" | "facebook";
  user?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    role?: string;
    authProvider?: "local" | "google" | "facebook";
    isPhoneVerified?: boolean;
  };
  data?: {
    token?: string;
    accessToken?: string;
    socialToken?: string;
    requiresPhone?: boolean;
    requiresOtp?: boolean;
    provider?: "google" | "facebook";
    user?: {
      id: string;
      name: string;
      email: string;
      phone?: string;
      role?: string;
      authProvider?: "local" | "google" | "facebook";
      isPhoneVerified?: boolean;
    };
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
  import.meta.env.VITE_FACEBOOK_GRAPH_VERSION ||
    "v24.0",
).trim();

const AUTH_TOKEN_STORAGE_KEY = "jihaan_auth_token";
const CURRENT_USER_STORAGE_KEY = "jihaan_current_user";

const RegisterPage = () => {
  const navigate = useNavigate();

  const googleButtonRef =
    useRef<HTMLDivElement | null>(null);

  const [form, setForm] = useState<RegisterForm>({
    name: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
  });

  const [socialForm, setSocialForm] =
    useState<SocialRegistrationForm>({
      phone: "",
      otp: "",
    });

  const [showPassword, setShowPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [isSubmitting, setIsSubmitting] =
    useState(false);

  const [isGoogleLoading, setIsGoogleLoading] =
    useState(false);

  const [isFacebookLoading, setIsFacebookLoading] =
    useState(false);

  const [isOtpSending, setIsOtpSending] =
    useState(false);

  const [isOtpSubmitting, setIsOtpSubmitting] =
    useState(false);

  const [socialRegistration, setSocialRegistration] =
    useState<{
      active: boolean;
      provider: "google" | "facebook" | null;
      token: string;
      name: string;
      email: string;
    }>({
      active: false,
      provider: null,
      token: "",
      name: "",
      email: "",
    });

  /*
   * ---------------------------------------------------------
   * Helpers
   * ---------------------------------------------------------
   */

  const clearMessages = () => {
    setError("");
    setSuccess("");
  };

  const normalizePhone = (value: string) => {
    const digits = value.replace(/\D/g, "");

    if (
      digits.startsWith("91") &&
      digits.length === 12
    ) {
      return digits.slice(2);
    }

    return digits;
  };

  const storeAuthenticatedUser = (
    token: string,
    user: NonNullable<RegisterResponse["user"]>,
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

  const redirectAfterLogin = (
    user: NonNullable<RegisterResponse["user"]>,
  ) => {
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
        message:
          "Welcome to Jini Cosmetics!",
      },
    });
  };

  /*
   * ---------------------------------------------------------
   * Local Registration
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
    const name = form.name.trim();
    const email = form.email.trim().toLowerCase();
    const phone = normalizePhone(form.phone);
    const password = form.password;
    const confirmPassword =
      form.confirmPassword;

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
      setError(
        "Please enter a valid full name.",
      );
      return false;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      setError(
        "Please enter a valid email address.",
      );
      return false;
    }

    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      setError(
        "Please enter a valid 10-digit Indian mobile number.",
      );
      return false;
    }

    if (password.length < 4) {
      setError(
        "Password must contain at least 4 characters.",
      );
      return false;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
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
        `${API_BASE_URL}/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            name: form.name.trim(),
            email: form.email
              .trim()
              .toLowerCase(),
            phone: normalizePhone(form.phone),
            password: form.password,
          }),
        },
      );

      let data: RegisterResponse;

      try {
        data =
          (await response.json()) as RegisterResponse;
      } catch {
        throw new Error(
          "Invalid response received from the server.",
        );
      }

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to create your account.",
        );
      }

      setSuccess(
        data.message ||
          "Registration successful. Redirecting to login...",
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
            message:
              "Registration successful. Please log in.",
            email:
              form.email
                .trim()
                .toLowerCase(),
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

  /*
   * ---------------------------------------------------------
   * Google Registration
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
        (await serverResponse.json()) as RegisterResponse;

      if (!serverResponse.ok) {
        throw new Error(
          data.message ||
            "Unable to continue with Google.",
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
       * Existing Google account.
       */
      if (token && user) {
        storeAuthenticatedUser(token, user);

        setSuccess(
          "Google login successful. Redirecting...",
        );

        setTimeout(() => {
          redirectAfterLogin(user);
        }, 500);

        return;
      }

      /*
       * New Google account.
       * Backend returns socialToken and asks for
       * mobile verification.
       */
      const socialToken =
        data.socialToken ||
        data.data?.socialToken;

      if (
        socialToken &&
        data.requiresPhone
      ) {
        setSocialRegistration({
          active: true,
          provider: "google",
          token: socialToken,
          name: user?.name || "",
          email: user?.email || "",
        });

        setSuccess(
          "Google account verified. Please add your mobile number to continue.",
        );

        return;
      }

      throw new Error(
        data.message ||
          "Google registration could not be completed.",
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
        width: 380,
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

  /*
   * ---------------------------------------------------------
   * Facebook Registration
   * ---------------------------------------------------------
   */

  const loadFacebookSdk = () => {
    if (window.FB) {
      return Promise.resolve();
    }

    return new Promise<void>(
      (resolve, reject) => {
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
            version:
              FACEBOOK_GRAPH_VERSION,
          });

          resolve();
        };

        const existingScript =
          document.querySelector<HTMLScriptElement>(
            "#facebook-jssdk",
          );

        if (existingScript) {
          return;
        }

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
      },
    );
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
            const accessToken =
              loginResponse.authResponse
                ?.accessToken;

            if (!accessToken) {
              throw new Error(
                "Facebook login was cancelled or did not return an access token.",
              );
            }

            const serverResponse =
              await fetch(
                `${API_BASE_URL}/auth/facebook`,
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
                    accessToken,
                  }),
                },
              );

            const data =
              (await serverResponse.json()) as RegisterResponse;

            if (!serverResponse.ok) {
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
             * Existing Facebook account.
             */
            if (token && user) {
              storeAuthenticatedUser(
                token,
                user,
              );

              setSuccess(
                "Facebook login successful. Redirecting...",
              );

              setTimeout(() => {
                redirectAfterLogin(user);
              }, 500);

              return;
            }

            /*
             * New Facebook account.
             */
            const socialToken =
              data.socialToken ||
              data.data?.socialToken;

            if (
              socialToken &&
              data.requiresPhone
            ) {
              setSocialRegistration({
                active: true,
                provider: "facebook",
                token: socialToken,
                name: user?.name || "",
                email: user?.email || "",
              });

              setSuccess(
                "Facebook account verified. Please add your mobile number to continue.",
              );

              return;
            }

            throw new Error(
              data.message ||
                "Facebook registration could not be completed.",
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
   * Social Registration + Mobile OTP
   * ---------------------------------------------------------
   */

  const handleSocialFormChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const { name, value } = event.target;

    setSocialForm((previous) => ({
      ...previous,
      [name]: value,
    }));

    clearMessages();
  };

  const validateSocialPhone = () => {
    const phone = normalizePhone(
      socialForm.phone,
    );

    if (!/^[6-9][0-9]{9}$/.test(phone)) {
      setError(
        "Please enter a valid 10-digit Indian mobile number.",
      );
      return null;
    }

    return phone;
  };

  const handleSendOtp = async () => {
    clearMessages();

    const phone = validateSocialPhone();

    if (!phone) {
      return;
    }

    if (!socialRegistration.token) {
      setError(
        "Your registration session has expired. Please start again.",
      );
      return;
    }

    setIsOtpSending(true);

    try {
      const response = await fetch(
        `${API_BASE_URL}/auth/social/send-otp`,
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type":
              "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            socialToken:
              socialRegistration.token,
            phone,
          }),
        },
      );

      const data =
        (await response.json()) as RegisterResponse;

      if (!response.ok) {
        throw new Error(
          data.message ||
            "Unable to send OTP.",
        );
      }

      setSuccess(
        "OTP has been sent to your mobile number.",
      );
    } catch (otpError) {
      const message =
        otpError instanceof Error
          ? otpError.message
          : "Unable to send OTP.";

      setError(message);
    } finally {
      setIsOtpSending(false);
    }
  };

  const handleCompleteSocialRegistration =
    async (
      event: FormEvent<HTMLFormElement>,
    ) => {
      event.preventDefault();

      clearMessages();

      const phone =
        validateSocialPhone();

      if (!phone) {
        return;
      }

      if (!socialForm.otp.trim()) {
        setError("Please enter the OTP.");
        return;
      }

      if (socialForm.otp.trim().length < 4) {
        setError("Please enter a valid OTP.");
        return;
      }

      if (!socialRegistration.token) {
        setError(
          "Your registration session has expired. Please start again.",
        );
        return;
      }

      setIsOtpSubmitting(true);

      try {
        const response = await fetch(
          `${API_BASE_URL}/auth/social/complete`,
          {
            method: "POST",
            credentials: "include",
            headers: {
              "Content-Type":
                "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({
              socialToken:
                socialRegistration.token,
              phone,
              otp: socialForm.otp.trim(),
            }),
          },
        );

        const data =
          (await response.json()) as RegisterResponse;

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Unable to complete registration.",
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

        if (!token || !user) {
          throw new Error(
            "Registration completed but login information was not returned.",
          );
        }

        storeAuthenticatedUser(
          token,
          user,
        );

        setSuccess(
          "Account created successfully. Redirecting...",
        );

        setTimeout(() => {
          redirectAfterLogin(user);
        }, 600);
      } catch (registrationError) {
        const message =
          registrationError instanceof Error
            ? registrationError.message
            : "Unable to complete registration.";

        setError(message);
      } finally {
        setIsOtpSubmitting(false);
      }
    };

  const cancelSocialRegistration = () => {
    setSocialRegistration({
      active: false,
      provider: null,
      token: "",
      name: "",
      email: "",
    });

    setSocialForm({
      phone: "",
      otp: "",
    });

    clearMessages();
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

      <header className={styles.brand}>
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
      </header>

      <section className={styles.registerCard}>
        <div className={styles.cardHeader}>
          <span className={styles.eyebrow}>
            {socialRegistration.active
              ? "ONE LAST STEP"
              : "WELCOME TO JINI"}
          </span>

          <h1>
            {socialRegistration.active
              ? "Verify your mobile"
              : "Create your account"}
          </h1>

          <p className={styles.intro}>
            {socialRegistration.active
              ? "Add your mobile number and verify it with OTP to secure your account."
              : "Join Jini Cosmetics and discover beauty essentials made for you."}
          </p>
        </div>

        {success && (
          <p
            className={styles.success}
            role="status"
          >
            <CheckCircle2
              size={17}
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

        {socialRegistration.active ? (
          /*
           * =====================================================
           * SOCIAL REGISTRATION
           * =====================================================
           */
          <form
            className={styles.form}
            onSubmit={
              handleCompleteSocialRegistration
            }
          >
            <div className={styles.socialAccount}>
              <div
                className={
                  styles.socialAccountIcon
                }
              >
                {socialRegistration.provider ===
                "facebook" ? (
                  <FaFacebookF size={18} aria-hidden="true" />
                ) : (
                  <FaGoogle className={styles.googleG} aria-hidden="true" />
                )}
              </div>

              <div>
                <strong>
                  {socialRegistration.name ||
                    "Social account"}
                </strong>

                <span>
                  {socialRegistration.email}
                </span>
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="social-phone">
                Mobile number
              </label>

              <div
                className={
                  styles.inputWrapper
                }
              >
                <Smartphone
                  size={18}
                  className={styles.inputIcon}
                  aria-hidden="true"
                />

                <input
                  id="social-phone"
                  name="phone"
                  type="tel"
                  inputMode="numeric"
                  maxLength={10}
                  placeholder="Enter 10-digit mobile number"
                  value={socialForm.phone}
                  onChange={
                    handleSocialFormChange
                  }
                  autoComplete="tel"
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
                <label htmlFor="social-otp">
                  Verification OTP
                </label>

                <button
                  type="button"
                  className={
                    styles.resendButton
                  }
                  onClick={handleSendOtp}
                  disabled={
                    isOtpSending ||
                    !socialForm.phone
                  }
                >
                  {isOtpSending
                    ? "Sending..."
                    : "Send OTP"}
                </button>
              </div>

              <div
                className={
                  styles.inputWrapper
                }
              >
                <ShieldCheck
                  size={18}
                  className={styles.inputIcon}
                  aria-hidden="true"
                />

                <input
                  id="social-otp"
                  name="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="Enter OTP"
                  value={socialForm.otp}
                  onChange={
                    handleSocialFormChange
                  }
                  autoComplete="one-time-code"
                />
              </div>
            </div>

            <button
              type="submit"
              className={
                styles.submitButton
              }
              disabled={isOtpSubmitting}
            >
              <span>
                {isOtpSubmitting
                  ? "Creating account..."
                  : "Verify & create account"}
              </span>

              {!isOtpSubmitting && (
                <ArrowRight
                  size={18}
                  strokeWidth={1.8}
                />
              )}
            </button>

            <button
              type="button"
              className={styles.backButton}
              onClick={
                cancelSocialRegistration
              }
            >
              ← Back to registration
            </button>
          </form>
        ) : (
          <>
            {/* =================================================
                SOCIAL REGISTRATION
            ================================================= */}

            <div
              className={
                styles.socialButtons
              }
            >
              {GOOGLE_CLIENT_ID ? (
                <div
                  className={
                    styles.googleButtonWrapper
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
              className={
                styles.socialDivider
              }
            >
              <span>
                OR CREATE WITH EMAIL
              </span>
            </div>

            {/* =================================================
                NORMAL REGISTRATION
            ================================================= */}

            <form
              className={styles.form}
              onSubmit={handleSubmit}
            >
              <div className={styles.field}>
                <label htmlFor="name">
                  Full name
                </label>

                <div
                  className={
                    styles.inputWrapper
                  }
                >
                  <UserRound
                    size={18}
                    className={
                      styles.inputIcon
                    }
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
                <label htmlFor="email">
                  Email address
                </label>

                <div
                  className={
                    styles.inputWrapper
                  }
                >
                  <Mail
                    size={18}
                    className={
                      styles.inputIcon
                    }
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
                <label htmlFor="phone">
                  Mobile number
                </label>

                <div
                  className={
                    styles.inputWrapper
                  }
                >
                  <span
                    className={
                      styles.phonePrefix
                    }
                  >
                    +91
                  </span>

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
                <label htmlFor="password">
                  Password
                </label>

                <div
                  className={
                    styles.inputWrapper
                  }
                >
                  <Lock
                    size={18}
                    className={
                      styles.inputIcon
                    }
                    aria-hidden="true"
                  />

                  <input
                    id="password"
                    name="password"
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Create a password"
                    value={form.password}
                    onChange={handleChange}
                    autoComplete="new-password"
                    minLength={4}
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
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                <span
                  className={
                    styles.helperText
                  }
                >
                  Use at least 4 characters.
                </span>
              </div>

              <div className={styles.field}>
                <label htmlFor="confirmPassword">
                  Confirm password
                </label>

                <div
                  className={
                    styles.inputWrapper
                  }
                >
                  <Lock
                    size={18}
                    className={
                      styles.inputIcon
                    }
                    aria-hidden="true"
                  />

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    placeholder="Re-enter your password"
                    value={
                      form.confirmPassword
                    }
                    onChange={handleChange}
                    autoComplete="new-password"
                    minLength={4}
                    required
                  />

                  <button
                    type="button"
                    className={
                      styles.passwordToggle
                    }
                    onClick={() =>
                      setShowConfirmPassword(
                        (previous) =>
                          !previous,
                      )
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

              <button
                type="submit"
                className={
                  styles.submitButton
                }
                disabled={isSubmitting}
              >
                <span>
                  {isSubmitting
                    ? "Creating account..."
                    : "Create account"}
                </span>

                {!isSubmitting && (
                  <ArrowRight
                    size={18}
                    strokeWidth={1.8}
                  />
                )}
              </button>
            </form>

            <p className={styles.terms}>
              By creating an account, you agree
              to our{" "}
              <Link to="/terms">
                Terms of Service
              </Link>{" "}
              and{" "}
              <Link to="/privacy">
                Privacy Policy
              </Link>
              .
            </p>

            <div className={styles.divider}>
              <span>
                Already have an account?
              </span>
            </div>

            <Link
              to="/login"
              className={styles.loginButton}
            >
              Log in
            </Link>
          </>
        )}
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
    </main>
  );
};

export default RegisterPage;