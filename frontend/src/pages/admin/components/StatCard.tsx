import type { ReactNode } from "react";

import styles from "../AdminDashboardPage.module.css";

interface StatCardProps {
  title: string;
  value: number | string;
  icon: ReactNode;
  description?: string;
}

const StatCard = ({
  title,
  value,
  icon,
  description,
}: StatCardProps) => {
  return (
    <div className={styles.statCard}>
      <div className={styles.statCardTop}>
        <span className={styles.statCardIcon}>{icon}</span>
        <span className={styles.statCardTitle}>{title}</span>
      </div>

      <strong className={styles.statCardValue}>{value}</strong>

      {description && (
        <p className={styles.statCardDescription}>{description}</p>
      )}
    </div>
  );
};

export default StatCard;