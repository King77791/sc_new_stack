import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CartWidgetDemo } from './CartWidgetDemo';
import { cartWidgetFixtures, type CartWidgetScenario } from './cart-widget.fixtures';
import styles from './page.module.css';

export const metadata: Metadata = { title: 'CartWidget — presentation QA', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default async function CartWidgetPage({ searchParams }: Readonly<{ searchParams: Promise<{ scenario?: string }> }>) {
  if (process.env.NODE_ENV !== 'development') notFound();
  const { scenario } = await searchParams;
  const initialScenario = scenario && Object.hasOwn(cartWidgetFixtures, scenario) ? scenario as CartWidgetScenario : 'three';
  return <main className={styles.demo}><CartWidgetDemo initialScenario={initialScenario} /></main>;
}
