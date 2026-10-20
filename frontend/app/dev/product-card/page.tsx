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
export default async function ProductCardDemo({ searchParams }: { searchParams: Promise<{ presentation?: string; example?: string }> }) {
  const params = await searchParams;
  const presentations = (['full', 'compact', 'responsive'] as const).filter(value => !params.presentation || params.presentation === value);
  const examples = productCardExamples.filter(value => !params.example || value.data.slug === params.example);
  if (process.env.NODE_ENV !== 'development') notFound();

  return (
    <main className={styles.demo}>
      <h1>ProductCard · Responsive + Bottom Sheet</h1>
      <p>Временная dev-страница. Favorite, выбор веса и Cart используют только локальное UI-состояние.
        Смена веса сбрасывает локальный Cart-счётчик; перезагрузка сбрасывает все изменения.
        Страна ведёт на /catalog/region/&lt;country-slug&gt;; Catalog page пока не реализована.</p>
      <p>Проверка: hover карточки, hover/focus Mood, hover длинного title; Tab → вес → Enter → стрелки → Enter/Escape.
        В compact selectable CTA открывает Bottom Sheet; Escape отменяет draft.</p>
      {presentations.map((presentation) => (
        <section key={presentation} aria-label={presentation}>
          <h2>{presentation}</h2>
          <div className={presentation === 'responsive' ? styles.responsiveGrid : presentation === 'full' ? styles.fullGrid : styles.compactGrid}>
            {examples.map(({ label, data, favorite }) => (
              <div className={styles.example} key={data.slug}>
                <h3 className={styles.exampleLabel}>{label}</h3>
                <ProductCard data={data} presentation={presentation} favorite={favorite} />
              </div>
            ))}
          </div>
        </section>
      ))}
      {!params.presentation && <section aria-label="Full lower boundary">
        <h2>Full · 320 px</h2>
        <div className={styles.boundaryGrid}>
          {examples.map(({ label, data, favorite }) => (
            <div className={styles.example} key={data.slug}>
              <h3 className={styles.exampleLabel}>{label}</h3>
              <ProductCard data={data} presentation="full" favorite={favorite} />
            </div>
          ))}
        </div>
      </section>}
    </main>
  );
}
