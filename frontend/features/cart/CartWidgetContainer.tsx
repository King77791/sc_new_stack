'use client';

import { useEffect, useRef } from 'react';
import { useCart } from './CartProvider';
import { toCartWidgetItems } from './cart-widget.adapter';
import { CartWidget } from './CartWidget/CartWidget';

export function CartWidgetContainer({ unavailablePriceLabel }: Readonly<{ unavailablePriceLabel: string }>) {
  const cart = useCart();
  // display:contents adds no layout box or stacking context around the fixed widget.
  const host = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    const origin = pendingFocus.current;
    if (!origin) return;
    pendingFocus.current = null;
    if (cart.hasItems) return; // Non-final removal focus remains owned by the frozen widget.
    const active = document.activeElement;
    // Do not steal focus if the user moved elsewhere while removal was pending.
    if (active !== origin && (origin.isConnected || active !== document.body)) return;
    const target = document.getElementById('site-header-basket-link');
    if (target?.isConnected && target.getClientRects().length) target.focus({ preventScroll: true });
  }, [cart.items, cart.hasItems]);

  const remove = async (itemId: string) => {
    const active = document.activeElement;
    // A row's focused button is its remove control. Background changes never set this ref.
    const origin = active instanceof HTMLButtonElement && host.current?.contains(active) && active.closest('li') ? active : null;
    pendingFocus.current = origin;
    try {
      const result = await cart.removeItem(itemId);
      if (!result.ok && pendingFocus.current === origin) pendingFocus.current = null;
    } catch {
      if (pendingFocus.current === origin) pendingFocus.current = null;
      // Canonical items remain visible; the container never removes optimistically.
    }
  };

  return <div ref={host} style={{ display: 'contents' }}>
    <CartWidget items={toCartWidgetItems(cart.items, unavailablePriceLabel)} onRemoveItem={id => void remove(id)} />
  </div>;
}
