import {
  useState,
} from "react";

import {
  Link,
  useNavigate,
} from "react-router-dom";

import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  LockKeyhole,
  MessageCircle,
  ShieldCheck,
} from "lucide-react";

import styles from "./ForgotPasswordPage.module.css";

const API_BASE_URL =
  import.meta.env
    .VITE_API_BASE_URL;

const ForgotPasswordPage =
  () => {
    const navigate =
      useNavigate();

    const [
      step,
      setStep,
    ] = useState(
      "identifier",
    );

    const [
      identifier,
      setIdentifier,
    ] = useState(
      "",
    );

    const [
      otp,
      setOtp,
    ] = useState(
      "",
    );

    const [
      resetToken,
      setResetToken,
    ] = useState(
      "",
    );

    const [
      newPassword,
      setNewPassword,
    ] = useState(
      "",
    );

    const [
      confirmPassword,
      setConfirmPassword,
    ] = useState(
      "",
    );

    const [
      showPassword,
      setShowPassword,
    ] = useState(
      false,
    );

    const [
      showConfirmPassword,
      setShowConfirmPassword,
    ] = useState(
      false,
    );

    const [
      loading,
      setLoading,
    ] = useState(
      false,
    );

    const [
      error,
      setError,
    ] = useState(
      "",
    );

    const [
      success,
      setSuccess,
    ] = useState(
      "",
    );

    const [
      resendCooldown,
      setResendCooldown,
    ] = useState(
      0,
    );

    /* =======================================================
       VALIDATE IDENTIFIER
    ======================================================= */

    const validateIdentifier =
      () => {
        const value =
          identifier.trim();

        if (!value) {
          setError(
            "Please enter your email or mobile number.",
          );

          return false;
        }

        if (
          value.includes("@")
        ) {
          const emailRegex =
            /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

          if (
            !emailRegex.test(
              value,
            )
          ) {
            setError(
              "Please enter a valid email address.",
            );

            return false;
          }
        } else {
          const phone =
            value.replace(
              /\D/g,
              "",
            );

          const normalized =
            phone.startsWith(
              "91",
            ) &&
            phone.length ===
              12
              ? phone.slice(2)
              : phone;

          if (
            !/^[6-9][0-9]{9}$/.test(
              normalized,
            )
          ) {
            setError(
              "Please enter a valid 10-digit mobile number.",
            );

            return false;
          }
        }

        return true;
      };

    /* =======================================================
       SEND FORGOT PASSWORD OTP
    ======================================================= */

    const handleSendOtp =
      async (
        event,
      ) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (
          !validateIdentifier()
        ) {
          return;
        }

        setLoading(true);

        try {
          const response =
            await fetch(
              `${API_BASE_URL}/auth/forgot-password`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    identifier:
                      identifier.trim(),
                  }),
              },
            );

          const data =
            await response
              .json()
              .catch(
                () => ({}),
              );

          if (
            !response.ok
          ) {
            throw new Error(
              data?.message ||
                "Unable to send OTP.",
            );
          }

          /*
           * Backend intentionally returns a generic
           * response to prevent account enumeration.
           */

          setSuccess(
            data?.message ||
              "If an account exists, an OTP has been sent to the registered WhatsApp number.",
          );

          setStep(
            "otp",
          );

          startCooldown(
            60,
          );
        } catch (err) {
          setError(
            err?.message ||
              "Unable to send OTP. Please try again.",
          );
        } finally {
          setLoading(false);
        }
      };

    /* =======================================================
       VERIFY OTP
    ======================================================= */

    const handleVerifyOtp =
      async (
        event,
      ) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        const cleanOtp =
          otp.replace(
            /\D/g,
            "",
          );

        if (
          cleanOtp.length !==
          6
        ) {
          setError(
            "Please enter the 6-digit OTP.",
          );

          return;
        }

        setLoading(true);

        try {
          const response =
            await fetch(
              `${API_BASE_URL}/auth/forgot-password/verify-otp`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    identifier:
                      identifier.trim(),

                    otp:
                      cleanOtp,
                  }),
              },
            );

          const data =
            await response
              .json()
              .catch(
                () => ({}),
              );

          if (
            !response.ok
          ) {
            throw new Error(
              data?.message ||
                "Invalid or expired OTP.",
            );
          }

          if (
            !data?.resetToken
          ) {
            throw new Error(
              "Password reset session could not be created.",
            );
          }

          setResetToken(
            data.resetToken,
          );

          setSuccess(
            "OTP verified successfully.",
          );

          setStep(
            "password",
          );
        } catch (err) {
          setError(
            err?.message ||
              "Unable to verify OTP.",
          );
        } finally {
          setLoading(false);
        }
      };

    /* =======================================================
       RESET PASSWORD
    ======================================================= */

    const handleResetPassword =
      async (
        event,
      ) => {
        event.preventDefault();

        setError("");
        setSuccess("");

        if (
          newPassword.length <
          4
        ) {
          setError(
            "Password must contain at least 4 characters.",
          );

          return;
        }

        if (
          newPassword !==
          confirmPassword
        ) {
          setError(
            "Passwords do not match.",
          );

          return;
        }

        if (!resetToken) {
          setError(
            "Password reset session is missing. Please start again.",
          );

          return;
        }

        setLoading(true);

        try {
          const response =
            await fetch(
              `${API_BASE_URL}/auth/reset-password`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    resetToken,

                    newPassword,

                    confirmPassword,
                  }),
              },
            );

          const data =
            await response
              .json()
              .catch(
                () => ({}),
              );

          if (
            !response.ok
          ) {
            throw new Error(
              data?.message ||
                "Unable to reset password.",
            );
          }

          setSuccess(
            "Your password has been reset successfully.",
          );

          setStep(
            "success",
          );
        } catch (err) {
          setError(
            err?.message ||
              "Unable to reset password.",
          );
        } finally {
          setLoading(false);
        }
      };

    /* =======================================================
       RESEND OTP
    ======================================================= */

    const handleResendOtp =
      async () => {
        if (
          resendCooldown >
          0
        ) {
          return;
        }

        setError("");
        setSuccess("");
        setLoading(true);

        try {
          const response =
            await fetch(
              `${API_BASE_URL}/auth/forgot-password`,
              {
                method:
                  "POST",

                headers: {
                  "Content-Type":
                    "application/json",
                },

                body:
                  JSON.stringify({
                    identifier:
                      identifier.trim(),
                  }),
              },
            );

          const data =
            await response
              .json()
              .catch(
                () => ({}),
              );

          if (
            !response.ok
          ) {
            throw new Error(
              data?.message ||
                "Unable to resend OTP.",
            );
          }

          setSuccess(
            data?.message ||
              "A new OTP has been sent.",
          );

          setOtp("");

          startCooldown(
            60,
          );
        } catch (err) {
          setError(
            err?.message ||
              "Unable to resend OTP.",
          );
        } finally {
          setLoading(false);
        }
      };

    /* =======================================================
       COOLDOWN
    ======================================================= */

    const startCooldown =
      (
        seconds,
      ) => {
        setResendCooldown(
          seconds,
        );

        const interval =
          setInterval(
            () => {
              setResendCooldown(
                (
                  previous,
                ) => {
                  if (
                    previous <=
                    1
                  ) {
                    clearInterval(
                      interval,
                    );

                    return 0;
                  }

                  return (
                    previous -
                    1
                  );
                },
              );
            },
            1000,
          );
      };

    /* =======================================================
       RESET FLOW
    ======================================================= */

    const restartFlow =
      () => {
        setStep(
          "identifier",
        );

        setIdentifier("");
        setOtp("");
        setResetToken("");
        setNewPassword("");
        setConfirmPassword("");
        setError("");
        setSuccess("");
      };

    /* =======================================================
       RENDER
    ======================================================= */

    return (
      <div
        className={
          styles.page
        }
      >
        <div
          className={
            styles.backgroundGlow
          }
        />

        <main
          className={
            styles.container
          }
        >
          <div
            className={
              styles.card
            }
          >
            {/* =================================================
                BRAND
            ================================================= */}

            <div
              className={
                styles.brand
              }
            >
              <div
                className={
                  styles.logo
                }
              >
                J
              </div>

              <div>
                <h1>
                  Jihaan Cosmetics
                </h1>

                <p>
                  Beauty made
                  simple.
                </p>
              </div>
            </div>

            {/* =================================================
                PROGRESS
            ================================================= */}

            {step !==
              "success" && (
              <div
                className={
                  styles.progress
                }
              >
                <div
                  className={
                    step ===
                      "identifier"
                      ? `${styles.progressItem} ${styles.active}`
                      : styles.progressItem
                  }
                >
                  <span>
                    1
                  </span>

                  <small>
                    Account
                  </small>
                </div>

                <div
                  className={
                    styles.progressLine
                  }
                />

                <div
                  className={
                    step ===
                      "otp"
                      ? `${styles.progressItem} ${styles.active}`
                      : step ===
                        "password"
                      ? `${styles.progressItem} ${styles.completed}`
                      : styles.progressItem
                  }
                >
                  <span>
                    2
                  </span>

                  <small>
                    Verify
                  </small>
                </div>

                <div
                  className={
                    styles.progressLine
                  }
                />

                <div
                  className={
                    step ===
                    "password"
                      ? `${styles.progressItem} ${styles.active}`
                      : styles.progressItem
                  }
                >
                  <span>
                    3
                  </span>

                  <small>
                    Password
                  </small>
                </div>
              </div>
            )}

            {/* =================================================
                STEP 1
            ================================================= */}

            {step ===
              "identifier" && (
              <>
                <div
                  className={
                    styles.heading
                  }
                >
                  <div
                    className={
                      styles.iconCircle
                    }
                  >
                    <KeyRound
                      size={
                        25
                      }
                    />
                  </div>

                  <h2>
                    Forgot your
                    password?
                  </h2>

                  <p>
                    Enter your registered
                    email or mobile number.
                    We'll send a verification
                    code to your WhatsApp.
                  </p>
                </div>

                <form
                  onSubmit={
                    handleSendOtp
                  }
                  className={
                    styles.form
                  }
                >
                  <label
                    htmlFor="identifier"
                  >
                    Email or mobile
                    number
                  </label>

                  <input
                    id="identifier"
                    type="text"
                    value={
                      identifier
                    }
                    onChange={(
                      event,
                    ) => {
                      setIdentifier(
                        event
                          .target
                          .value,
                      );

                      setError(
                        "",
                      );
                    }}
                    placeholder="Enter email or mobile number"
                    autoComplete="username"
                    disabled={
                      loading
                    }
                  />

                  <button
                    type="submit"
                    disabled={
                      loading
                    }
                    className={
                      styles.primaryButton
                    }
                  >
                    {loading ? (
                      <>
                        <Loader2
                          size={
                            18
                          }
                          className={
                            styles.spinner
                          }
                        />

                        Sending OTP...
                      </>
                    ) : (
                      <>
                        <MessageCircle
                          size={
                            18
                          }
                        />

                        Send WhatsApp OTP
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* =================================================
                STEP 2
            ================================================= */}

            {step ===
              "otp" && (
              <>
                <div
                  className={
                    styles.heading
                  }
                >
                  <div
                    className={
                      styles.iconCircle
                    }
                  >
                    <MessageCircle
                      size={
                        25
                      }
                    />
                  </div>

                  <h2>
                    Verify your
                    number
                  </h2>

                  <p>
                    Enter the 6-digit OTP
                    sent to your registered
                    WhatsApp number.
                  </p>
                </div>

                <form
                  onSubmit={
                    handleVerifyOtp
                  }
                  className={
                    styles.form
                  }
                >
                  <label
                    htmlFor="otp"
                  >
                    Verification
                    code
                  </label>

                  <input
                    id="otp"
                    type="text"
                    inputMode="numeric"
                    maxLength={
                      6
                    }
                    value={
                      otp
                    }
                    onChange={(
                      event,
                    ) => {
                      const value =
                        event.target.value.replace(
                          /\D/g,
                          "",
                        );

                      setOtp(
                        value,
                      );

                      setError(
                        "",
                      );
                    }}
                    placeholder="Enter 6-digit OTP"
                    autoComplete="one-time-code"
                    disabled={
                      loading
                    }
                    className={
                      styles.otpInput
                    }
                  />

                  <button
                    type="submit"
                    disabled={
                      loading
                    }
                    className={
                      styles.primaryButton
                    }
                  >
                    {loading ? (
                      <>
                        <Loader2
                          size={
                            18
                          }
                          className={
                            styles.spinner
                          }
                        />

                        Verifying...
                      </>
                    ) : (
                      <>
                        <ShieldCheck
                          size={
                            18
                          }
                        />

                        Verify OTP
                      </>
                    )}
                  </button>

                  <div
                    className={
                      styles.resendRow
                    }
                  >
                    {resendCooldown >
                    0 ? (
                      <span>
                        Resend OTP in{" "}
                        <strong>
                          {
                            resendCooldown
                          }
                          s
                        </strong>
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={
                          handleResendOtp
                        }
                        disabled={
                          loading
                        }
                        className={
                          styles.textButton
                        }
                      >
                        Resend OTP
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    className={
                      styles.backButton
                    }
                    onClick={
                      restartFlow
                    }
                    disabled={
                      loading
                    }
                  >
                    <ArrowLeft
                      size={
                        16
                      }
                    />

                    Change email/mobile
                  </button>
                </form>
              </>
            )}

            {/* =================================================
                STEP 3
            ================================================= */}

            {step ===
              "password" && (
              <>
                <div
                  className={
                    styles.heading
                  }
                >
                  <div
                    className={
                      styles.iconCircle
                    }
                  >
                    <LockKeyhole
                      size={
                        25
                      }
                    />
                  </div>

                  <h2>
                    Create new
                    password
                  </h2>

                  <p>
                    Choose a new password
                    for your Jihaan Cosmetics
                    account.
                  </p>
                </div>

                <form
                  onSubmit={
                    handleResetPassword
                  }
                  className={
                    styles.form
                  }
                >
                  <label
                    htmlFor="newPassword"
                  >
                    New password
                  </label>

                  <div
                    className={
                      styles.passwordWrapper
                    }
                  >
                    <input
                      id="newPassword"
                      type={
                        showPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        newPassword
                      }
                      onChange={(
                        event,
                      ) => {
                        setNewPassword(
                          event
                            .target
                            .value,
                        );

                        setError(
                          "",
                        );
                      }}
                      placeholder="Enter new password"
                      autoComplete="new-password"
                      disabled={
                        loading
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowPassword(
                          (
                            value,
                          ) =>
                            !value,
                        )
                      }
                      className={
                        styles.eyeButton
                      }
                      tabIndex={
                        -1
                      }
                    >
                      {showPassword ? (
                        <EyeOff
                          size={
                            18
                          }
                        />
                      ) : (
                        <Eye
                          size={
                            18
                          }
                        />
                      )}
                    </button>
                  </div>

                  <span
                    className={
                      styles.helpText
                    }
                  >
                    Minimum 4 characters.
                  </span>

                  <label
                    htmlFor="confirmPassword"
                  >
                    Confirm password
                  </label>

                  <div
                    className={
                      styles.passwordWrapper
                    }
                  >
                    <input
                      id="confirmPassword"
                      type={
                        showConfirmPassword
                          ? "text"
                          : "password"
                      }
                      value={
                        confirmPassword
                      }
                      onChange={(
                        event,
                      ) => {
                        setConfirmPassword(
                          event
                            .target
                            .value,
                        );

                        setError(
                          "",
                        );
                      }}
                      placeholder="Confirm new password"
                      autoComplete="new-password"
                      disabled={
                        loading
                      }
                    />

                    <button
                      type="button"
                      onClick={() =>
                        setShowConfirmPassword(
                          (
                            value,
                          ) =>
                            !value,
                        )
                      }
                      className={
                        styles.eyeButton
                      }
                      tabIndex={
                        -1
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff
                          size={
                            18
                          }
                        />
                      ) : (
                        <Eye
                          size={
                            18
                          }
                        />
                      )}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={
                      loading
                    }
                    className={
                      styles.primaryButton
                    }
                  >
                    {loading ? (
                      <>
                        <Loader2
                          size={
                            18
                          }
                          className={
                            styles.spinner
                          }
                        />

                        Resetting password...
                      </>
                    ) : (
                      <>
                        <LockKeyhole
                          size={
                            18
                          }
                        />

                        Reset Password
                      </>
                    )}
                  </button>
                </form>
              </>
            )}

            {/* =================================================
                SUCCESS
            ================================================= */}

            {step ===
              "success" && (
              <div
                className={
                  styles.successScreen
                }
              >
                <div
                  className={
                    styles.successIcon
                  }
                >
                  <CheckCircle2
                    size={
                      42
                    }
                  />
                </div>

                <h2>
                  Password reset
                  successfully
                </h2>

                <p>
                  Your Jihaan Cosmetics
                  password has been updated.
                  You can now login with your
                  new password.
                </p>

                <button
                  type="button"
                  className={
                    styles.primaryButton
                  }
                  onClick={() =>
                    navigate(
                      "/login",
                    )
                  }
                >
                  Continue to Login
                </button>
              </div>
            )}

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div
                className={
                  styles.errorMessage
                }
              >
                {error}
              </div>
            )}

            {/* =================================================
                SUCCESS MESSAGE
            ================================================= */}

            {success &&
              step !==
                "success" && (
                <div
                  className={
                    styles.successMessage
                  }
                >
                  <CheckCircle2
                    size={
                      17
                    }
                  />

                  <span>
                    {success}
                  </span>
                </div>
              )}

            {/* =================================================
                LOGIN LINK
            ================================================= */}

            {step !==
              "success" && (
              <div
                className={
                  styles.footer
                }
              >
                <span>
                  Remember your
                  password?
                </span>

                <Link
                  to="/login"
                  className={
                    styles.loginLink
                  }
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  };

export default ForgotPasswordPage;