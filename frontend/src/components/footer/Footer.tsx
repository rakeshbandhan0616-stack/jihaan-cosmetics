import {
  Mail,
  MapPin,
  Phone,
  ArrowUpRight,
  Truck,
  ShieldCheck,
  WalletCards,
} from "lucide-react";

import {
  FaFacebookF,
  FaInstagram,
  FaTwitter,
  FaPinterestP,
} from "react-icons/fa";

import { Link } from "react-router-dom";

import styles from "./Footer.module.css";
import jihaanLogo from "../../assets/images/jihaan-logo.jpeg";

const shopLinks = [
  { label: "Skincare", href: "/category/skin-care" },
  { label: "Makeup", href: "/category/makeup" },
  { label: "Haircare", href: "/category/hair-care" },
  { label: "Fragrance", href: "/category/fragrance" },
  { label: "Bath & Body", href: "/category/bath-body" },
];

const quickLinks = [
  { label: "About Us", href: "/#about" },
  { label: "Bestsellers", href: "/#bestsellers" },
  { label: "Our Brands", href: "/#brands" },
  { label: "New Arrivals", href: "/#new-arrivals" },
  { label: "Contact Us", href: "/#contact" },
];

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerGlow} aria-hidden="true" />

      <div className={styles.footerTop}>
        <div className={styles.footerContainer}>
          {/* ==================== BRAND ==================== */}
          <div className={styles.brandColumn}>
            <Link
              to="/"
              className={styles.logo}
              aria-label="Jini Cosmetics home"
            >
              <img
                src={jihaanLogo}
                alt="Jini Cosmetics logo"
                className={styles.logoImage}
              />

              <span className={styles.logoText}>
                <span className={styles.logoMain}>
                  JINI
                </span>

                <span className={styles.logoSub}>
                  COSMETICS
                </span>

                <span className={styles.logoTagline}>
                  BEAUTY. CARE. CONFIDENCE.
                </span>
              </span>
            </Link>

            <p className={styles.brandDescription}>
              Your destination for premium beauty, skincare, makeup, and
              self-care essentials crafted to bring out your natural
              confidence.
            </p>

            <div className={styles.socials}>
              <a
                href="https://www.facebook.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Facebook"
              >
                <FaFacebookF size={14} />
              </a>

              <a
                href="https://www.instagram.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Instagram"
              >
                <FaInstagram size={16} />
              </a>

              <a
                href="https://www.twitter.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Twitter"
              >
                <FaTwitter size={15} />
              </a>

              <a
                href="https://www.pinterest.com"
                target="_blank"
                rel="noreferrer"
                aria-label="Pinterest"
              >
                <FaPinterestP size={15} />
              </a>
            </div>
          </div>

          {/* ==================== SHOP ==================== */}
          <div className={styles.linkColumn}>
            <h3>Shop</h3>

            {shopLinks.map((link) => (
              <Link
                to={link.href}
                key={link.label}
              >
                <span>{link.label}</span>
                <ArrowUpRight size={13} />
              </Link>
            ))}
          </div>

          {/* ==================== QUICK LINKS ==================== */}
          <div className={styles.linkColumn}>
            <h3>Quick Links</h3>

            {quickLinks.map((link) => (
              <Link
                to={link.href}
                key={link.label}
              >
                <span>{link.label}</span>
                <ArrowUpRight size={13} />
              </Link>
            ))}
          </div>

          {/* ==================== STAFF LOGIN ==================== */}
          <div className={styles.partnerColumn}>
            <h3>Staff Login</h3>

            <Link
              to="/admin/login"
              className={styles.partnerLink}
              aria-label="Admin Login"
            >
              <span className={styles.partnerIcon}>
                <ShieldCheck size={16} />
              </span>

              <span className={styles.partnerLinkContent}>
                <strong>Admin Login</strong>
                <small>Manage the store</small>
              </span>

              <ArrowUpRight size={14} />
            </Link>

            <Link
              to="/staff/login?role=accounts"
              className={styles.partnerLink}
              aria-label="Accounts Login"
            >
              <span className={styles.partnerIcon}>
                <WalletCards size={16} />
              </span>

              <span className={styles.partnerLinkContent}>
                <strong>Accounts Login</strong>
                <small>Sales &amp; financial reports</small>
              </span>

              <ArrowUpRight size={14} />
            </Link>

            <Link
              to="/staff/login?role=logistics"
              className={styles.partnerLink}
              aria-label="Logistics Login"
            >
              <span className={styles.partnerIcon}>
                <Truck size={16} />
              </span>

              <span className={styles.partnerLinkContent}>
                <strong>Logistics Login</strong>
                <small>Manage orders &amp; deliveries</small>
              </span>

              <ArrowUpRight size={14} />
            </Link>
          </div>

          {/* ==================== CONTACT ==================== */}
          <div className={styles.contactColumn}>
            <h3>Get In Touch</h3>

            <a
              href="mailto:namaste@jinicosmetics.com"
              className={styles.contactItem}
            >
              <span className={styles.contactIcon}>
                <Mail size={16} />
              </span>

              <span>namaste@jinicosmetics.com</span>
            </a>

            <a
              href="tel:+918884852372"
              className={styles.contactItem}
            >
              <span className={styles.contactIcon}>
                <Phone size={16} />
              </span>

              <span>+91 88848 52372</span>
            </a>

            <div className={styles.contactItem}>
              <span className={styles.contactIcon}>
                <MapPin size={16} />
              </span>

              <span>
                Jini Cosmetics India Pvt. Ltd.
                <br />
                #41, 1st Cross,
                <br />
                1st Main,
                <br />
                Hermit Colony, Ulsoor,
                <br />
                Bangalore – 560042
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== FOOTER BOTTOM ==================== */}
      <div className={styles.footerBottom}>
        <div className={styles.footerBottomInner}>
          <p>
            © {currentYear} Jini Cosmetics. All rights reserved.
          </p>

          <div className={styles.legalLinks}>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/terms">Terms &amp; Conditions</Link>
            <Link to="/shipping">Shipping Policy</Link>

            <Link
              to="/admin/login"
              className={styles.adminLoginLink}
            >
              Admin Login
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default Footer;
