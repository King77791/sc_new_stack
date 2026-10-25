'use client';

import { useState } from 'react';
import { useCart } from '@/features/cart/CartProvider';
import { CartOperations, CartObserver, CartSnapshot } from '../cart-state/CartStateHarness';
import { cartExamples } from '../cart-state/cart-state.fixtures';
import styles from './page.module.css';

export function CartWidgetDiagnostics({ observer = false }: Readonly<{ observer?: boolean }>) {
  const cart = useCart();
  const [pending, setPending] = useState(false);
  const run = async (operation: () => Promise<void>) => {
    setPending(true);
    try { await operation(); } finally { setPending(false); }
  };
  return <>
    <div className={styles.controls}>
      <button type="button" disabled={pending} onClick={() => void run(async () => {
        for (const item of cart.items) await cart.removeItem(item.id);
      })}>Remove all (diagnostic)</button>
      <button type="button" disabled={pending} onClick={() => void run(async () => {
        for (let index = 0; index < 21; index++) {
          const key = `widget-integration-title-${index}`;
          await cart.addItem({ ...cartExamples[0].input, productKey: key,
            presentation: { slug: key, title: index === 0
              ? 'Сверхдлинноенеразрывноеназваниечайногопродуктадляпроверкипереноса'
              : `Чай для проверки переноса полного названия — весенний сбор из высокогорного региона, позиция ${index + 1}`,
            configurationLabel: '50 г.' },
          });
        }
      })}>ADD 21 diagnostic positions</button>
    </div>
    <CartObserver />
    {observer ? <CartSnapshot /> : <CartOperations />}
  </>;
}
