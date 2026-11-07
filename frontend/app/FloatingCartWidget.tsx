'use client';

import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

/** Presentation boundary only; the persistent CartProvider remains outside it. */
export function FloatingCartWidget({ children }: Readonly<{ children: ReactNode }>) {
  const pathname = usePathname();
  const hidden = ['/basket', '/checkout'].some(route => pathname === route || pathname.startsWith(`${route}/`));
  return hidden ? null : children;
}
