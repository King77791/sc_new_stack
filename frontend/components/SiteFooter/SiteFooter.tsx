import Image from 'next/image';
import Link from 'next/link';
import { mainNavigationItems, siteContacts } from '@/lib/site-data';
import { footerCategories, footerNavigation, footerSocialLinks } from './footer-data';
import { NewsletterForm } from './NewsletterForm';
import styles from './SiteFooter.module.css';

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.content}>
        <div className={styles.navigation}>
          <nav aria-label="Каталог в подвале" className={styles.catalog}>
            <Link href={mainNavigationItems[0].href}>{mainNavigationItems[0].label}</Link>
            <ul className={styles.categories}>
              {footerCategories.map(category => (
                <li key={category.slug}>
                  <Link href={`/catalog/${encodeURIComponent(category.slug)}`}>{category.label}</Link>
                </li>
              ))}
            </ul>
          </nav>
          <div className={styles.divider} aria-hidden="true" />
          <div className={styles.navigationBottom}>
            <nav aria-label="Информация о магазине в подвале">
              <ul className={styles.links}>
                {footerNavigation.map(item => <li key={item.href}><Link href={item.href}>{item.label}</Link></li>)}
              </ul>
            </nav>
            <Image className={styles.emblem} src="/images/footer_emblem.webp" width={200} height={200} alt="" aria-hidden="true" />
          </div>
        </div>
        <div className={styles.details}>
          <NewsletterForm />
          <address className={styles.contacts}>
            <div className={styles.phone}>
              <a href={siteContacts.phone.href}>{siteContacts.phone.label}</a>
              <p>Звонок по России с 10:00 до 22:00</p>
            </div>
            <div className={styles.socialRow}>
              <a href={siteContacts.email.href} className={styles.handle}>@stolitsa-chaya</a>
              <ul className={styles.socialLinks} aria-label="Социальные сети">
                {footerSocialLinks.map(item => (
                  <li key={item.href}>
                    <a href={item.href} target="_blank" rel="noopener noreferrer" aria-label={item.label}>
                      <Image src={item.icon} width={48} height={48} alt="" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </address>
        </div>
      </div>
    </footer>
  );
}
