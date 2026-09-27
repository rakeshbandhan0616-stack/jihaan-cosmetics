import styles from "./Loader.module.css";
import jihaanLogo from "../../assets/images/jihaan-logo.jpeg";

interface LoaderProps {
  fullScreen?: boolean;
  message?: string;
}

export default function Loader({
  fullScreen = true,
  message = "Loading...",
}: LoaderProps) {
  return (
    <div
      className={`${styles.loader} ${
        fullScreen ? styles.fullScreen : styles.inline
      }`}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className={styles.content}>
        {/* ================================================
            LOGO LOADER
           ================================================ */}

        <div className={styles.logoContainer}>
          {/* Rotating outer ring */}
          <div className={styles.outerRing} />

          {/* Rotating inner ring */}
          <div className={styles.innerRing} />

          {/* Logo */}
          <div className={styles.logoWrapper}>
            <img
              src={jihaanLogo}
              alt="Jihaan Cosmetics"
              className={styles.logo}
            />
          </div>
        </div>

        {/* ================================================
            BRAND NAME
           ================================================ */}

        <div className={styles.brandName}>
          JINI <span>COSMETICS</span>
        </div>

        {/* ================================================
            LOADING DOTS
           ================================================ */}

        <div className={styles.loadingDots}>
          <span />
          <span />
          <span />
        </div>

        {/* ================================================
            LOADING MESSAGE
           ================================================ */}

        <p className={styles.message}>
          {message}
        </p>
      </div>
    </div>
  );
}