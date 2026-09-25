import {
  ChangeEvent,
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Link, useNavigate } from "react-router-dom";

import MainHeader from "../../components/header/MainHeader/MainHeader";
import Footer from "../../components/footer/Footer";

import styles from "./AccountPage.module.css";

type User = {
  id?: string;
  _id?: string;
  name: string;
  email: string;
  phone?: string;
  profileImage?: string;
  role?: string;
  isEmailVerified?: boolean;
};

type AccountResponse = {
  success: boolean;
  user: User;
  message?: string;
};

const API_BASE_URL = String(
  import.meta.env.VITE_API_BASE_URL || "https://jihaan-cosmetics.onrender.com",
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

const getStoredToken = () => {
  return localStorage.getItem("jihaan_auth_token") || "";
};

const getStoredUser = (): User | null => {
  try {
    const storedUser = localStorage.getItem("jihaan_current_user");

    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

const getImageUrl = (imagePath?: string) => {
  if (!imagePath) return "";

  if (imagePath.startsWith("http")) {
    return imagePath;
  }

  return `${API_BASE_URL}${
    imagePath.startsWith("/") ? "" : "/"
  }${imagePath}`;
};

const AccountPage = () => {
  const navigate = useNavigate();

  const [user, setUser] = useState<User | null>(getStoredUser);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  const [activeTab, setActiveTab] = useState<"profile" | "password">(
    "profile",
  );

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileImage, setProfileImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const token = useMemo(getStoredToken, []);

  useEffect(() => {
    if (!token) {
      navigate("/login");
      return;
    }

    fetchAccount();
  }, [token, navigate]);

  useEffect(() => {
    return () => {
      if (previewImage.startsWith("blob:")) {
        URL.revokeObjectURL(previewImage);
      }
    };
  }, [previewImage]);

  const fetchAccount = async () => {
    try {
      setLoading(true);
      setError("");

      const accountUrl = `${API_BASE_URL}/api/account/me`;

      const response = await fetch(accountUrl, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        credentials: "include",
      });

      const data: AccountResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load account");
      }

      setUser(data.user);
      setName(data.user.name || "");
      setPhone(data.user.phone || "");

      localStorage.setItem(
        "jihaan_current_user",
        JSON.stringify(data.user),
      );
    } catch (requestError) {
      const errorMessage =
        requestError instanceof Error
          ? requestError.message
          : "Unable to load account";

      setError(errorMessage);

      if (
        errorMessage.toLowerCase().includes("login") ||
        errorMessage.toLowerCase().includes("token") ||
        errorMessage.toLowerCase().includes("unauthorized")
      ) {
        handleLogout();
      }
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (
    event: ChangeEvent<HTMLInputElement>,
  ) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/webp",
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Only JPG, PNG, and WEBP images are allowed");
      return;
    }

    if (selectedFile.size > 2 * 1024 * 1024) {
      setError("Profile image must be smaller than 2 MB");
      return;
    }

    if (previewImage.startsWith("blob:")) {
      URL.revokeObjectURL(previewImage);
    }

    setProfileImage(selectedFile);
    setPreviewImage(URL.createObjectURL(selectedFile));
    setError("");
    setMessage("");
  };

  const handleProfileSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (name.trim().length < 2) {
      setError("Name must contain at least 2 characters");
      return;
    }

    if (!/^[6-9][0-9]{9}$/.test(phone.trim())) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    try {
      setSavingProfile(true);

      const formData = new FormData();

      formData.append("name", name.trim());
      formData.append("phone", phone.trim());

      if (profileImage) {
        formData.append("profileImage", profileImage);
      }

      const response = await fetch(
        `${API_BASE_URL}/api/account/profile`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: formData,
        },
      );

      const data: AccountResponse = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to update profile");
      }

      setUser(data.user);
      setProfileImage(null);
      setPreviewImage("");

      localStorage.setItem(
        "jihaan_current_user",
        JSON.stringify(data.user),
      );

      setMessage(data.message || "Profile updated successfully");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update profile",
      );
    } finally {
      setSavingProfile(false);
    }
  };

  const handlePasswordSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (newPassword.length < 4) {
      setError("New password must contain at least 4 characters");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match");
      return;
    }

    try {
      setChangingPassword(true);

      const response = await fetch(
        `${API_BASE_URL}/api/account/change-password`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          credentials: "include",
          body: JSON.stringify({
            currentPassword,
            newPassword,
            confirmPassword,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to change password");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      setMessage(data.message || "Password changed successfully");
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to change password",
      );
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch(`${API_BASE_URL}/api/account/logout`, {
        method: "POST",
        credentials: "include",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch {
      // Clear local session even if logout request fails
    } finally {
      localStorage.removeItem("jihaan_auth_token");
      localStorage.removeItem("jihaan_current_user");
      navigate("/login");
    }
  };

  if (loading) {
    return (
      <>
        <MainHeader />

        <main className={styles.page}>
          <div className={styles.loadingCard}>
            <span className={styles.loader} />
            <p>Loading your account...</p>
          </div>
        </main>

        <Footer />
      </>
    );
  }

  return (
    <>
      <MainHeader />

      <main className={styles.page}>
        <div className={styles.container}>
          <div className={styles.breadcrumb}>
            <Link to="/">Home</Link>
            <span>/</span>
            <span>My Account</span>
          </div>

          <section className={styles.headingSection}>
            <div>
              <p className={styles.eyebrow}>PERSONAL SPACE</p>

              <h1>My Account</h1>

              <p className={styles.subtitle}>
                Manage your personal information and account security.
              </p>
            </div>

            <button
              type="button"
              className={styles.logoutButton}
              onClick={handleLogout}
            >
              Logout
            </button>
          </section>

          {message && (
            <div className={styles.successMessage} role="status">
              {message}
            </div>
          )}

          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}

          <section className={styles.accountLayout}>
            <aside className={styles.sidebar}>
              <div className={styles.profileSummary}>
                <div className={styles.avatar}>
                  {previewImage || user?.profileImage ? (
                    <img
                      src={
                        previewImage ||
                        getImageUrl(user?.profileImage)
                      }
                      alt={user?.name || "Profile"}
                    />
                  ) : (
                    <span>
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </span>
                  )}
                </div>

                <h2>{user?.name || "Customer"}</h2>
                <p>{user?.email}</p>
              </div>

              <nav className={styles.accountNav}>
                <button
                  type="button"
                  className={
                    activeTab === "profile"
                      ? `${styles.navButton} ${styles.activeNavButton}`
                      : styles.navButton
                  }
                  onClick={() => {
                    setActiveTab("profile");
                    setMessage("");
                    setError("");
                  }}
                >
                  <span>01</span>
                  Personal Information
                </button>

                <button
                  type="button"
                  className={
                    activeTab === "password"
                      ? `${styles.navButton} ${styles.activeNavButton}`
                      : styles.navButton
                  }
                  onClick={() => {
                    setActiveTab("password");
                    setMessage("");
                    setError("");
                  }}
                >
                  <span>02</span>
                  Password & Security
                </button>
              </nav>
            </aside>

            <div className={styles.contentCard}>
              {activeTab === "profile" && (
                <form
                  className={styles.form}
                  onSubmit={handleProfileSubmit}
                >
                  <div className={styles.formHeader}>
                    <div>
                      <p className={styles.eyebrow}>YOUR DETAILS</p>
                      <h2>Personal Information</h2>
                    </div>

                    <span className={styles.statusBadge}>
                      {user?.isEmailVerified
                        ? "Verified account"
                        : "Active account"}
                    </span>
                  </div>

                  <div className={styles.imageSection}>
                    <div className={styles.largeAvatar}>
                      {previewImage || user?.profileImage ? (
                        <img
                          src={
                            previewImage ||
                            getImageUrl(user?.profileImage)
                          }
                          alt="Profile preview"
                        />
                      ) : (
                        <span>
                          {user?.name?.charAt(0).toUpperCase() || "U"}
                        </span>
                      )}
                    </div>

                    <div className={styles.imageInfo}>
                      <h3>Profile photo</h3>

                      <p>
                        Use a JPG, PNG, or WEBP image up to 2 MB.
                      </p>

                      <label className={styles.uploadButton}>
                        Choose image

                        <input
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          onChange={handleImageChange}
                        />
                      </label>
                    </div>
                  </div>

                  <div className={styles.formGrid}>
                    <label className={styles.field}>
                      <span>Full name</span>

                      <input
                        type="text"
                        value={name}
                        onChange={(event) =>
                          setName(event.target.value)
                        }
                        placeholder="Enter your full name"
                        maxLength={80}
                        required
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Email address</span>

                      <input
                        type="email"
                        value={user?.email || ""}
                        disabled
                      />

                      <small>
                        Email address cannot be changed here.
                      </small>
                    </label>

                    <label className={styles.field}>
                      <span>Mobile number</span>

                      <input
                        type="tel"
                        value={phone}
                        onChange={(event) =>
                          setPhone(event.target.value)
                        }
                        placeholder="Enter 10-digit mobile number"
                        maxLength={10}
                        required
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Account type</span>

                      <input
                        type="text"
                        value={
                          user?.role === "superadmin"
                            ? "Admin"
                            : "Customer"
                        }
                        disabled
                      />
                    </label>
                  </div>

                  <div className={styles.formFooter}>
                    <p>
                      Keep your information updated for a smoother
                      checkout.
                    </p>

                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={savingProfile}
                    >
                      {savingProfile ? "Saving..." : "Save changes"}
                    </button>
                  </div>
                </form>
              )}

              {activeTab === "password" && (
                <form
                  className={styles.form}
                  onSubmit={handlePasswordSubmit}
                >
                  <div className={styles.formHeader}>
                    <div>
                      <p className={styles.eyebrow}>
                        ACCOUNT SECURITY
                      </p>

                      <h2>Password & Security</h2>
                    </div>
                  </div>

                  <div className={styles.securityNotice}>
                    Choose a strong password that you do not use on
                    other websites.
                  </div>

                  <div className={styles.passwordFields}>
                    <label className={styles.field}>
                      <span>Current password</span>

                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(event) =>
                          setCurrentPassword(event.target.value)
                        }
                        placeholder="Enter current password"
                        required
                      />
                    </label>

                    <label className={styles.field}>
                      <span>New password</span>

                      <input
                        type="password"
                        value={newPassword}
                        onChange={(event) =>
                          setNewPassword(event.target.value)
                        }
                        placeholder="Enter new password"
                        minLength={4}
                        required
                      />
                    </label>

                    <label className={styles.field}>
                      <span>Confirm new password</span>

                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(event) =>
                          setConfirmPassword(event.target.value)
                        }
                        placeholder="Confirm new password"
                        minLength={4}
                        required
                      />
                    </label>
                  </div>

                  <div className={styles.formFooter}>
                    <p>
                      Your password will be updated immediately.
                    </p>

                    <button
                      type="submit"
                      className={styles.primaryButton}
                      disabled={changingPassword}
                    >
                      {changingPassword
                        ? "Updating..."
                        : "Update password"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
};

export default AccountPage;