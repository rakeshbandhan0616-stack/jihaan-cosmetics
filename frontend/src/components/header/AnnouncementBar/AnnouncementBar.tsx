import {
  Truck,
  Leaf,
  PackageCheck,
  Sparkles,
} from "lucide-react";
import styles from "./AnnouncementBar.module.css";

function AnnouncementBar() {
  return (
    <section className={styles.announcementBar} aria-label="Shopping benefits">
      <div className={styles.announcementTrack}>
        <div className={styles.item}>
          <span className={styles.iconWrapper}>
            <Truck size={17} strokeWidth={1.7} />
          </span>

          <div className={styles.content}>
            <strong>Free Shipping</strong>
            <span>On orders above ₹999</span>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.item}>
          <span className={styles.iconWrapper}>
            <Leaf size={17} strokeWidth={1.7} />
          </span>

          <div className={styles.content}>
            <strong>Clean Beauty</strong>
            <span>Thoughtfully selected essentials</span>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.item}>
          <span className={styles.iconWrapper}>
            <PackageCheck size={17} strokeWidth={1.7} />
          </span>

          <div className={styles.content}>
            <strong>Secure Packaging</strong>
            <span>Packed with care</span>
          </div>
        </div>

        <div className={styles.divider} />

        <div className={styles.item}>
          <span className={styles.iconWrapper}>
            <Sparkles size={17} strokeWidth={1.7} />
          </span>

          <div className={styles.content}>
            <strong>Weekly Offers</strong>
            <span>Exclusive beauty deals</span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AnnouncementBar;