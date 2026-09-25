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
  MapPin,
  Phone,
  Truck,
  UserRound,
} from "lucide-react";
import { Link } from "react-router-dom";
import styles from "./LogisticPartnerAuthPage.module.css";

interface RegisterForm {
  partnerName: string;
  companyName: string;
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
  vehicleType: string;
  vehicleNumber: string;
  serviceArea: string;
  deliveryCapacity: string;
  gstNumber: string;
  panNumber: string;
  drivingLicenseNumber: string;
  vehicleRcNumber: string;
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
}

const API_URL = "https://jihaan-cosmetics.onrender.com/api/partners/register";

const initialForm: RegisterForm = {
  partnerName: "",
  companyName: "",
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
  vehicleType: "",
  vehicleNumber: "",
  serviceArea: "",
  deliveryCapacity: "",
  gstNumber: "",
  panNumber: "",
  drivingLicenseNumber: "",
  vehicleRcNumber: "",
  bankAccountName: "",
  bankAccountNumber: "",
  ifscCode: "",
  bankName: "",
  agreeTerms: false,
};

export default function LogisticPartnerRegisterPage() {
  const [form, setForm] = useState<RegisterForm>(initialForm);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [referenceNumber, setReferenceNumber] = useState("");

  const updateField = (
    field: keyof RegisterForm,
    value: string | boolean
  ) => {
    setForm((previous) => ({
      ...previous,
      [field]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setError("");
    setSuccess("");
    setReferenceNumber("");

    const cleanEmail = form.email.trim().toLowerCase();
    const cleanPhone = form.phone.trim();

    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (form.password.length < 8) {
      setError("Password must contain at least 8 characters.");
      return;
    }

    if (!/^\d{10}$/.test(cleanPhone)) {
      setError("Please enter a valid 10-digit primary phone number.");
      return;
    }

    if (!/^\d{6}$/.test(form.pincode.trim())) {
      setError("Please enter a valid 6-digit pincode.");
      return;
    }

    if (!form.agreeTerms) {
      setError("Please accept the terms and conditions.");
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

          partnerName: form.partnerName.trim(),
          businessName: form.companyName.trim(),
          companyName: form.companyName.trim(),
          businessType: form.businessType,
          email: cleanEmail,
          phone: cleanPhone,
          alternatePhone: form.alternatePhone.trim(),
          password: form.password,

          address: {
            street: form.address.trim(),
            addressLine: form.address.trim(),
            city: form.city.trim(),
            state: form.state.trim(),
            pincode: form.pincode.trim(),
            country: form.country.trim(),
          },

          logistics: {
            vehicleType: form.vehicleType,
            vehicleNumber: form.vehicleNumber.trim().toUpperCase(),
            serviceArea: form.serviceArea.trim(),
            deliveryCapacity: form.deliveryCapacity.trim(),
          },

          documents: {
            gstNumber: form.gstNumber.trim().toUpperCase(),
            panNumber: form.panNumber.trim().toUpperCase(),
            drivingLicenseNumber:
              form.drivingLicenseNumber.trim().toUpperCase(),
            vehicleRcNumber: form.vehicleRcNumber.trim().toUpperCase(),
          },

          bankDetails: {
            accountName: form.bankAccountName.trim(),
            accountHolderName: form.bankAccountName.trim(),
            accountNumber: form.bankAccountNumber.trim(),
            ifscCode: form.ifscCode.trim().toUpperCase(),
            bankName: form.bankName.trim(),
          },
        }),
      });

      const responseText = await response.text();

      let data: RegisterResponse = {};

      try {
        data = responseText
          ? (JSON.parse(responseText) as RegisterResponse)
          : {};
      } catch {
        console.error("Non-JSON response received from backend:", responseText);

        throw new Error(
          "Backend returned an invalid response. Check the API URL and backend server."
        );
      }

      if (!response.ok) {
        throw new Error(data.message || "Registration failed.");
      }

      setReferenceNumber(data.referenceNumber || "");

      setSuccess(
        data.message ||
          "Registration submitted successfully. Your application is pending admin approval."
      );

      setForm(initialForm);
      setShowPassword(false);
      setShowConfirmPassword(false);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong while submitting your registration."
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

        <div className={styles.authCardWide}>
          <div className={styles.cardHeader}>
            <span className={styles.eyebrow}>Partner onboarding</span>

            <h2>Create logistic partner account</h2>

            <p>
              Submit your business, vehicle, document, and banking details to
              join our delivery network.
            </p>
          </div>

          {error && (
            <div className={styles.errorMessage} role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className={styles.successMessage} role="status">
              <CheckCircle2 size={20} aria-hidden="true" />

              <div>
                <p>{success}</p>

                {referenceNumber && (
                  <>
                    <p>
                      <strong>Application Reference Number:</strong>
                    </p>

                    <p className={styles.referenceNumber}>
                      {referenceNumber}
                    </p>

                    <p>
                      Save this reference number. You will need it to check
                      your application status or contact the administrator.
                    </p>
                  </>
                )}

                <p>
                  You can login after your application is approved by the
                  admin.
                </p>

                <Link to="/logistic-partner/login">
                  Go to logistic partner login
                </Link>
              </div>
            </div>
          )}

          {!referenceNumber && (
            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.formSection}>
                <div className={styles.sectionTitle}>
                  <UserRound size={18} aria-hidden="true" />
                  <h3>Personal information</h3>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label htmlFor="partnerName">Partner full name *</label>

                    <div className={styles.inputWrapper}>
                      <UserRound size={18} aria-hidden="true" />

                      <input
                        id="partnerName"
                        name="partnerName"
                        type="text"
                        placeholder="Enter your full name"
                        value={form.partnerName}
                        onChange={(event) =>
                          updateField("partnerName", event.target.value)
                        }
                        autoComplete="name"
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="companyName">Company name *</label>

                    <div className={styles.inputWrapper}>
                      <Building2 size={18} aria-hidden="true" />

                      <input
                        id="companyName"
                        name="companyName"
                        type="text"
                        placeholder="Enter company name"
                        value={form.companyName}
                        onChange={(event) =>
                          updateField("companyName", event.target.value)
                        }
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="businessType">Business type *</label>

                    <select
                      id="businessType"
                      name="businessType"
                      value={form.businessType}
                      onChange={(event) =>
                        updateField("businessType", event.target.value)
                      }
                      required
                    >
                      <option value="">Select business type</option>
                      <option value="individual">Individual partner</option>
                      <option value="proprietorship">Proprietorship</option>
                      <option value="partnership">Partnership</option>
                      <option value="private-limited">
                        Private Limited Company
                      </option>
                      <option value="llp">LLP</option>
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="email">Email address *</label>

                    <div className={styles.inputWrapper}>
                      <Mail size={18} aria-hidden="true" />

                      <input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="partner@example.com"
                        value={form.email}
                        onChange={(event) =>
                          updateField("email", event.target.value)
                        }
                        autoComplete="email"
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="phone">Primary phone number *</label>

                    <div className={styles.inputWrapper}>
                      <Phone size={18} aria-hidden="true" />

                      <input
                        id="phone"
                        name="phone"
                        type="tel"
                        placeholder="Enter 10-digit phone number"
                        value={form.phone}
                        onChange={(event) =>
                          updateField("phone", event.target.value)
                        }
                        maxLength={10}
                        autoComplete="tel"
                        required
                      />
                    </div>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="alternatePhone">Alternate phone</label>

                    <div className={styles.inputWrapper}>
                      <Phone size={18} aria-hidden="true" />

                      <input
                        id="alternatePhone"
                        name="alternatePhone"
                        type="tel"
                        placeholder="Alternate phone number"
                        value={form.alternatePhone}
                        onChange={(event) =>
                          updateField("alternatePhone", event.target.value)
                        }
                        maxLength={10}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <div className={styles.sectionTitle}>
                  <LockKeyhole size={18} aria-hidden="true" />
                  <h3>Account security</h3>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label htmlFor="password">Password *</label>

                    <div className={styles.inputWrapper}>
                      <LockKeyhole size={18} aria-hidden="true" />

                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="Minimum 8 characters"
                        value={form.password}
                        onChange={(event) =>
                          updateField("password", event.target.value)
                        }
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />

                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() =>
                          setShowPassword((value) => !value)
                        }
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

                  <div className={styles.field}>
                    <label htmlFor="confirmPassword">Confirm password *</label>

                    <div className={styles.inputWrapper}>
                      <LockKeyhole size={18} aria-hidden="true" />

                      <input
                        id="confirmPassword"
                        name="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="Confirm your password"
                        value={form.confirmPassword}
                        onChange={(event) =>
                          updateField("confirmPassword", event.target.value)
                        }
                        autoComplete="new-password"
                        minLength={8}
                        required
                      />

                      <button
                        type="button"
                        className={styles.iconButton}
                        onClick={() =>
                          setShowConfirmPassword((value) => !value)
                        }
                        aria-label={
                          showConfirmPassword
                            ? "Hide confirm password"
                            : "Show confirm password"
                        }
                        aria-pressed={showConfirmPassword}
                      >
                        {showConfirmPassword ? (
                          <EyeOff size={18} aria-hidden="true" />
                        ) : (
                          <Eye size={18} aria-hidden="true" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <div className={styles.sectionTitle}>
                  <MapPin size={18} aria-hidden="true" />
                  <h3>Business address</h3>
                </div>

                <div className={styles.formGrid}>
                  <div className={`${styles.field} ${styles.fullWidth}`}>
                    <label htmlFor="address">Complete address *</label>

                    <textarea
                      id="address"
                      name="address"
                      placeholder="House number, street, area, landmark"
                      value={form.address}
                      onChange={(event) =>
                        updateField("address", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="city">City *</label>

                    <input
                      id="city"
                      name="city"
                      type="text"
                      placeholder="City"
                      value={form.city}
                      onChange={(event) =>
                        updateField("city", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="state">State *</label>

                    <input
                      id="state"
                      name="state"
                      type="text"
                      placeholder="State"
                      value={form.state}
                      onChange={(event) =>
                        updateField("state", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="pincode">Pincode *</label>

                    <input
                      id="pincode"
                      name="pincode"
                      type="text"
                      inputMode="numeric"
                      placeholder="6-digit pincode"
                      value={form.pincode}
                      onChange={(event) =>
                        updateField("pincode", event.target.value)
                      }
                      maxLength={6}
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="country">Country *</label>

                    <input
                      id="country"
                      name="country"
                      type="text"
                      value={form.country}
                      onChange={(event) =>
                        updateField("country", event.target.value)
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <div className={styles.sectionTitle}>
                  <Truck size={18} aria-hidden="true" />
                  <h3>Logistics information</h3>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label htmlFor="vehicleType">Vehicle type *</label>

                    <select
                      id="vehicleType"
                      name="vehicleType"
                      value={form.vehicleType}
                      onChange={(event) =>
                        updateField("vehicleType", event.target.value)
                      }
                      required
                    >
                      <option value="">Select vehicle type</option>
                      <option value="bike">Bike</option>
                      <option value="scooter">Scooter</option>
                      <option value="three-wheeler">Three wheeler</option>
                      <option value="mini-truck">Mini truck</option>
                      <option value="van">Van</option>
                      <option value="truck">Truck</option>
                      <option value="multiple">Multiple vehicles</option>
                    </select>
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="vehicleNumber">Vehicle number</label>

                    <input
                      id="vehicleNumber"
                      name="vehicleNumber"
                      type="text"
                      placeholder="MH12AB1234"
                      value={form.vehicleNumber}
                      onChange={(event) =>
                        updateField("vehicleNumber", event.target.value)
                      }
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="serviceArea">Service area *</label>

                    <input
                      id="serviceArea"
                      name="serviceArea"
                      type="text"
                      placeholder="Cities or districts covered"
                      value={form.serviceArea}
                      onChange={(event) =>
                        updateField("serviceArea", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="deliveryCapacity">
                      Daily delivery capacity
                    </label>

                    <input
                      id="deliveryCapacity"
                      name="deliveryCapacity"
                      type="number"
                      min="1"
                      placeholder="Orders per day"
                      value={form.deliveryCapacity}
                      onChange={(event) =>
                        updateField("deliveryCapacity", event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <div className={styles.sectionTitle}>
                  <FileText size={18} aria-hidden="true" />
                  <h3>Verification documents</h3>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label htmlFor="gstNumber">GST number</label>

                    <input
                      id="gstNumber"
                      name="gstNumber"
                      type="text"
                      placeholder="GST number"
                      value={form.gstNumber}
                      onChange={(event) =>
                        updateField("gstNumber", event.target.value)
                      }
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="panNumber">PAN number *</label>

                    <input
                      id="panNumber"
                      name="panNumber"
                      type="text"
                      placeholder="PAN number"
                      value={form.panNumber}
                      onChange={(event) =>
                        updateField("panNumber", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="drivingLicenseNumber">
                      Driving license number
                    </label>

                    <input
                      id="drivingLicenseNumber"
                      name="drivingLicenseNumber"
                      type="text"
                      placeholder="Driving license number"
                      value={form.drivingLicenseNumber}
                      onChange={(event) =>
                        updateField(
                          "drivingLicenseNumber",
                          event.target.value
                        )
                      }
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="vehicleRcNumber">Vehicle RC number</label>

                    <input
                      id="vehicleRcNumber"
                      name="vehicleRcNumber"
                      type="text"
                      placeholder="Vehicle RC number"
                      value={form.vehicleRcNumber}
                      onChange={(event) =>
                        updateField("vehicleRcNumber", event.target.value)
                      }
                    />
                  </div>
                </div>
              </div>

              <div className={styles.formSection}>
                <div className={styles.sectionTitle}>
                  <Building2 size={18} aria-hidden="true" />
                  <h3>Bank details</h3>
                </div>

                <div className={styles.formGrid}>
                  <div className={styles.field}>
                    <label htmlFor="bankAccountName">
                      Account holder name *
                    </label>

                    <input
                      id="bankAccountName"
                      name="bankAccountName"
                      type="text"
                      placeholder="Account holder name"
                      value={form.bankAccountName}
                      onChange={(event) =>
                        updateField("bankAccountName", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="bankName">Bank name *</label>

                    <input
                      id="bankName"
                      name="bankName"
                      type="text"
                      placeholder="Bank name"
                      value={form.bankName}
                      onChange={(event) =>
                        updateField("bankName", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="bankAccountNumber">
                      Account number *
                    </label>

                    <input
                      id="bankAccountNumber"
                      name="bankAccountNumber"
                      type="password"
                      placeholder="Bank account number"
                      value={form.bankAccountNumber}
                      onChange={(event) =>
                        updateField("bankAccountNumber", event.target.value)
                      }
                      required
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="ifscCode">IFSC code *</label>

                    <input
                      id="ifscCode"
                      name="ifscCode"
                      type="text"
                      placeholder="IFSC code"
                      value={form.ifscCode}
                      onChange={(event) =>
                        updateField("ifscCode", event.target.value)
                      }
                      required
                    />
                  </div>
                </div>
              </div>

              <label className={styles.termsRow}>
                <input
                  type="checkbox"
                  checked={form.agreeTerms}
                  onChange={(event) =>
                    updateField("agreeTerms", event.target.checked)
                  }
                  required
                />

                <span>
                  I agree to the logistic partner terms, verification policy,
                  and platform guidelines.
                </span>
              </label>

              <button
                type="submit"
                className={styles.submitButton}
                disabled={loading}
              >
                {loading ? "Submitting..." : "Submit registration"}

                {!loading && <ArrowRight size={18} aria-hidden="true" />}
              </button>
            </form>
          )}

          <p className={styles.bottomText}>
            Already registered?{" "}
            <Link to="/logistic-partner/login">Login here</Link>
          </p>
        </div>
      </section>
    </main>
  );
}