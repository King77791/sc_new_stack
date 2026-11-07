import type { Metadata } from 'next';
import { BasketFeature } from '@/features/basket/ui/BasketFeature';

export const metadata: Metadata = { title: 'Корзина', robots: { index: false, follow: false } };

/** Existing persistent application CartProvider belongs to RootLayout. */
export default function BasketPage() { return <BasketFeature />; }
