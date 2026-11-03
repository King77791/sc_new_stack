'use client';

import type { ReactNode } from 'react';
import { CartProvider } from './CartProvider';
import { resolveCartFixturePricing } from './cart-pricing.fixtures';
import { productCardExamples } from '@/features/product/ProductCard/product-card.fixtures';
import { resolveProductTransferTarget } from './cart-transfer-product.adapter';
import type { ResolveTransferTarget } from './cart.types';

const resolveTransferTarget: ResolveTransferTarget = target =>
  resolveProductTransferTarget(productCardExamples.map(example => example.data), target);

/** Persistent frontend-only application boundary; no DOM wrapper or persistence. */
export function CartApplicationProvider({ children }: Readonly<{ children: ReactNode }>) {
  return <CartProvider resolvePricing={resolveCartFixturePricing} resolveTransferTarget={resolveTransferTarget}>{children}</CartProvider>;
}
