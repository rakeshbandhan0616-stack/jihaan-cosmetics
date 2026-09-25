import { FormEvent, useState } from "react";
import {
  CheckCircle,
  LoaderCircle,
  Mail,
  MapPin,
  Phone,
  Send,
} from "lucide-react";
import styles from "./ContactUsPage.module.css";

const API_BASE_URL = String(
  import.meta.env.VITE_API_URL ||
    import.meta.env.VITE_API_BASE_URL ||
    "https://jihaan-cosmetics.onrender.com/api",
).replace(/\/+$/, "");

type ContactForm = {
  name: string;
  email: string;
  phone: string;
  subject: string;
  message: string;
};

const initialForm: ContactForm = {
  name: "",
  email: "",
  phone: "",
  subject: "",
  message: "",
};

export default function ContactUsPage() {
  const [form, setForm] = useState<ContactForm>(initialForm);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const handleChange = (
    event: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement
    >,
  ) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/contact`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || "Unable to submit your message.",
        );
      }

      setSuccessMessage(
        data?.message ||
          "Thank you for contacting us. Our team will get back to you soon.",
      );

      setForm(initialForm);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroContent}>
          <span className={styles.eyebrow}>GET IN TOUCH</span>

          <h1>
            We would love to
            <span> hear from you.</span>
          </h1>

          <p>
            Have a question about our products, orders, or services?
            Send us a message and our support team will assist you.
          </p>
        </div>
      </section>

      <section className={styles.contactSection}>
        <div className={styles.infoPanel}>
          <div>
            <span className={styles.smallLabel}>CONTACT INFORMATION</span>

            <h2>Let’s start a conversation.</h2>

            <p>
              Our team is here to help you with product information,
              order-related questions, and any other assistance you need.
            </p>
          </div>

          <div className={styles.infoItems}>
            <div className={styles.infoItem}>
              <div className={styles.iconBox}>
                <Mail size={20} />
              </div>

              <div>
                <span>Email</span>
                <a href="mailto:support@example.com">
                  support@example.com
                </a>
              </div>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.iconBox}>
                <Phone size={20} />
              </div>

              <div>
                <span>Phone</span>
                <a href="tel:+919999999999">+91 99999 99999</a>
              </div>
            </div>

            <div className={styles.infoItem}>
              <div className={styles.iconBox}>
                <MapPin size={20} />
              </div>

              <div>
                <span>Address</span>
                <p>Nagpur, Maharashtra, India</p>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.formPanel}>
          <div className={styles.formHeader}>
            <span className={styles.smallLabel}>SEND MESSAGE</span>
            <h2>How can we help?</h2>
            <p>Fill out the form below and we will contact you shortly.</p>
          </div>

          {successMessage && (
            <div className={styles.successMessage} role="status">
              <CheckCircle size={20} />
              <span>{successMessage}</span>
            </div>
          )}

          {errorMessage && (
            <div className={styles.errorMessage} role="alert">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit} className={styles.form}>
            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="name">Full Name *</label>

                <input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="Enter your full name"
                  value={form.name}
                  onChange={handleChange}
                  required
                  maxLength={120}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="email">Email Address *</label>

                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email address"
                  value={form.email}
                  onChange={handleChange}
                  required
                  maxLength={160}
                />
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.field}>
                <label htmlFor="phone">Phone Number</label>

                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  placeholder="Enter your phone number"
                  value={form.phone}
                  onChange={handleChange}
                  maxLength={20}
                />
              </div>

              <div className={styles.field}>
                <label htmlFor="subject">Subject *</label>

                <input
                  id="subject"
                  name="subject"
                  type="text"
                  placeholder="What is your message about?"
                  value={form.subject}
                  onChange={handleChange}
                  required
                  maxLength={200}
                />
              </div>
            </div>

            <div className={styles.field}>
              <label htmlFor="message">Your Message *</label>

              <textarea
                id="message"
                name="message"
                rows={6}
                placeholder="Write your message here..."
                value={form.message}
                onChange={handleChange}
                required
                maxLength={5000}
              />
            </div>

            <button
              type="submit"
              className={styles.submitButton}
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoaderCircle
                    size={19}
                    className={styles.spinner}
                  />
                  Sending...
                </>
              ) : (
                <>
                  Send Message
                  <Send size={18} />
                </>
              )}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}