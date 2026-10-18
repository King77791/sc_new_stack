import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/features/product/ProductCard/ProductCard';
import { productCardExamples } from '@/features/product/ProductCard/product-card.fixtures';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'ProductCard — визуальная проверка',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

/** Temporary development surface. Never exposed by the production server. */
export default function ProductCardDemo() {
  if (process.env.NODE_ENV !== 'development') notFound();

  return (
    <main className={styles.demo}>
      <h1>ProductCard · Slice 1C</h1>
      <p>Временная dev-страница. Favorite, выбор веса и Cart используют только локальное UI-состояние.
        Смена веса сбрасывает локальный Cart-счётчик; перезагрузка сбрасывает все изменения.
        Страна ведёт на /catalog/region/&lt;country-slug&gt;; Catalog page пока не реализована.</p>
      <p>Проверка: hover карточки, hover/focus Mood, hover длинного title; Tab → вес → Enter → стрелки → Enter/Escape.
        В compact вес — текст, сверху только страна.</p>
      {(['full', 'compact'] as const).map((presentation) => (
        <section key={presentation} aria-label={presentation}>
          <h2>{presentation === 'full' ? 'Full · 360 px' : 'Compact · 170 px'}</h2>
          <div className={presentation === 'full' ? styles.fullGrid : styles.compactGrid}>
            {productCardExamples.map(({ label, data, favorite }) => (
              <div className={styles.example} key={data.slug}>
                <h3 className={styles.exampleLabel}>{label}</h3>
                <ProductCard data={data} presentation={presentation} favorite={favorite} />
              </div>
            ))}
          </div>
        </section>
      ))}
      <section aria-label="Full lower boundary">
        <h2>Full · 320 px</h2>
        <div className={styles.boundaryGrid}>
          {productCardExamples.map(({ label, data, favorite }) => (
            <div className={styles.example} key={data.slug}>
              <h3 className={styles.exampleLabel}>{label}</h3>
              <ProductCard data={data} presentation="full" favorite={favorite} />
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
