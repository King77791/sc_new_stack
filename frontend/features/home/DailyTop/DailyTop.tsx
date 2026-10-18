import { ProductCard } from '@/features/product/ProductCard/ProductCard';
import type { ProductCardData } from '@/features/product/ProductCard/ProductCard.types';
import { DailyTopCarousel } from './DailyTopCarousel';
import styles from './DailyTop.module.css';

export function DailyTop({ products }: Readonly<{ products?: readonly ProductCardData[] | null }>) {
  // Presentation safety limit only. Input order and prepared prices are preserved.
  const items = products?.slice(0, 7) ?? [];
  if (items.length === 0) return null;

  return (
    <section className={styles.root} aria-label="Топ дня">
      <h2 className={styles.heading}>ТОП ДНЯ</h2>
      <div className={styles.desktop}>
        <DailyTopCarousel slides={items.map(product => ({
          id: product.slug,
          title: product.title,
          content: <ProductCard data={product} presentation="full" />,
        }))} />
      </div>
      <ul className={styles.strip} aria-label="Товары топа дня">
        {items.map(product => (
          <li key={product.slug}>
            <ProductCard data={product} presentation="compact" />
          </li>
        ))}
      </ul>
    </section>
  );
}
