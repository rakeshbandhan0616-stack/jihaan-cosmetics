import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
} from "lucide-react";

import { Link, useNavigate } from "react-router-dom";

import logo from "../../assets/images/jihaan-logo.jpeg";
import styles from "./ForgotPassword.module.css";

/* =========================================================
   API CONFIG
========================================================= */

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL ||
    "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/+$/, "");

/* =========================================================
   TYPES
========================================================= */

type ForgotStep =
  | "email"
  | "otp"
  | "password"
  | "success";

interface ApiResponse {
  success?: boolean;
  message?: string;
  requiresOtp?: boolean;
  email?: string;
  maskedEmail?: string;
  challengeId?: string;
  expiresIn?: number;
  resendAfter?: number;
  resetToken?: string;
  retryAfter?: number;
  attemptsRemaining?: number;
  code?: string;
}

/* =========================================================
   COMPONENT
========================================================= */

const ForgotPassword = () => {
  const navigate = useNavigate();

  const [step, setStep] =
    useState<ForgotStep>("email");

  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");

  const [newPassword, setNewPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

  const [resetToken, setResetToken] =
    useState("");

  const [maskedEmail, setMaskedEmail] =
    useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [isLoading, setIsLoading] =
    useState(false);

  const [isResending, setIsResending] =
    useState(false);

  const [showNewPassword, setShowNewPassword] =
    useState(false);

  const [showConfirmPassword, setShowConfirmPassword] =
    useState(false);

  const [resendCountdown, setResendCountdown] =
    useState(0);

  const [otpExpiresIn, setOtpExpiresIn] =
    useState(300);

  /* =========================================================
     OTP EXPIRY COUNTDOWN
  ========================================================= */

  useEffect(() => {
    if (step !== "otp") {
      return;
    }

    if (otpExpiresIn <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setOtpExpiresIn((previous) =>
        previous > 0 ? previous - 1 : 0,
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [step, otpExpiresIn]);

  /* =========================================================
     RESEND COUNTDOWN
  ========================================================= */

  useEffect(() => {
    if (resendCountdown <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setResendCountdown((previous) =>
        previous > 0 ? previous - 1 : 0,
      );
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [resendCountdown]);

  /* =========================================================
     FORMAT TIME
  ========================================================= */

  const formatSeconds = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;

    return `${String(minutes).padStart(
      2,
      "0",
    )}:${String(remainingSeconds).padStart(
      2,
      "0",
    )}`;
  };

  /* =========================================================
     EMAIL VALIDATION
  ========================================================= */

  const isValidEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      value.trim(),
    );
  };

  /* =========================================================
     PASSWORD VALIDATION
  ========================================================= */

  const passwordChecks = useMemo(() => {
    return {
      minLength: newPassword.length >= 6,
      hasUppercase: /[A-Z]/.test(newPassword),
      hasNumber: /\d/.test(newPassword),
    };
  }, [newPassword]);

  const passwordsMatch =
    newPassword.length > 0 &&
    confirmPassword.length > 0 &&
    newPassword === confirmPassword;

  /* =========================================================
     COMMON RESPONSE HANDLER
  ========================================================= */

  const getErrorMessage = (
    data: ApiResponse,
    fallback: string,
  ) => {
    return data?.message || fallback;
  };

  /* =========================================================
     SEND PASSWORD RESET OTP
  ========================================================= */

  const handleSendOtp = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const normalizedEmail =
      email.trim().toLowerCase();

    if (!normalizedEmail) {
      setError(
        "Please enter your email address.",
      );
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError(
        "Please enter a valid email address.",
      );
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/auth/forgot-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: normalizedEmail,
          }),
        },
      );

      const data: ApiResponse =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        if (
          response.status === 429 &&
          data.retryAfter
        ) {
          setResendCountdown(
            data.retryAfter,
          );
        }

        throw new Error(
          getErrorMessage(
            data,
            "Unable to send OTP. Please try again.",
          ),
        );
      }

      setEmail(normalizedEmail);

      if (data.maskedEmail) {
        setMaskedEmail(data.maskedEmail);
      } else {
        setMaskedEmail(normalizedEmail);
      }

      /*
       * Backend returns requiresOtp:true
       * for the password-reset flow.
       */

      if (data.requiresOtp !== false) {
        setOtp("");

        setOtpExpiresIn(
          typeof data.expiresIn === "number"
            ? data.expiresIn
            : 300,
        );

        setResendCountdown(
          typeof data.resendAfter === "number"
            ? data.resendAfter
            : 60,
        );

        setStep("otp");

        setMessage(
          data.message ||
            "A password reset OTP has been sent to your email.",
        );

        return;
      }

      setMessage(
        data.message ||
          "Please check your email.",
      );
    } catch (requestError) {
      console.error(
        "SEND FORGOT PASSWORD OTP ERROR:",
        requestError,
      );

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to send OTP. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     VERIFY OTP
  ========================================================= */

  const handleVerifyOtp = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setMessage("");

    const normalizedOtp = otp.trim();

    if (!/^\d{6}$/.test(normalizedOtp)) {
      setError(
        "Please enter the 6-digit OTP.",
      );
      return;
    }

    if (otpExpiresIn <= 0) {
      setError(
        "This OTP has expired. Please request a new OTP.",
      );
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/auth/forgot-password/verify-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
            otp: normalizedOtp,
          }),
        },
      );

      const data: ApiResponse =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            "Invalid or expired OTP.",
          ),
        );
      }

      if (!data.success) {
        throw new Error(
          getErrorMessage(
            data,
            "OTP verification failed.",
          ),
        );
      }

      if (!data.resetToken) {
        throw new Error(
          "Password reset token was not received. Please try again.",
        );
      }

      /*
       * resetToken is NOT the normal login token.
       *
       * It is only used for resetting
       * the password.
       */

      setResetToken(data.resetToken);
      setOtp("");

      setMessage(
        data.message ||
          "OTP verified successfully. You can now create a new password.",
      );

      setStep("password");
    } catch (requestError) {
      console.error(
        "VERIFY FORGOT PASSWORD OTP ERROR:",
        requestError,
      );

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to verify OTP. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     RESEND OTP
  ========================================================= */

  const handleResendOtp = async () => {
    if (
      isResending ||
      resendCountdown > 0
    ) {
      return;
    }

    setError("");
    setMessage("");

    try {
      setIsResending(true);

      const response = await fetch(
        `${API_BASE_URL}/auth/forgot-password/resend-otp`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
          }),
        },
      );

      const data: ApiResponse =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        if (
          response.status === 429 &&
          data.retryAfter
        ) {
          setResendCountdown(
            data.retryAfter,
          );
        }

        throw new Error(
          getErrorMessage(
            data,
            "Unable to resend OTP.",
          ),
        );
      }

      setOtp("");

      setOtpExpiresIn(
        typeof data.expiresIn === "number"
          ? data.expiresIn
          : 300,
      );

      setResendCountdown(
        typeof data.resendAfter === "number"
          ? data.resendAfter
          : 60,
      );

      setMessage(
        data.message ||
          "A new OTP has been sent to your email.",
      );
    } catch (requestError) {
      console.error(
        "RESEND FORGOT PASSWORD OTP ERROR:",
        requestError,
      );

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to resend OTP. Please try again.",
      );
    } finally {
      setIsResending(false);
    }
  };

  /* =========================================================
     RESET PASSWORD
  ========================================================= */

  const handleResetPassword = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setError("");
    setMessage("");

    if (!resetToken) {
      setError(
        "Your password reset session has expired. Please start again.",
      );

      setStep("email");
      return;
    }

    if (!newPassword) {
      setError(
        "Please enter a new password.",
      );
      return;
    }

    /*
     * Backend requires minimum 6 characters.
     */

    if (newPassword.length < 6) {
      setError(
        "Password must contain at least 6 characters.",
      );
      return;
    }

    if (!confirmPassword) {
      setError(
        "Please confirm your new password.",
      );
      return;
    }

    if (
      newPassword !== confirmPassword
    ) {
      setError(
        "Passwords do not match.",
      );
      return;
    }

    try {
      setIsLoading(true);

      const response = await fetch(
        `${API_BASE_URL}/auth/reset-password`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            resetToken,
            newPassword,
            confirmPassword,
          }),
        },
      );

      const data: ApiResponse =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            "Unable to reset password.",
          ),
        );
      }

      if (!data.success) {
        throw new Error(
          getErrorMessage(
            data,
            "Password reset failed.",
          ),
        );
      }

      setNewPassword("");
      setConfirmPassword("");
      setResetToken("");

      setMessage(
        data.message ||
          "Your password has been reset successfully.",
      );

      setStep("success");
    } catch (requestError) {
      console.error(
        "RESET PASSWORD ERROR:",
        requestError,
      );

      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to reset password. Please try again.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  /* =========================================================
     BACK TO EMAIL
  ========================================================= */

  const handleBackToEmail = () => {
    setError("");
    setMessage("");
    setOtp("");
    setStep("email");
  };

  /* =========================================================
     BACK TO OTP
  ========================================================= */

  const handleBackToOtp = () => {
    setError("");
    setMessage("");
    setStep("otp");
  };

  /* =========================================================
     RENDER STEP INDICATOR
  ========================================================= */

  const renderStepIndicator = () => {
    if (step === "success") {
      return (
        <div className={styles.steps}>
          <div
            className={`${styles.step} ${styles.activeStep}`}
          >
            <span>✓</span>
            <small>Complete</small>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.steps}>
        <div
          className={`${styles.step} ${
            step === "email" ||
            step === "otp" ||
            step === "password"
              ? styles.activeStep
              : ""
          }`}
        >
          <span>1</span>
          <small>Email</small>
        </div>

        <div
          className={`${styles.stepLine} ${
            step === "otp" ||
            step === "password"
              ? styles.activeLine
              : ""
          }`}
        />

        <div
          className={`${styles.step} ${
            step === "otp" ||
            step === "password"
              ? styles.activeStep
              : ""
          }`}
        >
          <span>2</span>
          <small>Verify</small>
        </div>

        <div
          className={`${styles.stepLine} ${
            step === "password"
              ? styles.activeLine
              : ""
          }`}
        />

        <div
          className={`${styles.step} ${
            step === "password"
              ? styles.activeStep
              : ""
          }`}
        >
          <span>3</span>
          <small>Password</small>
        </div>
      </div>
    );
  };

  /* =========================================================
     SUCCESS SCREEN
  ========================================================= */

  if (step === "success") {
    return (
      <main className={styles.page}>
        <div className={styles.backgroundGlow} />

        <section className={styles.authWrapper}>
          <div className={styles.authCard}>
            <div className={styles.brand}>
              <img
                src={logo}
                alt="Jihaan Cosmetics"
                className={styles.logo}
              />
            </div>

            <div className={styles.successContent}>
              <div
                className={
                  styles.successIcon
                }
              >
                <CheckCircle2
                  size={42}
                  strokeWidth={1.8}
                />
              </div>

              <h1>
                Password Reset
                <br />
                Successfully
              </h1>

              <p>
                Your password has been
                changed successfully.
                You can now login using
                your new password.
              </p>

              <button
                type="button"
                className={styles.primaryButton}
                onClick={() =>
                  navigate("/login")
                }
              >
                <span>
                  Continue to Login
                </span>

                <ArrowRight size={18} />
              </button>
            </div>

            <div className={styles.cardFooter}>
              <span>
                Remember your password?
              </span>

              <Link to="/login">
                Sign in
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  /* =========================================================
     MAIN
  ========================================================= */

  return (
    <main className={styles.page}>
      <div className={styles.backgroundGlow} />

      <section className={styles.authWrapper}>
        <div className={styles.authCard}>
          {/* BRAND */}

          <div className={styles.brand}>
            <img
              src={logo}
              alt="Jihaan Cosmetics"
              className={styles.logo}
            />

            <div
              className={
                styles.securityBadge
              }
            >
              <ShieldCheck size={15} />

              <span>
                Secure Account Recovery
              </span>
            </div>
          </div>

          {/* HEADER */}

          <div className={styles.header}>
            <div
              className={
                styles.headerIcon
              }
            >
              {step === "email" && (
                <KeyRound size={24} />
              )}

              {step === "otp" && (
                <ShieldCheck size={24} />
              )}

              {step === "password" && (
                <Lock size={24} />
              )}
            </div>

            <div>
              <h1>
                {step === "email" &&
                  "Forgot Password?"}

                {step === "otp" &&
                  "Verify Your Email"}

                {step === "password" &&
                  "Create New Password"}
              </h1>

              <p>
                {step === "email" &&
                  "Enter your registered email to reset your password."}

                {step === "otp" &&
                  `Enter the 6-digit OTP sent to ${
                    maskedEmail || email
                  }.`}

                {step === "password" &&
                  "Create a new password for your Jihaan Cosmetics account."}
              </p>
            </div>
          </div>

          {/* STEP INDICATOR */}

          {renderStepIndicator()}

          {/* SUCCESS MESSAGE */}

          {message && (
            <div
              className={
                styles.successMessage
              }
            >
              <CheckCircle2 size={18} />

              <span>{message}</span>
            </div>
          )}

          {/* ERROR MESSAGE */}

          {error && (
            <div
              className={
                styles.errorMessage
              }
            >
              <span>{error}</span>
            </div>
          )}

          {/* =================================================
              STEP 1 - EMAIL
          ================================================= */}

          {step === "email" && (
            <form
              onSubmit={handleSendOtp}
              className={styles.form}
              noValidate
            >
              <div
                className={
                  styles.inputGroup
                }
              >
                <label htmlFor="email">
                  Email Address
                </label>

                <div
                  className={
                    styles.inputWrapper
                  }
                >
                  <Mail
                    size={19}
                    className={
                      styles.inputIcon
                    }
                  />

                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(event) =>
                      setEmail(
                        event.target.value,
                      )
                    }
                    placeholder="Enter your registered email"
                    autoComplete="email"
                    disabled={isLoading}
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                className={
                  styles.primaryButton
                }
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span
                      className={
                        styles.spinner
                      }
                    />

                    Sending OTP...
                  </>
                ) : (
                  <>
                    <span>
                      Send OTP
                    </span>

                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <div
                className={
                  styles.backLink
                }
              >
                <Link to="/login">
                  <ArrowLeft size={16} />
                  Back to Login
                </Link>
              </div>
            </form>
          )}

          {/* =================================================
              STEP 2 - OTP
          ================================================= */}

          {step === "otp" && (
            <form
              onSubmit={handleVerifyOtp}
              className={styles.form}
              noValidate
            >
              <div
                className={
                  styles.otpEmailBox
                }
              >
                <Mail size={18} />

                <div>
                  <span>
                    OTP sent to
                  </span>

                  <strong>
                    {maskedEmail || email}
                  </strong>
                </div>

                <button
                  type="button"
                  onClick={
                    handleBackToEmail
                  }
                  disabled={isLoading}
                >
                  Change
                </button>
              </div>

              <div
                className={
                  styles.inputGroup
                }
              >
                <label htmlFor="otp">
                  Verification Code
                </label>

                <input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={otp}
                  onChange={(event) => {
                    const value =
                      event.target.value
                        .replace(/\D/g, "")
                        .slice(0, 6);

                    setOtp(value);
                  }}
                  placeholder="Enter 6-digit OTP"
                  autoComplete="one-time-code"
                  className={
                    styles.otpInput
                  }
                  disabled={isLoading}
                  autoFocus
                />
              </div>

              <div
                className={
                  styles.otpMeta
                }
              >
                <span>
                  {otpExpiresIn > 0
                    ? `OTP expires in ${formatSeconds(
                        otpExpiresIn,
                      )}`
                    : "OTP expired"}
                </span>

                <button
                  type="button"
                  onClick={
                    handleResendOtp
                  }
                  disabled={
                    isResending ||
                    resendCountdown > 0
                  }
                  className={
                    styles.resendButton
                  }
                >
                  <RefreshCw
                    size={15}
                    className={
                      isResending
                        ? styles.spin
                        : ""
                    }
                  />

                  {resendCountdown > 0
                    ? `Resend in ${resendCountdown}s`
                    : isResending
                    ? "Sending..."
                    : "Resend OTP"}
                </button>
              </div>

              <button
                type="submit"
                className={
                  styles.primaryButton
                }
                disabled={
                  isLoading ||
                  otp.length !== 6
                }
              >
                {isLoading ? (
                  <>
                    <span
                      className={
                        styles.spinner
                      }
                    />

                    Verifying...
                  </>
                ) : (
                  <>
                    <span>
                      Verify OTP
                    </span>

                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <button
                type="button"
                className={
                  styles.secondaryButton
                }
                onClick={
                  handleBackToEmail
                }
                disabled={isLoading}
              >
                <ArrowLeft size={16} />

                Use another email
              </button>
            </form>
          )}

          {/* =================================================
              STEP 3 - NEW PASSWORD
          ================================================= */}

          {step === "password" && (
            <form
              onSubmit={
                handleResetPassword
              }
              className={styles.form}
              noValidate
            >
              <div
                className={
                  styles.verifiedEmail
                }
              >
                <div
                  className={
                    styles.verifiedIcon
                  }
                >
                  <CheckCircle2 size={18} />
                </div>

                <div>
                  <span>
                    Verified account
                  </span>

                  <strong>
                    {maskedEmail || email}
                  </strong>
                </div>
              </div>

              {/* NEW PASSWORD */}

              <div
                className={
                  styles.inputGroup
                }
              >
                <label htmlFor="newPassword">
                  New Password
                </label>

                <div
                  className={
                    styles.inputWrapper
                  }
                >
                  <Lock
                    size={19}
                    className={
                      styles.inputIcon
                    }
                  />

                  <input
                    id="newPassword"
                    type={
                      showNewPassword
                        ? "text"
                        : "password"
                    }
                    value={newPassword}
                    onChange={(event) =>
                      setNewPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Enter new password"
                    autoComplete="new-password"
                    disabled={isLoading}
                    autoFocus
                  />

                  <button
                    type="button"
                    className={
                      styles.passwordToggle
                    }
                    onClick={() =>
                      setShowNewPassword(
                        (previous) =>
                          !previous,
                      )
                    }
                    tabIndex={-1}
                    aria-label={
                      showNewPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>
              </div>

              {/* PASSWORD REQUIREMENTS */}

              <div
                className={
                  styles.passwordRequirements
                }
              >
                <span
                  className={
                    passwordChecks.minLength
                      ? styles.validRequirement
                      : ""
                  }
                >
                  <CheckCircle2 size={14} />

                  Minimum 6 characters
                </span>

                <span
                  className={
                    passwordChecks.hasUppercase
                      ? styles.validRequirement
                      : ""
                  }
                >
                  <CheckCircle2 size={14} />

                  Uppercase letter
                </span>

                <span
                  className={
                    passwordChecks.hasNumber
                      ? styles.validRequirement
                      : ""
                  }
                >
                  <CheckCircle2 size={14} />

                  Number
                </span>
              </div>

              {/* CONFIRM PASSWORD */}

              <div
                className={
                  styles.inputGroup
                }
              >
                <label htmlFor="confirmPassword">
                  Confirm New Password
                </label>

                <div
                  className={
                    styles.inputWrapper
                  }
                >
                  <Lock
                    size={19}
                    className={
                      styles.inputIcon
                    }
                  />

                  <input
                    id="confirmPassword"
                    type={
                      showConfirmPassword
                        ? "text"
                        : "password"
                    }
                    value={confirmPassword}
                    onChange={(event) =>
                      setConfirmPassword(
                        event.target.value,
                      )
                    }
                    placeholder="Confirm new password"
                    autoComplete="new-password"
                    disabled={isLoading}
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
                    tabIndex={-1}
                    aria-label={
                      showConfirmPassword
                        ? "Hide password"
                        : "Show password"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={18} />
                    ) : (
                      <Eye size={18} />
                    )}
                  </button>
                </div>

                {confirmPassword &&
                  newPassword !==
                    confirmPassword && (
                    <span
                      className={
                        styles.fieldError
                      }
                    >
                      Passwords do not
                      match.
                    </span>
                  )}

                {passwordsMatch && (
                  <span
                    className={
                      styles.fieldSuccess
                    }
                  >
                    <CheckCircle2
                      size={14}
                    />

                    Passwords match
                  </span>
                )}
              </div>

              <button
                type="submit"
                className={
                  styles.primaryButton
                }
                disabled={
                  isLoading ||
                  newPassword.length < 6 ||
                  newPassword !==
                    confirmPassword
                }
              >
                {isLoading ? (
                  <>
                    <span
                      className={
                        styles.spinner
                      }
                    />

                    Updating Password...
                  </>
                ) : (
                  <>
                    <span>
                      Reset Password
                    </span>

                    <ArrowRight size={18} />
                  </>
                )}
              </button>

              <button
                type="button"
                className={
                  styles.secondaryButton
                }
                onClick={
                  handleBackToOtp
                }
                disabled={isLoading}
              >
                <ArrowLeft size={16} />

                Back to OTP
              </button>
            </form>
          )}

          {/* FOOTER */}

          <div
            className={styles.cardFooter}
          >
            <span>
              Remember your password?
            </span>

            <Link to="/login">
              Sign in
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

export default ForgotPassword;