import { Link } from "react-router-dom";
import styles from "./ShopByRange.module.css";

type RangeItem = {
  id: number;
  name: string;
  slug: string;
  visual: string;
};

const rangeItems: RangeItem[] = [
  {
    id: 1,
    name: "Eyeliner",
    slug: "eyeliner",
    visual: "eyeliner",
  },
  {
    id: 2,
    name: "Concealer",
    slug: "concealer",
    visual: "concealer",
  },
  {
    id: 3,
    name: "Eyeshadow",
    slug: "eyeshadow",
    visual: "eyeshadow",
  },
  {
    id: 4,
    name: "Kajal",
    slug: "kajal",
    visual: "kajal",
  },
  {
    id: 5,
    name: "Liquid Lipstick",
    slug: "liquid-lipstick",
    visual: "liquidLipstick",
  },
  {
    id: 6,
    name: "Highlighter",
    slug: "highlighter",
    visual: "highlighter",
  },
  {
    id: 7,
    name: "Mascara",
    slug: "mascara",
    visual: "mascara",
  },
  {
    id: 8,
    name: "Nail Polish",
    slug: "nail-polish",
    visual: "nailPolish",
  },
  {
    id: 9,
    name: "Foundation",
    slug: "foundation",
    visual: "foundation",
  },
  {
    id: 10,
    name: "Lipstick",
    slug: "lipstick",
    visual: "lipstick",
  },
];

const ShopByRange = () => {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.heading}>
          <h2>Shop By Range</h2>
          <span className={styles.headingLine}></span>
        </div>

        <div className={styles.rangeGrid}>
          {rangeItems.map((item) => (
            <Link
              key={item.id}
              to={`/shop?category=${item.slug}`}
              className={styles.rangeItem}
            >
              <span className={styles.rangeName}>{item.name}</span>

              <span
                className={`${styles.imageWrapper} ${
                  styles[item.visual]
                }`}
                aria-label={`${item.name} cosmetic image`}
              >
                <span className={styles.visualShape}></span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default ShopByRange;