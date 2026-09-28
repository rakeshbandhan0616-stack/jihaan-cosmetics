import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
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
    href: "/category/skin-care",
  },
  {
    id: 2,
    title: "Makeup For",
    highlight: "Every You",
    description: "Express. Enhance. Empower.",
    buttonText: "Explore Makeup",
    image:
      "https://images.unsplash.com/photo-1596462502278-27bfdc403348?auto=format&fit=crop&w=1200&q=90",
    href: "/category/makeup",
  },
  {
    id: 3,
    title: "Care For",
    highlight: "Your Beautiful Hair",
    description: "Nourish, protect and shine.",
    buttonText: "Shop Haircare",
    image:
      "https://images.unsplash.com/photo-1522337360788-8b13dfc61c9?auto=format&fit=crop&w=1200&q=90",
    href: "/category/hair-care",
  },
];

function PromoBanner() {
  const navigate = useNavigate();

  const handleBannerNavigation = (
    event: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => {
    event.preventDefault();
    navigate(href);
  };

  return (
    <section
      className={styles.section}
      aria-labelledby="beauty-collections-title"
    >
      <div className={styles.container}>
        <header className={styles.sectionHeading}>
          <span className={styles.eyebrow}>BEAUTY ESSENTIALS</span>

          <h2 id="beauty-collections-title">
            Discover Your Beauty Ritual
          </h2>

          <p>
            Thoughtfully selected essentials for your everyday glow.
          </p>
        </header>

        <div className={styles.bannerGrid}>
          {banners.map((banner) => (
            <article
              className={styles.banner}
              key={banner.id}
            >
              <div className={styles.content}>
                <span className={styles.bannerNumber}>
                  <span className={styles.badgeBrush}>
                    0{banner.id}
                  </span>
                </span>

                <h3>
                  {banner.title}
                  <br />
                  <span>{banner.highlight}</span>
                </h3>

                <p>{banner.description}</p>

                <a
                  href={banner.href}
                  className={styles.button}
                  onClick={(event) =>
                    handleBannerNavigation(
                      event,
                      banner.href,
                    )
                  }
                  aria-label={`${banner.buttonText} - ${banner.highlight}`}
                >
                  <span>{banner.buttonText}</span>

                  <ArrowRight
                    size={16}
                    strokeWidth={1.8}
                  />
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
