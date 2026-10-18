import { DailyTop } from '../DailyTop/DailyTop';
import type { ProductCardData } from '@/features/product/ProductCard/ProductCard.types';
import { PromoBanner } from '../PromoBanner/PromoBanner';
import type { PromoBannerItems } from '../PromoBanner/PromoBanner.types';
import { UpcomingEventPromo } from '../UpcomingEventPromo/UpcomingEventPromo';
import type { UpcomingEventPromoData } from '../UpcomingEventPromo/UpcomingEventPromo.types';
import styles from './PromoSection.module.css';

type PromoSectionProps = Readonly<{
  banners: PromoBannerItems;
  upcomingEvent?: UpcomingEventPromoData | null;
  dailyTop?: readonly ProductCardData[] | null;
}>;

export function PromoSection({ banners, upcomingEvent, dailyTop }: PromoSectionProps) {
  const hasEvent = Boolean(upcomingEvent);
  const hasDailyTop = Boolean(dailyTop?.length);
  return (
    <section className={styles.section} aria-label="Подборки Столицы чая"
      data-sidebar={hasEvent || hasDailyTop} data-event-only={hasEvent && !hasDailyTop}>
      <PromoBanner items={banners} />
      {(hasEvent || hasDailyTop) && (
        <div className={styles.sidebar}>
          {upcomingEvent && <div className={styles.event}><UpcomingEventPromo event={upcomingEvent} /></div>}
          {hasDailyTop && <div className={styles.dailyTop}><DailyTop products={dailyTop} /></div>}
        </div>
      )}
    </section>
  );
}
