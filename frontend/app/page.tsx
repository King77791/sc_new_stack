import { PromoSection } from '@/features/home/PromoSection/PromoSection';
import { homePromoBanners } from '@/features/home/PromoBanner/promo-banner.data';
import { homeUpcomingEvent } from '@/features/home/UpcomingEventPromo/upcoming-event.data';
import { homeDailyTopProducts } from '@/features/home/DailyTop/daily-top.data';
import { CategoriesSection } from '@/features/home/CategoriesSection/CategoriesSection';
import { homeCategoryFixtures } from '@/features/home/CategoriesSection/categories.fixtures';
import styles from './page.module.css';

export default function Home() {
  return (
    <main>
      <h1 className={styles.title}>Столица чая — управляй состоянием</h1>
      <PromoSection banners={homePromoBanners} upcomingEvent={homeUpcomingEvent} dailyTop={homeDailyTopProducts} />
      <CategoriesSection categories={homeCategoryFixtures} />
    </main>
  );
}
