'use client';

import { useEffect, useRef, useState, type PointerEvent, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import type { ProductCardConfiguration } from './ProductCard.types';
import styles from './ProductPurchaseSheet.module.css';

/** Purchase-specific modal. A new mount starts a fresh draft on every opening. */
export function ProductPurchaseSheet({ id, title, options, initialConfiguration, initialQuantity,
  getTargetQuantity, responsive, triggerRef, fallbackRef, onCancel, onConfirm }: Readonly<{
  id: string;
  title: string;
  options: readonly ProductCardConfiguration[];
  initialConfiguration: ProductCardConfiguration;
  initialQuantity: number;
  getTargetQuantity: (configuration: ProductCardConfiguration) => number;
  responsive: boolean;
  triggerRef: RefObject<HTMLButtonElement | null>;
  fallbackRef: RefObject<HTMLButtonElement | null>;
  onCancel: () => void;
  onConfirm: (configuration: ProductCardConfiguration, quantity: number) => Promise<boolean>;
}>) {
  const [configuration, setConfiguration] = useState(initialConfiguration);
  const [quantity, setQuantity] = useState(initialQuantity);
  const confirming = useRef(false);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState(false);
  const confirm = async () => {
    if (confirming.current || configuration.disabled) return;
    confirming.current = true;
    setPending(true);
    setFailed(false);
    try { setFailed(!await onConfirm(configuration, quantity)); }
    catch { setFailed(true); }
    finally { confirming.current = false; setPending(false); }
  };
  const dialog = useRef<HTMLDialogElement>(null);
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);
  const suppressHandleClick = useRef(false);
  const [dragOffset, setDragOffset] = useState(0);
  const moveHandle = (event: PointerEvent<HTMLButtonElement>) => {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    const dx = Math.abs(event.clientX - start.x);
    const dy = event.clientY - start.y;
    if (Math.max(dx, Math.abs(dy)) > 8) suppressHandleClick.current = true;
    setDragOffset(dy > dx * 1.5 ? Math.max(0, dy) : 0);
  };
  const finishGesture = (event: PointerEvent<HTMLButtonElement>, cancelled = false) => {
    const start = gesture.current;
    if (!start || start.id !== event.pointerId) return;
    gesture.current = null;
    setDragOffset(0);
    const dx = Math.abs(event.clientX - start.x);
    const dy = event.clientY - start.y;
    if (Math.max(dx, Math.abs(dy)) > 8) suppressHandleClick.current = true;
    if (!cancelled && dy >= 64 && dy > dx * 1.5) onCancel();
  };
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
      style={{ transform: `translateY(${dragOffset}px)` }} data-dragging={dragOffset > 0 || undefined}
      onCancel={event => { event.preventDefault(); onCancel(); }}>
      <div className={styles.header}>
        <div className={styles.topControls}>
          <button type="button" className={styles.handle} aria-label="Закрыть выбор товара"
            onPointerDown={event => {
              suppressHandleClick.current = false;
              if (event.pointerType === 'mouse' || !event.isPrimary) return;
              gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerMove={moveHandle} onPointerUp={event => finishGesture(event)}
            onPointerCancel={event => finishGesture(event, true)}
            onLostPointerCapture={event => finishGesture(event, true)}
            onKeyDown={() => { suppressHandleClick.current = false; }}
            onClick={() => {
              if (!suppressHandleClick.current) onCancel();
              suppressHandleClick.current = false;
            }} />
          <button type="button" className={styles.close} aria-label="Закрыть панель" onClick={onCancel}><span aria-hidden="true">×</span></button>
        </div>
        <div className={styles.summary}>
          <h2 id={`${id}-title`}>{title}</h2>
          <p aria-live="polite"><span>{configuration.price.current}</span><small>/{configuration.label}</small></p>
        </div>
        <div className={styles.options} role="group" aria-label="Выберите вес">
          {options.map(option => <button key={option.id} type="button" disabled={option.disabled || pending}
            aria-pressed={!option.disabled && configuration.id === option.id}
            onClick={() => {
              if (option.disabled || option.id === configuration.id) return;
              setConfiguration(option); setQuantity(getTargetQuantity(option)); setFailed(false);
            }}>{option.label}</button>)}
        </div>
      </div>
      <div className={styles.actions}>
        <div className={styles.quantity} role="group" aria-label="Количество">
          <button type="button" aria-label="Уменьшить количество" disabled={quantity === 1 || pending}
            onClick={() => setQuantity(value => Math.max(1, value - 1))}><span className={styles.minus} aria-hidden="true" /></button>
          <output aria-live="polite">{quantity}</output>
          <button type="button" aria-label="Увеличить количество" disabled={pending} onClick={() => setQuantity(value => value + 1)}>
            <span className={styles.plus} aria-hidden="true" />
          </button>
        </div>
        <button className={styles.confirm} type="button" disabled={pending} aria-busy={pending}
          onClick={() => void confirm()}>Добавить в корзину</button>
      </div>
      {failed && <p role="alert">Не удалось сохранить изменения. Повторите попытку.</p>}
    </dialog>, document.body,
  );
}
