'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useOptionalCart } from '@/features/cart/CartProvider';
import type { ConfigurationKey, MutationResult, SuccessfulAdd } from '@/features/cart/cart.types';
import { useNotification } from '@/components/Notification/NotificationProvider';
import { cartAddedEvent } from '@/components/Notification/notification.types';
import type { ProductCardConfiguration, ProductCardData, ProductCardPresentation } from './ProductCard.types';
import styles from './ProductCard.module.css';
import { ProductPurchaseSheet } from './ProductPurchaseSheet';

function ConfigurationControl({ options, selected, onSelect }: Readonly<{
  options: readonly ProductCardConfiguration[];
  selected: ProductCardConfiguration;
  onSelect: (option: ProductCardConfiguration) => void;
}>) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | undefined>(selected.id);
  const enabledOptions = options.filter(option => !option.disabled);
  const activeOption = enabledOptions.find(option => option.id === activeId)
    ?? enabledOptions.find(option => option.id === selected.id);
  const active = options.findIndex(option => option.id === activeOption?.id);
  const enabledIndex = enabledOptions.findIndex(option => option.id === activeOption?.id);
  if (activeId !== activeOption?.id) setActiveId(activeOption?.id);
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
  const choose = (option: ProductCardConfiguration | undefined) => { if (!option || option.disabled) return; onSelect(option); close(); };
  const show = () => { setActiveId(selected.id); setOpen(true); };
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
          id={id} ref={list} tabIndex={0} aria-activedescendant={activeOption ? `${id}-${active}` : undefined}
          onKeyDown={(event) => {
            switch (event.key) {
              case 'Escape': event.preventDefault(); close(); break;
              case 'ArrowDown': event.preventDefault(); setActiveId(enabledOptions[(enabledIndex + 1) % enabledOptions.length]?.id); break;
              case 'ArrowUp': event.preventDefault(); setActiveId(enabledOptions[(enabledIndex - 1 + enabledOptions.length) % enabledOptions.length]?.id); break;
              case 'Home': event.preventDefault(); setActiveId(enabledOptions[0]?.id); break;
              case 'End': event.preventDefault(); setActiveId(enabledOptions[enabledOptions.length - 1]?.id); break;
              case 'Enter': case ' ': event.preventDefault(); choose(activeOption); break;
            }
          }}>
          {options.map((option, index) => (
            <li key={option.id} id={`${id}-${index}`} role="option"
              aria-selected={!option.disabled && option.id === selected.id} aria-disabled={option.disabled || undefined}
              data-active={!option.disabled && index === active}
              onPointerMove={() => { if (!option.disabled) setActiveId(option.id); }} onClick={() => choose(option)}>{option.label}</li>
          ))}
        </ul>
      )}
    </div>
  );
}


/** Selection is local UI state; confirmed quantities belong exclusively to Cart. */
export function ProductCardPurchase({ productKey, data, presentation, children }: Readonly<{
  productKey: string;
  data: Pick<ProductCardData, 'slug' | 'title' | 'price' | 'purchasePresentation' | 'weight'>;
  presentation: ProductCardPresentation;
  children: ReactNode;
}>) {
  const cart = useOptionalCart();
  const notify = useNotification();
  const preorder = data.purchasePresentation === 'preorder';
  const options = !preorder && data.weight?.presentation === 'selectable' ? data.weight.configurations : undefined;
  // An unavailable initial configuration needs an explicit API/business decision, not a UI fallback.
  const [selectedId, setSelectedId] = useState(options?.find(option => option.label === data.weight?.label && !option.disabled)?.id);
  const selected = options?.find(option => option.id === selectedId && !option.disabled);
  const configuration: ConfigurationKey | undefined = options
    ? selected && { kind: 'selectable', id: selected.id }
    : { kind: 'fixed' };
  const quantity = configuration ? cart?.getQuantity(productKey, configuration) ?? 0 : 0;
  const [sheetOpen, setSheetOpen] = useState(false);
  const sheetSession = useRef(0);
  const mutationPending = useRef(false);
  const [pending, setPending] = useState(false);
  const price = selected?.price ?? data.price;
  const trigger = useRef<HTMLButtonElement>(null);
  const fullAction = useRef<HTMLButtonElement>(null);
  const compactPlus = useRef<HTMLButtonElement>(null);
  const quantityAction = useRef<'add' | 'remove' | null>(null);
  const sheetId = useId();
  useEffect(() => {
    if (pending) return;
    if (quantityAction.current === 'add') compactPlus.current?.focus();
    if (quantityAction.current === 'remove') trigger.current?.focus();
    quantityAction.current = null;
  }, [quantity, pending]);
  const openSheet = (event: { currentTarget: HTMLButtonElement }) => {
    if (cart && options && selected && !preorder) { sheetSession.current += 1; trigger.current = event.currentTarget; setSheetOpen(true); }
  };
  const closeSheet = () => { sheetSession.current += 1; setSheetOpen(false); };
  const changeInline = (option: ProductCardConfiguration) => {
    if (option.disabled) return;
    if (option.id !== selected?.id) setSelectedId(option.id);
  };
  const snapshot = (option?: ProductCardConfiguration) => ({
    slug: data.slug, title: data.title, configurationLabel: option?.label ?? data.weight?.label,
  });
  const mutate = async <T,>(operation: () => Promise<MutationResult<T>>, focus: 'add' | 'remove' | null = null) => {
    if (mutationPending.current) return;
    mutationPending.current = true;
    quantityAction.current = focus;
    setPending(true);
    try {
      const result = await operation();
      if (!result.ok) quantityAction.current = null;
      return result;
    } catch {
      quantityAction.current = null;
      return undefined;
    } finally {
      mutationPending.current = false;
      setPending(false);
    }
  };
  const reportAdd = async (operation: Promise<MutationResult<SuccessfulAdd>>) => {
    const result = await operation;
    if (result.ok) notify(cartAddedEvent(result.value));
    return result;
  };
  const add = (focus: 'add' | null = null) => {
    if (!cart || !configuration || preorder) return;
    return mutate(() => reportAdd(cart.addItem({ productKey, configuration, quantity: 1, presentation: snapshot(selected) })), focus);
  };
  const decrementFixed = () => {
    if (!cart || !configuration || options || preorder) return;
    const item = cart.getItem(productKey, configuration);
    if (!item) return;
    return item.quantity === 1
      ? mutate(() => cart.removeItem(item.id), 'remove')
      : mutate(() => cart.setItemQuantity(item.id, item.quantity - 1));
  };
  return (
    <>
      <div className={styles.content}>
        {children}
        {price.discount && <div className={styles.originalPrice}>
          <del><span className={styles.srOnly}>Цена без скидки: </span>{price.discount.original}</del>
          <span className={styles.fullOnly}>{price.discount.label}</span>
        </div>}
        <p className={styles.price} aria-live={options ? 'polite' : undefined} aria-atomic="true">
          <span className={styles.srOnly}>Цена: </span>{price.current}
        </p>
        {preorder ? <>
          <span className={`${styles.preorderLabel} ${styles.fullOnly}`}>Предзаказ</span>
          {data.weight && <span className={`${styles.weight} ${styles.compactOnly}`}><span className={styles.srOnly}>Вес: </span>{data.weight.label}</span>}
        </> : selected && options ? <>
          <div className={styles.fullOnly} style={{ display: 'contents' }}>
            <ConfigurationControl options={options} selected={selected} onSelect={changeInline} />
          </div>
          <span className={`${styles.weight} ${styles.compactOnly}`}><span className={styles.srOnly}>Вес: </span>{selected.label}</span>
        </> : data.weight ? <span className={styles.weight}><span className={styles.srOnly}>Вес: </span>{data.weight.label}</span> : null}
      </div>
      {price.discount && <span className={styles.discountBadge}>{price.discount.label}</span>}
      {preorder ? <div className={`${styles.preorderBar} ${styles.compactOnly}`}>Предзаказ</div> : <>
        <button ref={fullAction} className={`${styles.cart} ${styles.fullOnly} ${quantity > 0 ? styles.cartAdded : ''}`} type="button"
          disabled={!cart || pending || Boolean(options && !selected)}
          aria-label={`${quantity > 0 ? `Добавить ещё, выбрано ${quantity}` : 'В корзину'}: ${data.title}`}
          onClick={() => void add()}>
          {quantity > 0 ? <span className={styles.filledCartIcon} aria-hidden="true">
            <Image className={styles.cartBody} src="/icons/product/cart-filled-body.svg" alt="" width={24} height={25} />
            <Image className={styles.cartOutline} src="/icons/product/cart-filled-outline.svg" alt="" width={29} height={35} />
            <span>{quantity}</span>
          </span> : <span className={styles.cartIcon}><Image src="/icons/product/cart.svg" alt="" width={25} height={31} /></span>}
          <span className={styles.srOnly} role="status">{quantity > 0 ? `В корзине: ${quantity}` : ''}</span>
        </button>
        {quantity > 0 ? <div className={`${styles.quantityBar} ${styles.compactOnly}`} role="group" aria-label={`Количество: ${data.title}`}>
          <button ref={options ? trigger : undefined} type="button"
            disabled={pending}
            aria-label={options ? `Открыть управление товаром и количеством: ${data.title}` : 'Уменьшить количество'}
            aria-haspopup={options ? 'dialog' : undefined} aria-controls={sheetOpen ? sheetId : undefined}
            onClick={options ? openSheet : () => void decrementFixed()}><Image src="/icons/product/quantity-minus.svg" alt="" width={14} height={2} /></button>
          <span role="status">{quantity}</span>
          <button ref={compactPlus} type="button"
            disabled={pending}
            aria-label={options ? `Открыть управление товаром и количеством: ${data.title}` : 'Увеличить количество'}
            aria-haspopup={options ? 'dialog' : undefined} aria-controls={sheetOpen ? sheetId : undefined}
            onClick={options ? openSheet : () => void add()}>
            <Image src="/icons/product/quantity-plus.svg" alt="" width={12} height={12} />
          </button>
        </div> : <button ref={trigger} type="button" className={`${styles.cart} ${styles.compactOnly}`}
          disabled={!cart || pending || Boolean(options && !selected)}
          aria-label={`${options ? 'Добавить в корзину' : 'В корзину'}: ${data.title}`}
          aria-haspopup={options ? 'dialog' : undefined} aria-controls={sheetOpen ? sheetId : undefined}
          onClick={options ? openSheet : () => void add('add')}>
          <span>В корзину</span><span className={styles.cartIcon}><Image src="/icons/product/cart.svg" alt="" width={25} height={31} /></span>
        </button>}
      </>}
      {sheetOpen && cart && selected && options && !preorder && <ProductPurchaseSheet id={sheetId} title={data.title}
        options={options} initialConfiguration={selected} initialQuantity={quantity > 0 ? quantity : 1}
        getTargetQuantity={option => cart.getQuantity(productKey, { kind: 'selectable', id: option.id }) || 1}
        responsive={presentation === 'responsive'} triggerRef={trigger} fallbackRef={fullAction}
        onCancel={closeSheet} onConfirm={async (option, amount) => {
          if (!options.some(current => current.id === option.id && !current.disabled)) return false;
          const session = sheetSession.current;
          const target = { kind: 'selectable' as const, id: option.id };
          const item = cart.getItem(productKey, target);
          const result = item
            ? await mutate(() => cart.setItemQuantity(item.id, amount))
            : await mutate(() => reportAdd(cart.addItem({ productKey, configuration: target, quantity: amount, presentation: snapshot(option) })));
          if (!result?.ok || session !== sheetSession.current) return false;
          setSelectedId(option.id); closeSheet();
          return true;
        }} />}
    </>
  );
}
