'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { CartProvider, useCart } from '@/features/cart/CartProvider';
import { CartOperations, CartObserver } from '../cart-state/CartStateHarness';
import { cartExamples, resolveDevPricing } from '../cart-state/cart-state.fixtures';
import styles from './page.module.css';

export function ProductCartHarness({ children }: Readonly<{ children: ReactNode }>) {
  const [generation, setGeneration] = useState(0);
  const [failPricing, setFailPricing] = useState(false);
  const fail = useRef(false);
  return <main className={styles.demo}>
    <h1>ProductCard → shared Cart · integration QA</h1>
    <p>Карточки A/B — один товар с независимой selection и общей Cart quantity. Provider существует только на этой dev-странице.</p>
    <div className={styles.controls}>
      <button type="button" onClick={() => setGeneration(value => value + 1)}>Reset integration</button>
      <label><input type="checkbox" checked={failPricing} onChange={event => {
        fail.current = event.target.checked; setFailPricing(event.target.checked);
      }} /> Fail local quote (ADD/SET)</label>
    </div>
    <CartProvider key={generation} resolvePricing={item => {
      if (fail.current) throw new Error('Explicit dev quote failure');
      return resolveDevPricing(item);
    }}>
      <ExternalDraftChange />
      <div className={styles.cards}>{children}</div>
      <CartObserver />
      <CartOperations />
    </CartProvider>
  </main>;
}

/** A scheduled mutation can run while native dialog makes background controls inert. */
function ExternalDraftChange() {
  const cart = useCart();
  const [scheduled, setScheduled] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  return <div className={styles.controls}>
    <button type="button" disabled={scheduled} onClick={() => {
      setScheduled(true);
      timer.current = setTimeout(() => {
        void cart.addItem(cartExamples[0].input).finally(() => setScheduled(false));
        timer.current = null;
      }, 3000);
    }}>External ADD 50 in 3 seconds</button>
    <span role="status">{scheduled ? 'External mutation scheduled' : ''}</span>
  </div>;
}
