import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import styles from "./PromoBanner.module.css";

type PromoBannerItem = {
  id: number;
  title: string;
  subtitle: string;
  buttonText: string;
  image: string;
  href: string;
  accent: string;
};

const banners: PromoBannerItem[] = [
  {
    id: 1,
    title: "Skincare",
    subtitle: "Healthy skin, happier you.",
    buttonText: "Shop Skincare",
    image:
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=600&q=90",
    href: "/category/skin-care",
    accent: "#f9ebe8",
  },
  {
    id: 2,
    title: "Makeup",
    subtitle: "Express your unique beauty.",
    buttonText: "Shop Makeup",
    image:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=600&q=90",
    href: "/category/makeup",
    accent: "#f7e8f2",
  },
  {
    id: 3,
    title: "Haircare",
    subtitle: "Stronger, shinier hair naturally.",
    buttonText: "Shop Haircare",
    image:
      "https://images.unsplash.com/photo-1522335789203-aabd1fc54bc9?auto=format&fit=crop&w=600&q=90",
    href: "/category/hair-care",
    accent: "#eef4f1",
  },
];

function PromoBanner() {
  const navigate = useNavigate();

  return (
    <section className={styles.section} aria-label="Shop by category">
      <div className={styles.container}>
        <div className={styles.bannerGrid}>
          {banners.map((banner) => (
            <article
              key={banner.id}
              className={styles.banner}
              style={{ backgroundColor: banner.accent }}
            >
              {/* Left Content */}
              <div className={styles.content}>
                <h3>{banner.title}</h3>
                <p>{banner.subtitle}</p>

                <button
                  type="button"
                  className={styles.button}
                  onClick={() => navigate(banner.href)}
                >
                  {banner.buttonText}
                  <ArrowRight size={14} strokeWidth={2.2} />
                </button>
              </div>

              {/* Right Image */}
              <div className={styles.imageWrapper}>
                <img
                  src={banner.image}
                  alt={banner.title}
                  className={styles.image}
                  loading="lazy"
                />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PromoBanner;