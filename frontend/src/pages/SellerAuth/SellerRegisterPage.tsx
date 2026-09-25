import { FormEvent, useState } from "react";
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  LockKeyhole,
  Mail,
  Phone,
  Store,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import styles from "./SellerAuthPage.module.css";

interface SellerRegisterForm {
  sellerName: string;
  businessName: string;
  businessType: string;
  email: string;
  phone: string;
  alternatePhone: string;
  password: string;
  confirmPassword: string;

  address: string;
  city: string;
  state: string;
  pincode: string;
  country: string;

  gstNumber: string;
  panNumber: string;
  businessRegistrationNumber: string;
  fssaiNumber: string;

  bankAccountName: string;
  bankAccountNumber: string;
  ifscCode: string;
  bankName: string;

  agreeTerms: boolean;
}

interface RegisterResponse {
  message?: string;
  referenceNumber?: string;
  status?: string;
  applicationId?: string;
  application?: unknown;
}

const API_URL = "https://jihaan-cosmetics.onrender.com/api/partners/register";

const initialForm: SellerRegisterForm = {
  sellerName: "",
  businessName: "",
  businessType: "",
  email: "",
  phone: "",
  alternatePhone: "",
  password: "",
  confirmPassword: "",

  address: "",
  city: "",
  state: "",
  pincode: "",
  country: "India",

  gstNumber: "",
  panNumber: "",
  businessRegistrationNumber: "",
  fssaiNumber: "",

  bankAccountName: "",
  bankAccountNumber: "",
  ifscCode: "",
  bankName: "",

  agreeTerms: false,
};

const SellerRegisterPage = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [referenceNumber, setReferenceNumber] = useState("");
  const [applicationStatus, setApplicationStatus] = useState("");

  const [form, setForm] = useState<SellerRegisterForm>(initialForm);

  const updateField = (
    field: keyof SellerRegisterForm,
    value: string | boolean
  ) => {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const validateForm = () => {
    if (!form.sellerName.trim()) {
      return "Please enter seller full name.";
    }

    if (!form.businessName.trim()) {
      return "Please enter business name.";
    }

    if (!form.businessType) {
      return "Please select business type.";
    }

    if (!form.email.trim()) {
      return "Please enter email address.";
    }

    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) {
      return "Please enter a valid email address.";
    }

    if (!/^\d{10}$/.test(form.phone.trim())) {
      return "Please enter a valid 10-digit phone number.";
    }

    if (
      form.alternatePhone.trim() &&
      !/^\d{10}$/.test(form.alternatePhone.trim())
    ) {
      return "Please enter a valid alternate phone number.";
    }

    if (!form.address.trim()) {
      return "Please enter complete business address.";
    }

    if (!form.city.trim()) {
      return "Please enter city.";
    }

    if (!form.state.trim()) {
      return "Please enter state.";
    }

    if (!/^\d{6}$/.test(form.pincode.trim())) {
      return "Please enter a valid 6-digit pincode.";
    }

    if (
      form.gstNumber.trim() &&
      !/^[A-Z0-9]{15}$/i.test(form.gstNumber.trim())
    ) {
      return "Please enter a valid GST number.";
    }

    if (
      !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(form.panNumber.trim())
    ) {
      return "Please enter a valid PAN number.";
    }

    if (
      !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(form.ifscCode.trim())
    ) {
      return "Please enter a valid IFSC code.";
    }

    if (form.password.length < 8) {
      return "Password must contain at least 8 characters.";
    }

    if (form.password !== form.confirmPassword) {
      return "Passwords do not match.";
    }

    if (!form.agreeTerms) {
      return "Please accept the seller terms and conditions.";
    }

    return "";
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setReferenceNumber("");
    setApplicationStatus("");

    const validationError = validateForm();

    if (validationError) {
      setError(validationError);
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

          sellerName: form.sellerName.trim(),
          businessName: form.businessName.trim(),
          businessType: form.businessType,

          email: form.email.trim().toLowerCase(),
          phone: form.phone.trim(),
          alternatePhone: form.alternatePhone.trim(),

          password: form.password,

          address: {
            addressLine: form.address.trim(),
            street: form.address.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            pincode: form.pincode.trim(),
            country: form.country.trim(),
          },

          documents: {
            gstNumber: form.gstNumber.trim().toUpperCase(),
            panNumber: form.panNumber.trim().toUpperCase(),
            businessRegistrationNumber:
              form.businessRegistrationNumber.trim(),
            fssaiNumber: form.fssaiNumber.trim(),
          },

          bankDetails: {
            accountHolderName: form.bankAccountName.trim(),
            accountName: form.bankAccountName.trim(),
            accountNumber: form.bankAccountNumber.trim(),
            ifscCode: form.ifscCode.trim().toUpperCase(),
            bankName: form.bankName.trim(),
          },
        }),
      });

      const responseText = await response.text();

      let data: RegisterResponse;

      try {
        data = JSON.parse(responseText);
      } catch {
        console.error("Non-JSON backend response:", responseText);

        throw new Error(
          "Backend returned HTML instead of JSON. Check that your backend is running on port 5000 and that the route is /api/partners/register."
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Seller registration failed.");
      }

      setReferenceNumber(data.referenceNumber || "");
      setApplicationStatus(data.status || "pending");

      setSuccess(
        data.message ||
          "Registration submitted successfully. Your application is pending admin approval."
      );

      setForm(initialForm);
      setShowPassword(false);
      setShowConfirmPassword(false);

      window.scrollTo({
        top: 0,
        behavior: "smooth",
      });
    } catch (registrationError) {
      setError(
        registrationError instanceof Error
          ? registrationError.message
          : "Something went wrong. Please try again."
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

        <div className={styles.authCardWide}>
          <div className={styles.authHeader}>
            <span className={styles.eyebrow}>SELLER REGISTRATION</span>

            <h1>Become a Jihaan seller</h1>

            <p>
              Register your business and start selling your beauty products
              through Jihaan Cosmetics.
            </p>
          </div>

          {error && (
            <p className={styles.errorMessage} role="alert">
              {error}
            </p>
          )}

          {success && (
            <div className={styles.successMessage} role="status">
              <CheckCircle2 size={20} />

              <div>
                <p>{success}</p>

                {referenceNumber && (
                  <>
                    <p>
                      <strong>Application Reference Number</strong>
                    </p>

                    <p className={styles.referenceNumber}>
                      {referenceNumber}
                    </p>

                    <p>
                      Save this reference number. You can use it to check your
                      application status or contact the administrator.
                    </p>
                  </>
                )}

                {applicationStatus && (
                  <p>
                    <strong>Application Status:</strong>{" "}
                    {applicationStatus}
                  </p>
                )}

                <p>
                  You can login after your application is approved by the
                  admin.
                </p>

                <Link to="/seller/login">Go to seller login</Link>
              </div>
            </div>
          )}

          {!referenceNumber && (
            <form className={styles.authForm} onSubmit={handleSubmit}>
              <section className={styles.formSection}>
                <div className={styles.sectionHeading}>
                  <UserRound size={19} />

                  <div>
                    <h2>Owner Information</h2>
                    <p>Enter the primary contact person details.</p>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    Seller Full Name *

                    <input
                      name="sellerName"
                      value={form.sellerName}
                      onChange={(event) =>
                        updateField("sellerName", event.target.value)
                      }
                      placeholder="Enter full name"
                      autoComplete="name"
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    Business Name *

                    <input
                      name="businessName"
                      value={form.businessName}
                      onChange={(event) =>
                        updateField("businessName", event.target.value)
                      }
                      placeholder="Enter business name"
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    Business Type *

                    <select
                      name="businessType"
                      value={form.businessType}
                      onChange={(event) =>
                        updateField("businessType", event.target.value)
                      }
                      required
                    >
                      <option value="">Select business type</option>
                      <option value="individual">Individual</option>
                      <option value="proprietorship">
                        Proprietorship
                      </option>
                      <option value="partnership">Partnership</option>
                      <option value="private_limited">
                        Private Limited Company
                      </option>
                      <option value="llp">LLP</option>
                      <option value="other">Other</option>
                    </select>
                  </label>

                  <label className={styles.field}>
                    Email Address *

                    <div className={styles.inputWithIcon}>
                      <Mail size={17} />

                      <input
                        name="email"
                        type="email"
                        value={form.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                        placeholder="business@example.com"
                        autoComplete="email"
                        required
                      />
                    </div>
                  </label>

                  <label className={styles.field}>
                    Phone Number *

                    <div className={styles.inputWithIcon}>
                      <Phone size={17} />

                      <input
                        name="phone"
                        type="tel"
                        value={form.phone}
                        onChange={(event) =>
                          updateField("phone", event.target.value)
                        }
                        placeholder="Enter 10-digit phone number"
                        maxLength={10}
                        autoComplete="tel"
                        required
                      />
                    </div>
                  </label>

                  <label className={styles.field}>
                    Alternate Phone

                    <input
                      name="alternatePhone"
                      type="tel"
                      value={form.alternatePhone}
                      onChange={(event) =>
                        updateField("alternatePhone", event.target.value)
                      }
                      placeholder="Optional alternate number"
                      maxLength={10}
                    />
                  </label>
                </div>
              </section>

              <section className={styles.formSection}>
                <div className={styles.sectionHeading}>
                  <Store size={19} />

                  <div>
                    <h2>Business Address</h2>
                    <p>Provide your registered business location.</p>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <label
                    className={`${styles.field} ${styles.fullWidth}`}
                  >
                    Complete Address *

                    <textarea
                      name="address"
                      value={form.address}
                      onChange={(event) =>
                        updateField("address", event.target.value)
                      }
                      placeholder="Shop, office or warehouse address"
                      rows={3}
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    City *

                    <input
                      name="city"
                      value={form.city}
                      onChange={(event) =>
                        updateField("city", event.target.value)
                      }
                      placeholder="Enter city"
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    State *

                    <input
                      name="state"
                      value={form.state}
                      onChange={(event) =>
                        updateField("state", event.target.value)
                      }
                      placeholder="Enter state"
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    Pincode *

                    <input
                      name="pincode"
                      value={form.pincode}
                      onChange={(event) =>
                        updateField("pincode", event.target.value)
                      }
                      placeholder="Enter 6-digit pincode"
                      maxLength={6}
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    Country *

                    <input
                      name="country"
                      value={form.country}
                      onChange={(event) =>
                        updateField("country", event.target.value)
                      }
                      required
                    />
                  </label>
                </div>
              </section>

              <section className={styles.formSection}>
                <div className={styles.sectionHeading}>
                  <FileText size={19} />

                  <div>
                    <h2>Business Documents</h2>
                    <p>
                      Enter your available business and tax details.
                    </p>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    GST Number

                    <input
                      name="gstNumber"
                      value={form.gstNumber}
                      onChange={(event) =>
                        updateField("gstNumber", event.target.value)
                      }
                      placeholder="Enter GST number"
                      maxLength={15}
                    />
                  </label>

                  <label className={styles.field}>
                    PAN Number *

                    <input
                      name="panNumber"
                      value={form.panNumber}
                      onChange={(event) =>
                        updateField("panNumber", event.target.value)
                      }
                      placeholder="Enter PAN number"
                      maxLength={10}
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    Business Registration Number

                    <input
                      name="businessRegistrationNumber"
                      value={form.businessRegistrationNumber}
                      onChange={(event) =>
                        updateField(
                          "businessRegistrationNumber",
                          event.target.value
                        )
                      }
                      placeholder="Optional registration number"
                    />
                  </label>

                  <label className={styles.field}>
                    FSSAI Number

                    <input
                      name="fssaiNumber"
                      value={form.fssaiNumber}
                      onChange={(event) =>
                        updateField("fssaiNumber", event.target.value)
                      }
                      placeholder="Required for applicable products"
                    />
                  </label>
                </div>
              </section>

              <section className={styles.formSection}>
                <div className={styles.sectionHeading}>
                  <Building2 size={19} />

                  <div>
                    <h2>Bank Details</h2>
                    <p>Used for seller payments and settlements.</p>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    Account Holder Name *

                    <input
                      name="bankAccountName"
                      value={form.bankAccountName}
                      onChange={(event) =>
                        updateField("bankAccountName", event.target.value)
                      }
                      placeholder="Account holder name"
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    Bank Name *

                    <input
                      name="bankName"
                      value={form.bankName}
                      onChange={(event) =>
                        updateField("bankName", event.target.value)
                      }
                      placeholder="Bank name"
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    Account Number *

                    <input
                      name="bankAccountNumber"
                      type="password"
                      value={form.bankAccountNumber}
                      onChange={(event) =>
                        updateField(
                          "bankAccountNumber",
                          event.target.value
                        )
                      }
                      placeholder="Bank account number"
                      autoComplete="off"
                      required
                    />
                  </label>

                  <label className={styles.field}>
                    IFSC Code *

                    <input
                      name="ifscCode"
                      value={form.ifscCode}
                      onChange={(event) =>
                        updateField("ifscCode", event.target.value)
                      }
                      placeholder="Enter IFSC code"
                      maxLength={11}
                      required
                    />
                  </label>
                </div>
              </section>

              <section className={styles.formSection}>
                <div className={styles.sectionHeading}>
                  <LockKeyhole size={19} />

                  <div>
                    <h2>Account Security</h2>
                    <p>
                      Create a secure password for your seller account.
                    </p>
                  </div>
                </div>

                <div className={styles.formGrid}>
                  <label className={styles.field}>
                    Password *

                    <div className={styles.inputWithIcon}>
                      <LockKeyhole size={17} />

                      <input
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={form.password}
                        onChange={(event) =>
                          updateField("password", event.target.value)
                        }
                        placeholder="Minimum 8 characters"
                        autoComplete="new-password"
                        required
                      />

                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() =>
                          setShowPassword((current) => !current)
                        }
                        aria-label={
                          showPassword
                            ? "Hide password"
                            : "Show password"
                        }
                      >
                        {showPassword ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>
                  </label>

                  <label className={styles.field}>
                    Confirm Password *

                    <div className={styles.inputWithIcon}>
                      <LockKeyhole size={17} />

                      <input
                        name="confirmPassword"
                        type={
                          showConfirmPassword ? "text" : "password"
                        }
                        value={form.confirmPassword}
                        onChange={(event) =>
                          updateField(
                            "confirmPassword",
                            event.target.value
                          )
                        }
                        placeholder="Confirm password"
                        autoComplete="new-password"
                        required
                      />

                      <button
                        type="button"
                        className={styles.passwordToggle}
                        onClick={() =>
                          setShowConfirmPassword((current) => !current)
                        }
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={17} />
                        ) : (
                          <Eye size={17} />
                        )}
                      </button>
                    </div>
                  </label>
                </div>
              </section>

              <label className={styles.termsLabel}>
                <input
                  name="agreeTerms"
                  type="checkbox"
                  checked={form.agreeTerms}
                  onChange={(event) =>
                    updateField("agreeTerms", event.target.checked)
                  }
                  required
                />

                <span>
                  I agree to the seller terms, privacy policy and
                  verification process.
                </span>
              </label>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading
                  ? "Submitting Registration..."
                  : "Submit Registration"}

                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          )}

          <div className={styles.authFooter}>
            Already have a seller account?{" "}
            <Link to="/seller/login">Login here</Link>
          </div>
        </div>

        <p className={styles.bottomText}>
          © {new Date().getFullYear()} Jihaan Cosmetics. Seller Partner
          Portal.
        </p>
      </section>
    </main>
  );
};

export default SellerRegisterPage;