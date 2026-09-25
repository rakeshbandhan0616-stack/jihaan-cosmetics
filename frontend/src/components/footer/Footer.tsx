import {
  Mail,
  MapPin,
  Phone,
  ArrowUpRight,
  Truck,
  Store,
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
  { label: "Skincare", href: "#skincare" },
  { label: "Makeup", href: "#makeup" },
  { label: "Haircare", href: "#haircare" },
  { label: "Fragrance", href: "#fragrance" },
  { label: "Bath & Body", href: "#bath-body" },
];

const quickLinks = [
  { label: "About Us", href: "#about" },
  { label: "Bestsellers", href: "#bestsellers" },
  { label: "Our Brands", href: "#brands" },
  { label: "New Arrivals", href: "#new-arrivals" },
  { label: "Contact Us", href: "#contact" },
];

function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className={styles.footerTop}>
        <div className={styles.footerContainer}>
          {/* ==================== BRAND COLUMN ==================== */}
          <div className={styles.brandColumn}>
            <Link
              to="/"
              className={styles.logo}
              aria-label="Jihaan Cosmetics home"
            >
              <img
                src={jihaanLogo}
                alt="Jihaan Cosmetics logo"
                className={styles.logoImage}
              />

              <span className={styles.logoText}>
                <span className={styles.logoMain}>JINI COSMETICS</span>

                <span className={styles.logoSub}>
                  BEAUTY. CARE. CONFIDENCE.
                </span>
              </span>
            </Link>

            <p className={styles.brandDescription}>
              Your destination for premium beauty, skincare, makeup, and
              self-care essentials crafted to bring out your natural
              confidence.
            </p>

            {/* Social Media */}
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

          {/* ==================== SHOP LINKS ==================== */}
          <div className={styles.linkColumn}>
            <h3>Shop</h3>

            {shopLinks.map((link) => (
              <a href={link.href} key={link.label}>
                {link.label}
                <ArrowUpRight size={13} />
              </a>
            ))}
          </div>

          {/* ==================== QUICK LINKS ==================== */}
          <div className={styles.linkColumn}>
            <h3>Quick Links</h3>

            {quickLinks.map((link) => (
              <a href={link.href} key={link.label}>
                {link.label}
                <ArrowUpRight size={13} />
              </a>
            ))}
          </div>

          {/* ==================== STAFF LOGIN ==================== */}
          <div className={styles.partnerColumn}>
            <h3>Staff Login</h3>

            {/* Admin Login */}
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

            {/* Accounts Login */}
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

            {/* Logistics Login */}
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

          {/* ==================== CONTACT COLUMN ==================== */}
          <div className={styles.contactColumn}>
            <h3>Get In Touch</h3>

            <a
              href="mailto:hello@jihaancosmetics.com"
              className={styles.contactItem}
            >
              <span className={styles.contactIcon}>
                <Mail size={16} />
              </span>

              <span>hello@jihaancosmetics.com</span>
            </a>

            <a href="tel:+919876543210" className={styles.contactItem}>
              <span className={styles.contactIcon}>
                <Phone size={16} />
              </span>

              <span>+91 98765 43210</span>
            </a>

            <div className={styles.contactItem}>
              <span className={styles.contactIcon}>
                <MapPin size={16} />
              </span>

              <span>Maharashtra, India</span>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== FOOTER BOTTOM ==================== */}
      <div className={styles.footerBottom}>
        <div className={styles.footerBottomInner}>
          <p>© {currentYear} Jihaan Cosmetics. All rights reserved.</p>

          <div className={styles.legalLinks}>
            <a href="#privacy">Privacy Policy</a>

            <a href="#terms">Terms &amp; Conditions</a>

            <a href="#shipping">Shipping Policy</a>

            {/* Admin Login */}
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