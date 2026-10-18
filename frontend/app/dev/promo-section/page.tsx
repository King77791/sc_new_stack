import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { PromoSection } from '@/features/home/PromoSection/PromoSection';
import { homePromoBanners } from '@/features/home/PromoBanner/promo-banner.data';
import { singlePromoBannerExample } from '@/features/home/PromoBanner/promo-banner.fixtures';
import { homeUpcomingEvent } from '@/features/home/UpcomingEventPromo/upcoming-event.data';
import { homeDailyTopProducts } from '@/features/home/DailyTop/daily-top.data';
import { singleDailyTopExample, oversizedDailyTopExample } from '@/features/home/DailyTop/daily-top.fixtures';
import styles from './page.module.css';

export const metadata: Metadata = {
  title: 'PromoSection — визуальная проверка',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default function PromoSectionDemo() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return (
    <main className={styles.demo}>
      <h1>PromoSection · Slice 3</h1>
      <p>Один баннер и несколько. Автосмена каждые 5 секунд; hover и keyboard focus приостанавливают её.
        Ручной выбор запускает задержку заново. Reduced motion отключает автосмену и dissolve.
        Подарочные наборы ведут на существующий магазин, зелёный чай — в каталог.</p>
      <h2>Один баннер</h2>
      <PromoSection banners={singlePromoBannerExample} dailyTop={null} />
      <h2>Несколько баннеров</h2>
      <PromoSection banners={homePromoBanners} />
      <h2>Баннеры и ближайшее событие</h2>
      <PromoSection banners={homePromoBanners} upcomingEvent={homeUpcomingEvent} dailyTop={[]} />
      <h2>Баннеры и топ дня без события</h2>
      <PromoSection banners={homePromoBanners} upcomingEvent={null} dailyTop={homeDailyTopProducts} />
      <h2>Баннеры, событие и топ дня</h2>
      <PromoSection banners={homePromoBanners} upcomingEvent={homeUpcomingEvent} dailyTop={homeDailyTopProducts} />
      <h2>Топ дня: один товар</h2>
      <PromoSection banners={singlePromoBannerExample} dailyTop={singleDailyTopExample} />
      <h2>Топ дня: 9 входных товаров → первые 7</h2>
      <PromoSection banners={singlePromoBannerExample} dailyTop={oversizedDailyTopExample} />
    </main>
  );
}
