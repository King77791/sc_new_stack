import styles from './CategoriesSection.module.css';

// Neutral server-loading fallback; intentionally independent of unknown API N.
// Static Home fixtures do not need a simulated loading boundary.
export function CategoriesSectionSkeleton() {
  return (
    <div className={styles.section} aria-hidden="true">
      <div className={styles.grid}>
        <ul className={styles.row} data-columns={4}>
          {Array.from({ length: 4 }, (_, index) => (
            <li key={index} className={styles.item} data-tablet-columns={2} data-mobile-columns={2}>
              <div className={`${styles.card} ${styles.skeleton}`} />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
