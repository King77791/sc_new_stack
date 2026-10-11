import Image from 'next/image';
import Link from 'next/link';
import { HeaderBehavior } from './HeaderBehavior';
import { favoritesNavigation, headerCategories, type HeaderCategory } from './header-data';
import styles from './SiteHeader.module.css';

type SiteHeaderProps = { categories?: readonly HeaderCategory[] };

export function SiteHeader({ categories = headerCategories }: SiteHeaderProps) {
  return (
    <div className={styles.headerSpace}>
      <HeaderBehavior categories={categories}
        contacts={<div className={styles.contacts}>
          <a href="mailto:info@stolica-chaya.ru">info@stolica-chaya.ru</a>
          <a href="tel:+74957776021">+7 (495) 777-60-21</a>
        </div>}
        logo={<Link href="/" className={styles.logo} aria-label="Столица чая — главная">
          <picture>
            <source media="(max-width: 599px)" srcSet="/icons/logo_image_mobile_only.svg" />
            {/* A picture selects the supplied SVG without downloading both logo variants. */}
            <img src="/icons/logo_image_desktop_tablet.svg" width="360" height="80" alt="Столица чая" />
          </picture>
        </Link>}
        actionLinks={<>
          <Link href={favoritesNavigation.href} className={`${styles.action} ${styles.upperFavorites}`} aria-label={favoritesNavigation.label}>
            <Image src={favoritesNavigation.icon} width={56} height={56} alt="" />
          </Link>
          <Link href="/basket" className={styles.action} aria-label="Корзина">
            <Image src="/icons/basket_ic.svg" width={56} height={56} alt="" />
          </Link>
        </>}
      />
    </div>
  );
}
