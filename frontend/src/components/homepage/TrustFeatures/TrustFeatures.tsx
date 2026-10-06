import {
  BadgeCheck,
  CreditCard,
  Headset,
  Leaf,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import styles from "./TrustFeatures.module.css";

type TrustFeature = {
  title: string;
  description: string;
  icon: typeof BadgeCheck;
};

const features: TrustFeature[] = [
  {
    title: "Natural Ingredients",
    description: "Safe for your skin",
    icon: Leaf,
  },
  {
    title: "Dermatologist Tested",
    description: "Trusted by experts",
    icon: BadgeCheck,
  },
  {
    title: "Cruelty Free",
    description: "Kind to animals",
    icon: Sparkles,
  },
  {
    title: "Secure Payments",
    description: "100% safe & encrypted",
    icon: CreditCard,
  },
  {
    title: "Dedicated Support",
    description: "We're here to help",
    icon: Headset,
  },
];

function TrustFeatures() {
  return (
    <section
      className={styles.section}
      aria-label="Shopping benefits and services"
    >
      <div className={styles.container}>
        <div className={styles.featureGrid}>
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div className={styles.feature} key={feature.title}>
                <div className={styles.iconWrapper}>
                  <Icon
                    className={styles.icon}
                    size={18}
                    strokeWidth={1.7}
                    aria-hidden="true"
                  />
                </div>

                <div className={styles.content}>
                  <h3>{feature.title}</h3>
                  <p>{feature.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default TrustFeatures;