'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { CartProvider, useCart } from '@/features/cart/CartProvider';
import { cartExamples, resolveDevPricing } from './cart-state.fixtures';
import styles from './page.module.css';

/** Dev-only remount controls, outside the Cart public interface. */
export function CartStateHarness({ children }: Readonly<{ children: ReactNode }>) {
  const [generation, setGeneration] = useState(0);
  return <main className={styles.demo}>
    <h1>Cart domain · isolated QA</h1>
    <p>In-memory Cart. Нет production integration, persistence, stock validation или pricing engine.</p>
    <button type="button" onClick={() => setGeneration(value => value + 1)}>Remount Provider (reset)</button>
    <CartProvider key={generation} resolvePricing={resolveDevPricing}>
      <nav className={styles.controls} aria-label="Dev Cart navigation">
        <Link href="/dev/cart-state">Операции</Link>
        <Link href="/dev/cart-state/observer">Observer route</Link>
      </nav>
      <CartObserver />
      {children}
    </CartProvider>
  </main>;
}

export function CartObserver() {
  const cart = useCart();
  const [mount, setMount] = useState(0);
  return <section className={styles.panel} aria-label="Shared observer">
    <h2>Независимый consumer</h2>
    <p data-testid="summary">itemCount = {cart.itemCount}; hasItems = {String(cart.hasItems)}</p>
    <button type="button" onClick={() => setMount(value => value + 1)}>Remount consumer</button>
    <QuantityObserver key={mount} />
  </section>;
}

function QuantityObserver() {
  const cart = useCart();
  return <ul data-testid="quantities">{cartExamples.map(example => <li key={example.label}>
    {example.label}: <output>{cart.getQuantity(example.input.productKey, example.input.configuration)}</output>
  </li>)}</ul>;
}

export function CartOperations() {
  const cart = useCart();
  const [target, setTarget] = useState(0);
  const [amount, setAmount] = useState('1');
  const [result, setResult] = useState<unknown>(null);
  const [pending, setPending] = useState(false);
  const example = cartExamples[target];
  const selected = cart.getItem(example.input.productKey, example.input.configuration);
  const run = async (operation: () => Promise<unknown>) => {
    setPending(true);
    try { setResult(await operation()); }
    finally { setPending(false); }
  };
  return <>
    <section className={styles.panel} aria-label="Cart operations">
      <h2>Mutations</h2>
      <div className={styles.controls}>
        <label>Target <select value={target} onChange={event => setTarget(Number(event.target.value))}>
          {cartExamples.map((entry, index) => <option value={index} key={entry.label}>{entry.label}</option>)}
        </select></label>
        <label>Quantity <input type="text" inputMode="decimal" value={amount} onChange={event => setAmount(event.target.value)} /></label>
      </div>
      <p>SET и REMOVE отсутствующей строки возвращают not-found. Zero не удаляет строку.</p>
      <div className={styles.controls}>
        <button type="button" disabled={pending} onClick={() => void run(() => cart.addItem({ ...example.input, quantity: Number(amount) }))}>ADD target</button>
        <button type="button" disabled={pending} onClick={() => void run(() => cart.setItemQuantity(selected?.id ?? 'missing', Number(amount)))}>SET target</button>
        <button type="button" disabled={pending} onClick={() => void run(() => cart.removeItem(selected?.id ?? 'missing'))}>REMOVE target</button>
        <button type="button" disabled={pending} onClick={() => void run(async () => {
          const first = cart.addItem(example.input);
          const second = cart.addItem(example.input);
          return Promise.all([first, second]);
        })}>ADD twice in one batch</button>
        <button type="button" disabled={pending} onClick={() => void run(() => cart.addItem({
          ...example.input, quantity: Number(amount),
          presentation: { ...example.input.presentation, title: `${example.input.presentation.title} (snapshot refreshed)` },
        }))}>ADD with refreshed title</button>
      </div>
      <p>Pricing fixture ограничена несколькими готовыми totals. status unavailable означает отсутствие dev quote; quantity проверяется независимо.</p>
      <h3>Последний mutation result</h3>
      <pre data-testid="result" aria-live="polite">{JSON.stringify(result, null, 2)}</pre>
    </section>
    <CartSnapshot />
  </>;
}

export function CartSnapshot() {
  const cart = useCart();
  return <section className={styles.panel} aria-label="Cart snapshot">
    <h2>Canonical items</h2>
    <pre data-testid="items">{JSON.stringify(cart.items, null, 2)}</pre>
  </section>;
}
