import Image from 'next/image';
import Link from 'next/link';
import type { CategoriesSectionProps } from './CategoriesSection.types';
import styles from './CategoriesSection.module.css';

type ImagePresentation = 'normal' | 'standard' | 'medium' | 'wide' | 'enlarged';

function desktopRows(count: number): number[] {
  if (count < 5) return [count];
  if (count === 5) return [3, 2];
  if (count < 9) return [4, count - 4];
  const rows = Array.from({ length: Math.floor(count / 4) }, () => 4);
  if (count % 4) rows.push(count % 4);
  return rows;
}

function tabletColumns(count: number, index: number): number {
  if (count < 4) return count;
  if (count === 5) return index < 3 ? 3 : 2;
  if (count === 7) return index < 4 ? 2 : 3;
  if (count === 8) return index < 2 ? 2 : 3;
  // Outside the designed range, keep the approved groups of four/remainder;
  // each group of four becomes two tablet rows without empty slots.
  const remainder = count % 4;
  if (count > 8 && remainder && index >= count - remainder) return remainder;
  return 2;
}

function imagePresentation(count: number, columns: number, row: number): ImagePresentation {
  if (columns < 3) return 'wide';
  if (count === 7 && row === 1) return 'enlarged';
  if (columns === 3) return 'medium';
  return count === 8 ? 'standard' : 'normal';
}

function formatProductCount(count: number): string {
  const lastTwo = count % 100;
  const last = count % 10;
  const word = lastTwo >= 11 && lastTwo <= 14 ? 'позиций'
    : last === 1 ? 'позиция' : last >= 2 && last <= 4 ? 'позиции' : 'позиций';
  return `${count} ${word}`;
}

export function CategoriesSection({ categories }: CategoriesSectionProps) {
  const visible = categories.filter(category => category.productCount !== 0);
  if (visible.length === 0) return null;

  const rows = desktopRows(visible.length);
  let offset = 0;

  return (
    <nav className={styles.section} aria-label="Категории товаров" data-category-count={visible.length}>
      <div className={styles.grid} data-count={visible.length}>
        {rows.map((columns, row) => {
          const start = offset;
          offset += columns;
          return (
            <ul key={row} className={styles.row} data-columns={columns}>
              {visible.slice(start, offset).map((category, column) => {
                const presentation = imagePresentation(visible.length, columns, row);
                const desktopImageSize = presentation === 'wide' || presentation === 'enlarged' ? 480 : 300;
                return (
                  <li key={category.id} className={styles.item}
                    data-tablet-columns={tabletColumns(visible.length, start + column)}
                    data-mobile-columns={visible.length < 4 ? visible.length
                      : visible.length % 2 === 1 && start + column === visible.length - 1 ? 1 : 2}>
                    <Link href={`/category/${encodeURIComponent(category.slug)}`} prefetch={false}
                      className={styles.card} data-presentation={presentation}>
                      {category.image && (
                        <span className={styles.image} aria-hidden="true">
                          <Image src={category.image} alt="" fill
                            sizes={`(max-width: 759px) 150px, (max-width: 1279px) 220px, ${desktopImageSize}px`} />
                        </span>
                      )}
                      <span className={styles.copy}>
                        <span className={styles.title}>{category.title}</span>
                        <span className={styles.count}>{formatProductCount(category.productCount)}</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          );
        })}
      </div>
    </nav>
  );
}
