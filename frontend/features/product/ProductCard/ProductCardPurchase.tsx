'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { ProductCardConfiguration, ProductCardData, ProductCardPresentation } from './ProductCard.types';
import styles from './ProductCard.module.css';

function ConfigurationControl({ options, selected, onSelect }: Readonly<{
  options: readonly ProductCardConfiguration[];
  selected: ProductCardConfiguration;
  onSelect: (option: ProductCardConfiguration) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    list.current?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open]);
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const choose = (option: ProductCardConfiguration) => { onSelect(option); close(); };
  const show = () => { setActive(options.findIndex(option => option.id === selected.id)); setOpen(true); };
  return (
    <div className={styles.weightControl} ref={root} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      <button type="button" className={styles.weight} ref={trigger}
        aria-label={`Выбранный вес: ${selected.label}`} aria-haspopup="listbox"
        aria-expanded={open} aria-controls={open ? id : undefined}
        onClick={() => open ? close() : show()} onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); show(); }
        }}>
        <span>{selected.label}</span>
        <Image src="/icons/product/weight-chevron.svg" alt="" width={12} height={12} />
      </button>
      {open && (
        <ul className={styles.weightMenu} role="listbox" aria-label="Выберите вес"
          id={id} ref={list} tabIndex={0} aria-activedescendant={`${id}-${active}`}
          onKeyDown={(event) => {
            switch (event.key) {
              case 'Escape': event.preventDefault(); close(); break;
              case 'ArrowDown': event.preventDefault(); setActive((active + 1) % options.length); break;
              case 'ArrowUp': event.preventDefault(); setActive((active - 1 + options.length) % options.length); break;
              case 'Home': event.preventDefault(); setActive(0); break;
              case 'End': event.preventDefault(); setActive(options.length - 1); break;
              case 'Enter': case ' ': event.preventDefault(); choose(options[active]); break;
            }
          }}>
          {options.map((option, index) => (
            <li key={option.id} id={`${id}-${index}`} role="option"
              aria-selected={option.id === selected.id} data-active={index === active}
              onPointerMove={() => setActive(index)} onClick={() => choose(option)}>{option.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

function CartAction({ compact, title }: Readonly<{ compact: boolean; title: string }>) {
  const [quantity, setQuantity] = useState(0);
  const addButton = useRef<HTMLButtonElement>(null);
  const plusButton = useRef<HTMLButtonElement>(null);
  const returnFocus = useRef(false);
  const focusQuantity = useRef(false);
  useEffect(() => {
    if (quantity === 0 && returnFocus.current) {
      addButton.current?.focus();
      returnFocus.current = false;
    }
    if (quantity > 0 && focusQuantity.current) {
      plusButton.current?.focus();
      focusQuantity.current = false;
    }
  }, [quantity]);
  // UI-only quantity: no stock authority, persistence or shared cart state.
  if (compact && quantity > 0) return (
    <div className={styles.quantityBar} role="group" aria-label={`Количество: ${title}`}>
      <button type="button" aria-label="Уменьшить количество" onClick={() => {
        returnFocus.current = quantity === 1;
        setQuantity(quantity - 1);
      }}>
        <Image src="/icons/product/quantity-minus.svg" alt="" width={14} height={2} />
      </button>
      <span role="status" aria-live="polite">{quantity}</span>
      <button type="button" ref={plusButton} aria-label="Увеличить количество" onClick={() => setQuantity(quantity + 1)}>
        <Image src="/icons/product/quantity-plus.svg" alt="" width={12} height={12} />
      </button>
    </div>
  );
  return (
    <button className={`${styles.cart} ${quantity > 0 ? styles.cartAdded : ''}`} type="button" ref={addButton}
      aria-label={`${quantity > 0 ? `Добавить ещё, выбрано ${quantity}` : 'В корзину'}: ${title}`}
      onClick={() => { focusQuantity.current = compact; setQuantity(quantity + 1); }}>
      {compact && <span>В корзину</span>}
      {quantity > 0 ? (
        <span className={styles.filledCartIcon} aria-hidden="true">
          <Image className={styles.cartBody} src="/icons/product/cart-filled-body.svg" alt="" width={24} height={25} />
          <Image className={styles.cartOutline} src="/icons/product/cart-filled-outline.svg" alt="" width={29} height={35} />
          <span>{quantity}</span>
        </span>
      ) : <span className={styles.cartIcon}><Image src="/icons/product/cart.svg" alt="" width={25} height={31} /></span>}
      <span className={styles.srOnly} role="status" aria-live="polite">{quantity > 0 ? `Локально выбрано: ${quantity}` : ''}</span>
    </button>
  );
}

/** One state boundary for configuration, prepared price and its local Cart presentation. */
export function ProductCardPurchase({ data, presentation, children }: Readonly<{
  data: Pick<ProductCardData, 'title' | 'price' | 'purchasePresentation' | 'weight'>;
  presentation: ProductCardPresentation;
  children: ReactNode;
}>) {
  const compact = presentation === 'compact';
  const preorder = data.purchasePresentation === 'preorder';
  const options = !compact && !preorder && data.weight?.presentation === 'selectable'
    ? data.weight.configurations : undefined;
  const [selectedId, setSelectedId] = useState(options?.find(option => option.label === data.weight?.label)?.id ?? options?.[0].id);
  const selected = options?.find(option => option.id === selectedId) ?? options?.[0];
  const price = selected?.price ?? data.price;
  const discount = price.discount;
  return (
    <>
      <div className={styles.content}>
        {children}
        {discount && <div className={styles.originalPrice}>
          <del><span className={styles.srOnly}>Цена без скидки: </span>{discount.original}</del>
          {!compact && <span>{discount.label}</span>}
        </div>}
        <p className={styles.price} aria-live={options ? 'polite' : undefined} aria-atomic="true">
          <span className={styles.srOnly}>Цена: </span>{price.current}
        </p>
        {!compact && preorder ? <span className={styles.preorderLabel}>Предзаказ</span>
          : selected && options ? <ConfigurationControl options={options} selected={selected} onSelect={option => setSelectedId(option.id)} />
          : data.weight ? <span className={styles.weight}><span className={styles.srOnly}>Вес: </span>{data.weight.label}</span> : null}
      </div>
      {preorder ? compact && <div className={styles.preorderBar}>Предзаказ</div>
        : <CartAction key={selected?.id ?? 'static'} compact={compact} title={data.title} />}
    </>
  );
}
