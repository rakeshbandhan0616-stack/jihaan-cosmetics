import styles from "./Navigation.module.css";

const navigationItems = [
  "Home",
  "Skincare",
  "Makeup",
  "Haircare",
  "Fragrances",
  "Bath & Body",
  "Beauty Tools",
  "Wellness",
  "Brands",
  "Offers",
  "New Arrivals",
  "Blog",
];

function Navigation() {
  return (
    <nav className={styles.navigation} aria-label="Main navigation">
      <div className={styles.navigationInner}>
        {navigationItems.map((item) => {
          const linkId = item.toLowerCase().replace(/&/g, "and").replace(/\s+/g, "-");

          return (
            <a
              href={item === "Home" ? "/" : `#${linkId}`}
              key={item}
              className={`${styles.navLink} ${
                item === "Home" ? styles.active : ""
              }`}
            >
              {item}
            </a>
          );
        })}
      </div>
    </nav>
  );
}

export default Navigation;