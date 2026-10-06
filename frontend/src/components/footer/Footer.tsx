import {
  Mail,
  ArrowUpRight,
  MapPin,
  Phone,
} from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaTwitter,
  FaPinterestP,
  FaLinkedinIn,
} from "react-icons/fa";

import { Link } from "react-router-dom";

import styles from "./Footer.module.css";
import jihaanLogo from "../../assets/images/jihaan-logo.jpeg";

/* =========================================================
   SHOP LINKS
========================================================= */

const shopLinks = [
  {
    label: "Skincare",
    href: "/category/skin-care",
  },
  {
    label: "Makeup",
    href: "/category/makeup",
  },
  {
    label: "Haircare",
    href: "/category/hair-care",
  },
  {
    label: "Fragrance",
    href: "/category/fragrance",
  },
  {
    label: "Bath & Body",
    href: "/category/bath-body",
  },
  {
    label: "All Products",
    href: "/shop",
  },
];

/* =========================================================
   CUSTOMER CARE
========================================================= */

const customerCareLinks = [
  {
    label: "Track Order",
    href: "/track-order",
  },
  {
    label: "Returns & Refunds",
    href: "/returns",
  },
  {
    label: "Shipping Policy",
    href: "/shipping",
  },
  {
    label: "Privacy Policy",
    href: "/privacy",
  },
  {
    label: "Terms & Conditions",
    href: "/terms",
  },
  {
    label: "Contact Us",
    href: "/#contact",
  },
];

/* =========================================================
   ABOUT LINKS
========================================================= */

const aboutLinks = [
  {
    label: "Our Story",
    href: "/#about",
  },
  {
    label: "Our Brands",
    href: "/#brands",
  },
  {
    label: "Bestsellers",
    href: "/#bestsellers",
  },
  {
    label: "New Arrivals",
    href: "/#new-arrivals",
  },
  {
    label: "Careers",
    href: "/careers",
  },
  {
    label: "Store Locator",
    href: "/store-locator",
  },
];

/* =========================================================
   COMPONENT
========================================================= */

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      {/* ===================================================
          TOP FOOTER
      =================================================== */}

      <div className={styles.footerTop}>
        <div className={styles.footerContainer}>
          {/* =================================================
              BRAND
          ================================================= */}

          <div className={styles.brandColumn}>
            <Link
              to="/"
              className={styles.logo}
              aria-label="Jini Cosmetics home"
            >
              <img
                src={jihaanLogo}
                alt="Jini Cosmetics"
                className={styles.logoImage}
              />

              <span className={styles.logoText}>
                <span className={styles.logoMain}>
                  JINI
                </span>

                <span className={styles.logoSub}>
                  COSMETICS
                </span>
              </span>
            </Link>

            <p className={styles.brandDescription}>
              Beauty made with care.
              Discover premium skincare,
              makeup and self-care essentials
              created to bring out your natural
              confidence.
            </p>

            {/* =================================================
                SOCIALS
            ================================================= */}

            <div className={styles.socials}>
              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
                className={styles.socialLink}
              >
                <FaInstagram size={15} />
              </a>

              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
                className={styles.socialLink}
              >
                <FaFacebookF size={14} />
              </a>

              <a
                href="https://www.twitter.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Twitter"
                className={styles.socialLink}
              >
                <FaTwitter size={14} />
              </a>

              <a
                href="https://www.pinterest.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Pinterest"
                className={styles.socialLink}
              >
                <FaPinterestP size={14} />
              </a>

              <a
                href="https://www.linkedin.com"
                target="_blank"
                rel="noreferrer"
                aria-label="LinkedIn"
                className={styles.socialLink}
              >
                <FaLinkedinIn size={14} />
              </a>
            </div>
          </div>

          {/* =================================================
              SHOP
          ================================================= */}

          <div className={styles.linkColumn}>
            <h3>Shop</h3>

            <div className={styles.columnLinks}>
              {shopLinks.map((link) => (
                <Link
                  to={link.href}
                  key={link.label}
                  className={styles.footerLink}
                >
                  <span>{link.label}</span>

                  <ArrowUpRight size={11} />
                </Link>
              ))}
            </div>
          </div>

          {/* =================================================
              CUSTOMER CARE
          ================================================= */}

          <div className={styles.linkColumn}>
            <h3>Customer Care</h3>

            <div className={styles.columnLinks}>
              {customerCareLinks.map((link) => (
                <Link
                  to={link.href}
                  key={link.label}
                  className={styles.footerLink}
                >
                  <span>{link.label}</span>

                  <ArrowUpRight size={11} />
                </Link>
              ))}
            </div>
          </div>

          {/* =================================================
              ABOUT US
          ================================================= */}

          <div className={styles.linkColumn}>
            <h3>About Us</h3>

            <div className={styles.columnLinks}>
              {aboutLinks.map((link) => (
                <Link
                  to={link.href}
                  key={link.label}
                  className={styles.footerLink}
                >
                  <span>{link.label}</span>

                  <ArrowUpRight size={11} />
                </Link>
              ))}
            </div>
          </div>

          {/* =================================================
              NEWSLETTER
          ================================================= */}

          <div className={styles.newsletterColumn}>
            <h3>Subscribe to Our Newsletter</h3>

            <p className={styles.newsletterText}>
              Get exclusive offers, beauty tips,
              new launches and more delivered to
              your inbox.
            </p>

            <form
              className={styles.newsletterForm}
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <div className={styles.emailInputWrapper}>
                <Mail
                  size={14}
                  className={styles.emailIcon}
                />

                <input
                  type="email"
                  placeholder="Enter your email address"
                  aria-label="Email address"
                  className={styles.emailInput}
                  required
                />
              </div>

              <button
                type="submit"
                className={styles.subscribeButton}
              >
                Subscribe
              </button>
            </form>

            <p className={styles.newsletterNote}>
              By subscribing, you agree to receive
              our latest updates and offers.
            </p>

            {/* =================================================
                CONTACT
            ================================================= */}

            <div className={styles.miniContact}>
              <a
                href="mailto:namaste@jinicosmetics.com"
                className={styles.miniContactItem}
              >
                <Mail size={13} />

                <span>
                  namaste@jinicosmetics.com
                </span>
              </a>

              <a
                href="tel:+918884852372"
                className={styles.miniContactItem}
              >
                <Phone size={13} />

                <span>
                  +91 88848 52372
                </span>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================
          FOOTER BOTTOM
      =================================================== */}

      <div className={styles.footerBottom}>
        <div className={styles.footerBottomInner}>
          <div className={styles.copyright}>
            <span>
              © {currentYear} Jini Cosmetics.
              All rights reserved.
            </span>
          </div>

          <div className={styles.footerBottomLinks}>
            <Link to="/privacy">
              Privacy Policy
            </Link>

            <Link to="/terms">
              Terms &amp; Conditions
            </Link>

            <Link to="/shipping">
              Shipping Policy
            </Link>

            <Link
    to="/staff/login"
    className={styles.staffLoginLink}
  >
    Staff Login
  </Link>

            <Link
              to="/admin/login"
              className={styles.adminLink}
            >
              Admin Login
            </Link>
          </div>

          <div className={styles.footerLocation}>
            <MapPin size={12} />

            <span>
              Bangalore, India
            </span>
          </div>
        </div>
      </div>

      {/* ===================================================
          DECORATIVE TAGLINE
      =================================================== */}

      <div className={styles.footerTagline}>
        Natural Care · Real You ♡
      </div>
    </footer>
  );
}

export default Footer;