import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CategoriesSection } from '@/features/home/CategoriesSection/CategoriesSection';
import { CategoriesSectionSkeleton } from '@/features/home/CategoriesSection/CategoriesSectionSkeleton';
import { homeCategoryFixtures } from '@/features/home/CategoriesSection/categories.fixtures';
import type { HomeCategory } from '@/features/home/CategoriesSection/CategoriesSection.types';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'CategoriesSection — QA',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default async function CategoriesSectionPreview({ searchParams }: {
  searchParams: Promise<{ visible?: string; skeleton?: string }>;
}) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const params = await searchParams;
  const requested = Number(params.visible ?? 8);
  const visible = Number.isInteger(requested) && requested >= 0 && requested <= 12 ? requested : 8;
  const categories: HomeCategory[] = homeCategoryFixtures.map((category, index) => ({
    ...category, productCount: index < visible ? category.productCount : 0,
  }));
  for (let index = 8; index < visible; index += 1) {
    const source = homeCategoryFixtures[index % homeCategoryFixtures.length];
    if (source) categories.push({ ...source, id: `synthetic-category-${index}`, slug: `synthetic-${index}` });
  }

  return (
    <main>
      <form className={styles.controls}>
        <h1>CategoriesSection — QA</h1>
        <p>0–8: восемь входных категорий, остальные с нулевым count. 9–12: дополнительные synthetic fixtures.</p>
        <label>Видимых категорий <input name="visible" type="number" min="0" max="12" defaultValue={visible} /></label>
        <label><input name="skeleton" type="checkbox" value="1" defaultChecked={params.skeleton === '1'} /> Skeleton</label>
        <button type="submit">Показать</button>
      </form>
      {params.skeleton === '1' ? <CategoriesSectionSkeleton /> : <CategoriesSection categories={categories} />}
    </main>
  );
}
