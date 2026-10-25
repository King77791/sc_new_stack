import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CartStateHarness } from './CartStateHarness';

export const metadata: Metadata = { title: 'Cart domain — isolated QA', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

/** Persistent dev-only boundary for navigation between the two harness routes. */
export default function CartStateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <CartStateHarness>{children}</CartStateHarness>;
}
