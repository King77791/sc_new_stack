'use client';

import Image from 'next/image';
import { useId, useState, type ReactNode } from 'react';
import styles from './DailyTop.module.css';

type Slide = Readonly<{ id: string; title: string; content: ReactNode }>;

/** Manual desktop selection only; ProductCard retains all purchase/favorite state. */
export function DailyTopCarousel({ slides }: Readonly<{ slides: readonly Slide[] }>) {
  const [activeId, setActiveId] = useState(slides[0]?.id);
  const id = useId();
  const activeIndex = Math.max(0, slides.findIndex(slide => slide.id === activeId));
  const active = slides[activeIndex];
  if (activeId !== active?.id) setActiveId(active?.id);
  if (!active) return null;

  const select = (index: number) => {
    const slide = slides[index];
    if (slide) setActiveId(slide.id);
  };

  return (
    <div role="group" aria-label="Товары топа дня"
      aria-roledescription={slides.length > 1 ? 'карусель' : undefined}>
      <div className={styles.stage}>
        {slides.map((slide, index) => (
          <div key={slide.id} id={`${id}-${index}`} className={styles.slide}
            hidden={slide.id !== active.id}>
            {slide.content}
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className={styles.controls}>
          <button type="button" className={`${styles.arrow} ${styles.previous}`}
            aria-label="Предыдущий товар" onClick={() => select((activeIndex - 1 + slides.length) % slides.length)}>
            <Image src="/icons/events/chevron.svg" alt="" width={10} height={16} />
          </button>
          <div className={styles.pagination} role="group" aria-label="Выбрать товар">
            {slides.map((slide, index) => (
              <button key={slide.id} type="button" className={styles.dot}
                aria-label={`Показать товар ${index + 1} из ${slides.length}: ${slide.title}`}
                aria-controls={`${id}-${index}`} aria-current={slide.id === active.id ? 'true' : undefined}
                onClick={() => select(index)} />
            ))}
          </div>
          <button type="button" className={styles.arrow} aria-label="Следующий товар"
            onClick={() => select((activeIndex + 1) % slides.length)}>
            <Image src="/icons/events/chevron.svg" alt="" width={10} height={16} />
          </button>
        </div>
      )}
    </div>
  );
}
