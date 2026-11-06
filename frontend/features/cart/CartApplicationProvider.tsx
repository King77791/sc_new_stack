'use client';

import type { ReactNode } from 'react';
import { CartProvider } from './CartProvider';
import { applicationProductInputs } from '@/features/product-input/product-input.application';

/** Persistent frontend-only application boundary; no DOM wrapper or persistence. */
export function CartApplicationProvider({ children }: Readonly<{ children: ReactNode }>) {
  return <CartProvider resolvePricing={applicationProductInputs.resolvePricing} resolveTransferTarget={applicationProductInputs.resolveTransferTarget}>{children}</CartProvider>;
}
