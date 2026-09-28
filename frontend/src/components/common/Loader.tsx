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
      <div className={styles.backgroundGlow} />

      <div className={styles.content}>
        {/* Logo loader */}
        <div className={styles.logoContainer}>
          <div className={styles.outerGlow} />

          <div className={styles.outerRing}>
            <span />
          </div>

          <div className={styles.innerRing} />

          <div className={styles.orbit}>
            <span className={styles.orbitDot} />
          </div>

          <div className={styles.logoWrapper}>
            <div className={styles.logoShine} />

            <img
              src={jihaanLogo}
              alt="Jini Cosmetics"
              className={styles.logo}
            />
          </div>
        </div>

        {/* Brand */}
        <div className={styles.brandBlock}>
          <div className={styles.brandName}>
            JINI
          </div>

          <div className={styles.brandSub}>
            COSMETICS
          </div>

          <div className={styles.brandUnderline}>
            <span />
          </div>
        </div>

        {/* Loading */}
        <div className={styles.loadingArea}>
          <div className={styles.loadingDots}>
            <span />
            <span />
            <span />
          </div>

          <p className={styles.message}>{message}</p>
        </div>
      </div>
    </div>
  );
}