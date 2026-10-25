'use client';

import { createContext, useContext, useRef, useState, type ReactNode } from 'react';
import * as model from './cart.model';
import type { CartItem, CartPublicInterface, ResolveCartPricing } from './cart.types';

const CartContext = createContext<CartPublicInterface | null>(null);

/** In-memory owner only. Mount under a persistent dev layout; no storage or HTTP. */
export function CartProvider({ children, resolvePricing }: Readonly<{
  children: ReactNode;
  resolvePricing: ResolveCartPricing;
}>) {
  const [items, setItems] = useState<readonly CartItem[]>([]);
  // Event handlers read the latest committed transition even before React renders
  // a batch of successive mutations. The ref and render snapshot share the same array.
  const current = useRef(items);
  const publish = (next: readonly CartItem[]) => {
    if (next === current.current) return;
    current.current = next;
    setItems(next);
  };
  const value: CartPublicInterface = {
    items,
    hasItems: items.length > 0,
    itemCount: items.length,
    getItem: (productKey, configuration) => model.getItem(current.current, productKey, configuration),
    getQuantity: (productKey, configuration) => model.getQuantity(current.current, productKey, configuration),
    addItem: async input => {
      const transition = model.addItem(current.current, input, resolvePricing);
      publish(transition.items);
      return transition.result;
    },
    setItemQuantity: async (itemId, quantity) => {
      const transition = model.setItemQuantity(current.current, itemId, quantity, resolvePricing);
      publish(transition.items);
      return transition.result;
    },
    removeItem: async itemId => {
      const transition = model.removeItem(current.current, itemId);
      publish(transition.items);
      return transition.result;
    },
  };
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartPublicInterface {
  const cart = useContext(CartContext);
  if (!cart) throw new Error('useCart must be used inside CartProvider');
  return cart;
}

/** Staged UI integration: render safely outside a Cart boundary, without a local fallback Cart. */
export function useOptionalCart(): CartPublicInterface | null {
  return useContext(CartContext);
}
