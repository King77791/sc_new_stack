import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'Cart → Widget integration QA', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** Uses the real application Provider and shell; never mounts a second Cart. */
export default function CartWidgetIntegrationLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <main className={styles.demo}>
    <h1>Shared Cart → CartWidget · shell QA</h1>
    <p>Реальные application Provider, ProductCard и CartWidget consumer. Цены пока ограничены явно заданными frontend-only quotes.</p>
    <nav className={styles.controls} aria-label="Widget integration navigation">
      <Link href="/dev/cart-widget-integration">Карточки</Link>
      <Link href="/dev/cart-widget-integration/observer">Observer</Link>
      <Link href="/">Главная</Link>
    </nav>
    {children}
  </main>;
}
