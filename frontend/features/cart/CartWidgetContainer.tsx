'use client';

import { useEffect, useRef } from 'react';
import { useCart } from './CartProvider';
import { toCartWidgetItems } from './cart-widget.adapter';
import { CartWidget } from './CartWidget/CartWidget';
import { captureFocusOwnership } from '@/lib/focus-ownership';
import type { ConfigurationAvailability } from '@/features/product/ProductCard/configuration-contract';

export function CartWidgetContainer({ unavailablePriceLabel, availability = [] }: Readonly<{ unavailablePriceLabel: string; availability?: readonly ConfigurationAvailability[] }>) {
  const cart = useCart();
  // display:contents adds no layout box or stacking context around the fixed widget.
  const host = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<{ itemId: string; focus: ReturnType<typeof captureFocusOwnership> } | null>(null);
  useEffect(() => () => { pendingFocus.current?.focus.dispose(); pendingFocus.current = null; }, []);

  useEffect(() => {
    const request = pendingFocus.current;
    if (!request || cart.items.some(item => item.id === request.itemId)) return;
    pendingFocus.current = null;
    if (cart.hasItems) { request.focus.dispose(); return; } // Non-final removal focus remains owned by the frozen widget.
    if (!request.focus.release()) return;
    const target = document.getElementById('site-header-basket-link');
    if (target?.isConnected && target.getClientRects().length) target.focus({ preventScroll: true });
  }, [cart.items, cart.hasItems]);

  const remove = async (itemId: string) => {
    const active = document.activeElement;
    // A row's focused button is its remove control. Background changes never set this ref.
    const origin = active instanceof HTMLButtonElement && host.current?.contains(active) && active.closest('li') ? active : null;
    pendingFocus.current?.focus.dispose();
    const request = { itemId, focus: captureFocusOwnership(origin) };
    pendingFocus.current = request;
    try {
      const result = await cart.removeItem(itemId);
      if (!result.ok && pendingFocus.current === request) { request.focus.dispose(); pendingFocus.current = null; }
      return result.ok;
    } catch {
      if (pendingFocus.current === request) { request.focus.dispose(); pendingFocus.current = null; }
      // Canonical items remain visible; the container never removes optimistically.
      return false;
    }
  };

  return <div ref={host} style={{ display: 'contents' }}>
    <CartWidget items={toCartWidgetItems(cart.items, unavailablePriceLabel, availability)} onRemoveItem={remove} />
  </div>;
}
