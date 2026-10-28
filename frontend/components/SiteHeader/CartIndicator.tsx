'use client';

import { useCart } from '@/features/cart/CartProvider';
import styles from './SiteHeader.module.css';

export function CartIndicator() {
  const { hasItems } = useCart();
  return hasItems ? <span className={styles.cartIndicator} data-cart-indicator aria-hidden="true" /> : null;
}
