import {
  BadgeCheck,
  CreditCard,
  Headset,
  RefreshCcw,
  ShieldCheck,
  Truck,
} from "lucide-react";

import styles from "./TrustFeatures.module.css";

type TrustFeature = {
  title: string;
  description: string;
  icon: typeof BadgeCheck;
};

const features: TrustFeature[] = [
  {
    title: "100% Authentic",
    description: "Genuine beauty products",
    icon: BadgeCheck,
  },
  {
    title: "Secure Payments",
    description: "Safe and protected checkout",
    icon: CreditCard,
  },
  {
    title: "Easy Returns",
    description: "Simple and convenient",
    icon: RefreshCcw,
  },
  {
    title: "Fast Delivery",
    description: "Beauty delivered to you",
    icon: Truck,
  },
  {
    title: "Free Shipping",
    description: "On orders above ₹999",
    icon: ShieldCheck,
  },
  {
    title: "Customer Support",
    description: "We are here to help",
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
                    size={25}
                    strokeWidth={1.5}
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