'use client';

import type { ReactNode } from 'react';
import { CartProvider } from './CartProvider';
import { resolveCartFixturePricing } from './cart-pricing.fixtures';

/** Persistent frontend-only application boundary; no DOM wrapper or persistence. */
export function CartApplicationProvider({ children }: Readonly<{ children: ReactNode }>) {
  return <CartProvider resolvePricing={resolveCartFixturePricing}>{children}</CartProvider>;
}
