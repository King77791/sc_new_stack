import Image from 'next/image';
import Link from 'next/link';
import type { UpcomingEventPromoData } from './UpcomingEventPromo.types';
import styles from './UpcomingEventPromo.module.css';

export function UpcomingEventPromo({ event }: Readonly<{ event: UpcomingEventPromoData }>) {
  const articleHref = `/article/${event.articleId}`;
  const categoryHref = `/events/${event.categorySlug}`;

  return (
    <div className={styles.frame}>
      <article className={styles.card}>
        <Link href={articleHref} className={styles.imageLink}>
          <Image src={event.image.src} alt={event.image.alt}
            width={event.image.width} height={event.image.height}
            sizes="(max-width: 759px) 25vw, (max-width: 1279px) 160px, 120px"
            className={styles.image} />
        </Link>
        <div className={styles.content}>
          <Link href={categoryHref} className={styles.type}>{event.typeLabel}</Link>
          <div className={styles.details}>
            <h2 className={styles.heading}>
              <Link href={articleHref} className={styles.title}>{event.title}</Link>
            </h2>
            <p className={styles.address}>{event.address}</p>
          </div>
        </div>
        <Link href={articleHref} className={styles.chevron} aria-label="Перейти к событию">
          <span className={styles.more}>Подробнее</span>
          <Image src="/icons/events/chevron.svg" alt="" width={10} height={16} />
        </Link>
      </article>
    </div>
  );
}
