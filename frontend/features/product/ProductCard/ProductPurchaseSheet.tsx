'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { ProductCardConfiguration } from './ProductCard.types';
import styles from './ProductPurchaseSheet.module.css';

/** Purchase-specific modal. A new mount starts a fresh draft on every opening. */
export function ProductPurchaseSheet({ id, title, options, initialConfiguration, initialQuantity,
  responsive, triggerRef, fallbackRef, onCancel, onConfirm }: Readonly<{
  id: string;
  title: string;
  options: readonly ProductCardConfiguration[];
  initialConfiguration: ProductCardConfiguration;
  initialQuantity: number;
  responsive: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  fallbackRef: RefObject<HTMLButtonElement | null>;
  onCancel: () => void;
  onConfirm: (configuration: ProductCardConfiguration, quantity: number) => void;
}>) {
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [quantity, setQuantity] = useState(initialQuantity);
  const dialog = useRef<HTMLDialogElement>(null);
  const cancel = useRef(onCancel);
  cancel.current = onCancel;
  const restoreFocus = useRef<() => void>(() => {});
  restoreFocus.current = () => {
    const trigger = triggerRef.current;
    const target = trigger?.getClientRects().length ? trigger : fallbackRef.current;
    if (target?.isConnected && target.getClientRects().length) target.focus({ preventScroll: true });
  };
  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const bodyOverflow = document.body.style.overflow;
    const rootOverflow = document.documentElement.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    element.querySelector<HTMLButtonElement>('[aria-pressed="true"]')?.focus();
    // This listener exists only while a responsive card has an open modal.
    const full = responsive ? window.matchMedia('(min-width: 1280px)') : null;
    const closeOnFull = () => { if (full?.matches) cancel.current(); };
    full?.addEventListener('change', closeOnFull);
    closeOnFull();
    return () => {
      full?.removeEventListener('change', closeOnFull);
      element.close();
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = rootOverflow;
      // Confirmation can replace the initial CTA with the quantity edit button.
      requestAnimationFrame(() => restoreFocus.current());
    };
  }, [responsive]);

  return createPortal(
    <dialog ref={dialog} id={id} aria-modal="true" aria-labelledby={`${id}-title`} className={styles.sheet}
      onCancel={event => { event.preventDefault(); onCancel(); }}>
      <div className={styles.header}>
        <div className={styles.handle} aria-hidden="true" />
        <div className={styles.summary}>
          <h2 id={`${id}-title`}>{title}</h2>
          <p aria-live="polite"><span>{configuration.price.current}</span><small>/{configuration.label}</small></p>
        </div>
        <div className={styles.options} role="group" aria-label="Выберите вес">
          {options.map(option => <button key={option.id} type="button" aria-pressed={configuration.id === option.id}
            onClick={() => setConfiguration(option)}>{option.label}</button>)}
        </div>
      </div>
      <div className={styles.actions}>
        <div className={styles.quantity} role="group" aria-label="Количество">
          <button type="button" aria-label="Уменьшить количество" disabled={quantity === 1}
            onClick={() => setQuantity(value => Math.max(1, value - 1))}><span className={styles.minus} aria-hidden="true" /></button>
          <output aria-live="polite">{quantity}</output>
          <button type="button" aria-label="Увеличить количество" onClick={() => setQuantity(value => value + 1)}>
            <span className={styles.plus} aria-hidden="true" />
          </button>
        </div>
        <button className={styles.confirm} type="button" onClick={() => onConfirm(configuration, quantity)}>Добавить в корзину</button>
      </div>
    </dialog>, document.body,
  );
}
