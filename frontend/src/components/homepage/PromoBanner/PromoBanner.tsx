import { ArrowRight } from "lucide-react";
import styles from "./PromoBanner.module.css";

type PromoBannerItem = {
  id: number;
  title: string;
  highlight: string;
  description: string;
  buttonText: string;
  image: string;
  href: string;
};

const banners: PromoBannerItem[] = [
  {
    id: 1,
    title: "Skincare That",
    highlight: "Brings Out Your Glow",
    description: "Pure ingredients. Real results.",
    buttonText: "Shop Skincare",
    image:
      "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=1200&q=90",
    href: "#skincare",
  },
  {
    id: 2,
    title: "Makeup For",
    highlight: "Every You",
    description: "Express. Enhance. Empower.",
    buttonText: "Explore Makeup",
    image:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=90",
    href: "#makeup",
  },
  {
    id: 3,
    title: "Care For",
    highlight: "Your Beautiful Hair",
    description: "Nourish, protect and shine.",
    buttonText: "Shop Haircare",
    image:
      "https://images.unsplash.com/photo-1522337360788-8b13dfc61c9?auto=format&fit=crop&w=1200&q=90",
    href: "#haircare",
  },
];

function PromoBanner() {
  return (
    <section className={styles.section} aria-label="Beauty collections">
      <div className={styles.container}>
        <div className={styles.sectionHeading}>
          <span className={styles.eyebrow}>BEAUTY ESSENTIALS</span>
          <h2>Discover Your Beauty Ritual</h2>
          <p>Thoughtfully selected essentials for your everyday glow.</p>
        </div>

        <div className={styles.bannerGrid}>
          {banners.map((banner) => (
            <article className={styles.banner} key={banner.id}>
              <div className={styles.content}>
                <span className={styles.bannerNumber}>
                  0{banner.id}
                </span>

                <h3>
                  {banner.title}
                  <br />
                  <span>{banner.highlight}</span>
                </h3>

                <p>{banner.description}</p>

                <a href={banner.href} className={styles.button}>
                  {banner.buttonText}
                  <ArrowRight size={16} strokeWidth={1.8} />
                </a>
              </div>

              <div className={styles.imageWrapper}>
                <img
                  src={banner.image}
                  alt={banner.highlight}
                  className={styles.image}
                  loading="lazy"
                />

                <div className={styles.imageOverlay} />
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export default PromoBanner;