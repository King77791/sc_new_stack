'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { useOptionalCart } from '@/features/cart/CartProvider';
import type { ConfigurationKey, MutationResult, SuccessfulAdd } from '@/features/cart/cart.types';
import { useNotification } from '@/components/Notification/NotificationProvider';
import { cartAddedEvent } from '@/components/Notification/notification.types';
import type { ProductCardConfiguration, ProductCardData, ProductCardPresentation } from './ProductCard.types';
import styles from './ProductCard.module.css';
import { ProductPurchaseSheet } from './ProductPurchaseSheet';
import { createPendingFeedback } from './pending-feedback';
import { sheetConfirmAction } from './purchase-sheet-draft';
import { captureFocusOwnership } from '@/lib/focus-ownership';
import { normalizeConfigurations, canRequestQuantity } from './configuration-contract';

function ConfigurationControl({ options, selected, onSelect, triggerRef: trigger }: Readonly<{
  options: readonly ProductCardConfiguration[];
  selected: ProductCardConfiguration;
  onSelect: (option: ProductCardConfiguration) => void;
  triggerRef: RefObject<HTMLButtonElement | null>;
}>) {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | undefined>(selected.id);
  const enabledOptions = options;
  const activeOption = enabledOptions.find(option => option.id === activeId)
    ?? enabledOptions.find(option => option.id === selected.id);
  const active = options.findIndex(option => option.id === activeOption?.id);
  const enabledIndex = enabledOptions.findIndex(option => option.id === activeOption?.id);
  if (activeId !== activeOption?.id) setActiveId(activeOption?.id);
  const root = useRef<HTMLDivElement>(null);
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
  const choose = (option: ProductCardConfiguration | undefined) => { if (!option) return; onSelect(option); close(); };
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
              aria-selected={option.id === selected.id} aria-label={`${option.label}${option.disabled ? ', Нет в наличии' : ''}`}
              data-unavailable={option.disabled || undefined} data-active={index === active}
              onPointerMove={() => setActiveId(option.id)} onClick={() => choose(option)}>{option.label}</li>
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
  const options = !preorder && data.weight?.presentation === 'selectable' ? normalizeConfigurations(data.weight.configurations) : undefined;
  const latestOptions = useRef(options);
  latestOptions.current = options;
  const [selectedId, setSelectedId] = useState(options?.find(option => option.weightGrams === 50)?.id);
  const selectionIntent = useRef(0);
  const lifecycle = useRef(0);
  const commitSelection = (id: string) => { selectionIntent.current += 1; setSelectedId(id); };
  const selected = options?.find(option => option.id === selectedId);
  const configuration: ConfigurationKey | undefined = options
    ? selected && { kind: 'selectable', id: selected.id }
    : { kind: 'fixed' };
  const quantity = configuration ? cart?.getQuantity(productKey, configuration) ?? 0 : 0;
  const [sheetOpen, setSheetOpen] = useState<'compact' | 'full' | null>(null);
  const sheetSession = useRef(0);
  const mutationPending = useRef(false);
  const [pending, setPending] = useState(false);
  const [pendingVisible, setPendingVisible] = useState(false);
  const pendingFeedback = useRef<ReturnType<typeof createPendingFeedback> | null>(null);
  const [selectionTransition, setSelectionTransition] = useState(false);
  const confirmedControls = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const feedback = createPendingFeedback(setPendingVisible);
    pendingFeedback.current = feedback;
    return () => { feedback.dispose(); pendingFeedback.current = null; };
  }, []);
  useEffect(() => {
    if (!selectionTransition) return;
    let current = true;
    // Also clear the occurrence when motion is reduced or compact controls are hidden.
    const animations = confirmedControls.current?.getAnimations() ?? [];
    void Promise.allSettled(animations.map(animation => animation.finished)).then(() => {
      if (current) setSelectionTransition(false);
    });
    return () => { current = false; };
  }, [selectionTransition]);
  const price = selected?.price ?? data.price;
  const trigger = useRef<HTMLButtonElement>(null);
  const fullAction = useRef<HTMLButtonElement>(null);
  const fullSelection = useRef<HTMLButtonElement>(null);
  const compactPlus = useRef<HTMLButtonElement>(null);
  const compactMinus = useRef<HTMLButtonElement>(null);
  const quantityAction = useRef<{
    kind: 'add' | 'remove' | 'minus' | 'plus';
    focus: ReturnType<typeof captureFocusOwnership>;
  } | null>(null);
  useEffect(() => () => {
    lifecycle.current += 1;
    selectionIntent.current += 1;
    sheetSession.current += 1;
    quantityAction.current?.focus.dispose();
    quantityAction.current = null;
  }, []);
  const sheetId = useId();
  useEffect(() => {
    if (pending) return;
    const action = quantityAction.current;
    quantityAction.current = null;
    if (!action?.focus.release()) return;
    const preferred = action.kind === 'add' || action.kind === 'plus' ? compactPlus.current
      : action.kind === 'minus' ? compactMinus.current : quantity > 0 ? compactMinus.current : trigger.current;
    [preferred, trigger.current, fullAction.current].find(control =>
      control?.isConnected && !control.disabled && control.getClientRects().length)?.focus();
  }, [quantity, pending]);
  const openSheet = (event: { currentTarget: HTMLButtonElement }) => {
    if (!mutationPending.current && cart && options && selected && !preorder) {
      sheetSession.current += 1;
      if (event.currentTarget !== fullAction.current) trigger.current = event.currentTarget;
      setSheetOpen(event.currentTarget === fullAction.current ? 'full' : 'compact');
    }
  };
  const closeSheet = () => { sheetSession.current += 1; setSheetOpen(null); };
  const changeInline = (option: ProductCardConfiguration) => {
    commitSelection(option.id);
  };
  const snapshot = (option?: ProductCardConfiguration) => ({
    slug: data.slug, title: data.title, configurationLabel: option?.label ?? data.weight?.label,
  });
  const mutate = async <T,>(operation: () => Promise<MutationResult<T>>, focus: 'add' | 'remove' | 'minus' | 'plus' | null = null) => {
    if (mutationPending.current) return;
    const owner = lifecycle.current;
    mutationPending.current = true;
    quantityAction.current?.focus.dispose();
    quantityAction.current = focus ? { kind: focus, focus: captureFocusOwnership(
      focus === 'add' ? trigger.current : focus === 'plus' ? compactPlus.current : compactMinus.current,
    ) } : null;
    setSelectionTransition(false);
    if (!sheetOpen) pendingFeedback.current?.start();
    setPending(true);
    try {
      const result = await operation();
      if (!result.ok) { quantityAction.current?.focus.dispose(); quantityAction.current = null; }
      return result;
    } catch {
      quantityAction.current?.focus.dispose(); quantityAction.current = null;
      return undefined;
    } finally {
      mutationPending.current = false;
      pendingFeedback.current?.finish();
      if (owner === lifecycle.current) setPending(false);
    }
  };
  const reportAdd = async (operation: Promise<MutationResult<SuccessfulAdd>>) => {
    const result = await operation;
    if (result.ok) notify(cartAddedEvent(result.value));
    return result;
  };
  const add = (focus: 'add' | null = null) => {
    if (!cart || !configuration || preorder) return;
    if (configuration.kind === 'selectable' && !latestOptions.current?.some(option => option.id === configuration.id && !option.disabled)) return;
    return mutate(() => reportAdd(cart.addItem({ productKey, configuration, quantity: 1, presentation: snapshot(selected) })), focus);
  };
  const selectAfterRemoval = (removedId: string) => {
    // Canonical ascending options, intersected with the latest same-Product Cart state.
    const remaining = latestOptions.current && [...latestOptions.current].reverse().find(option =>
      cart?.getItem(productKey, { kind: 'selectable', id: option.id }));
    commitSelection(remaining?.id ?? removedId);
    return Boolean(remaining);
  };
  const changeQuantity = (delta: -1 | 1) => {
    if (!cart || !configuration || preorder || mutationPending.current) return;
    const item = cart.getItem(productKey, configuration);
    if (!item) return;
    if (configuration.kind === 'selectable') {
      const current = latestOptions.current?.find(option => option.id === configuration.id);
      if (!current || !canRequestQuantity(current, item.quantity, item.quantity + delta)) return;
    }
    const intent = selectionIntent.current;
    return delta === -1 && item.quantity === 1
      ? mutate(async () => {
        const result = await cart.removeItem(item.id);
        if (result.ok && intent === selectionIntent.current && options && configuration.kind === 'selectable' && !cart.getItem(productKey, configuration)) {
          if (selectAfterRemoval(configuration.id)) setSelectionTransition(true);
        }
        return result;
      }, 'remove')
      : mutate(() => cart.setItemQuantity(item.id, item.quantity + delta), delta === -1 ? 'minus' : 'plus');
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
            <ConfigurationControl options={options} selected={selected} onSelect={changeInline} triggerRef={fullSelection} />
          </div>
          <span className={`${styles.weight} ${styles.compactOnly}`}><span className={styles.srOnly}>Вес: </span>{selected.label}</span>
        </> : data.weight ? <span className={styles.weight}><span className={styles.srOnly}>Вес: </span>{data.weight.label}</span> : null}
      </div>
      {price.discount && <span className={styles.discountBadge}>{price.discount.label}</span>}
      {selected?.disabled && <span className={styles.availabilityStatus}>Нет в наличии</span>}
      {preorder ? <div className={`${styles.preorderBar} ${styles.compactOnly}`}>Предзаказ</div> : <>
        <button ref={fullAction} className={`${styles.cart} ${styles.fullOnly} ${quantity > 0 ? styles.cartAdded : ''}`} type="button"
          disabled={!cart || pending || Boolean(options && !selected) || Boolean(selected?.disabled && quantity === 0)}
          aria-label={`${selected?.disabled && quantity > 0 ? `Управлять количеством, выбрано ${quantity}` : quantity > 0 ? `Добавить ещё, выбрано ${quantity}` : 'В корзину'}: ${data.title}`}
          aria-haspopup={selected?.disabled && quantity > 0 ? 'dialog' : undefined}
          aria-controls={selected?.disabled && sheetOpen ? sheetId : undefined}
          onClick={selected?.disabled && quantity > 0 ? openSheet : () => void add()}>
          {quantity > 0 ? <span className={styles.filledCartIcon} aria-hidden="true">
            <Image className={styles.cartBody} src="/icons/product/cart-filled-body.svg" alt="" width={24} height={25} />
            <Image className={styles.cartOutline} src="/icons/product/cart-filled-outline.svg" alt="" width={29} height={35} />
            <span>{quantity}</span>
          </span> : <span className={styles.cartIcon}><Image src="/icons/product/cart.svg" alt="" width={25} height={31} /></span>}
          <span className={styles.srOnly} role="status">{quantity > 0 ? `В корзине: ${quantity}` : ''}</span>
        </button>
        <div className={`${styles.purchaseSurface} ${styles.compactOnly}`} aria-busy={pending}
          data-pending-visible={pendingVisible || undefined}>
        {quantity > 0 ? <div ref={confirmedControls} className={`${styles.purchaseControls} ${selectionTransition ? styles.selectionEnter : ''}`}>
          <div className={styles.quantityBar} role="group" aria-label={`Количество: ${data.title}`}>
            <button ref={compactMinus} type="button"
              disabled={pending}
              aria-label="Уменьшить количество"
              onClick={() => void changeQuantity(-1)}><Image src="/icons/product/quantity-minus.svg" alt="" width={14} height={2} /></button>
            <span role="status">{quantity}</span>
            <button ref={compactPlus} type="button"
              className={selected?.disabled ? styles.unavailableIncrease : undefined}
              disabled={pending || selected?.disabled}
              aria-label="Увеличить количество"
              onClick={() => void changeQuantity(1)}>
              <Image src="/icons/product/quantity-plus.svg" alt="" width={12} height={12} />
            </button>
          </div>
          {options && <button ref={trigger} type="button" className={styles.purchaseManagement}
            disabled={pending} aria-label={`Выбрать фасовку: ${data.title}`}
            aria-haspopup="dialog" aria-controls={sheetOpen ? sheetId : undefined}
            onClick={openSheet}>
            <Image src="/icons/product/cart.svg" alt="" width={25} height={31} />
          </button>}
        </div> : <button ref={trigger} type="button" className={`${styles.cart} ${styles.compactOnly}`}
          disabled={!cart || pending || Boolean(options && !selected)}
          aria-label={`${selected?.disabled ? 'Выбрать фасовку' : options ? 'Добавить в корзину' : 'В корзину'}: ${data.title}`}
          aria-haspopup={options ? 'dialog' : undefined} aria-controls={sheetOpen ? sheetId : undefined}
          onClick={options ? openSheet : () => void add('add')}>
          <span>{selected?.disabled ? 'Выбрать фасовку' : 'В корзину'}</span><span className={styles.cartIcon}><Image src="/icons/product/cart.svg" alt="" width={25} height={31} /></span>
        </button>}
        {pendingVisible && <span className={styles.pendingOverlay} aria-hidden="true"><span className={styles.pendingSpinner} /></span>}
        </div>
      </>}
      {sheetOpen && cart && selected && options && !preorder && <ProductPurchaseSheet id={sheetId} title={data.title}
        options={options} initialConfiguration={selected} initialQuantity={quantity}
        getTargetQuantity={option => cart.getQuantity(productKey, { kind: 'selectable', id: option.id })}
        responsive={presentation === 'responsive' && sheetOpen === 'compact'} triggerRef={trigger} fallbackRef={selected.disabled && quantity === 0 ? fullSelection : fullAction}
        onCancel={closeSheet} onConfirm={async (option, amount, removalIntent) => {
          const current = latestOptions.current?.find(current => current.id === option.id);
          if (!current) return false;
          const session = sheetSession.current;
          const intent = selectionIntent.current;
          const target = { kind: 'selectable' as const, id: option.id };
          const item = cart.getItem(productKey, target);
          if (!canRequestQuantity(current, item?.quantity ?? 0, amount)) return false;
          const action = sheetConfirmAction(amount, removalIntent, Boolean(item));
          if (action === 'none') return false;
          if (current.disabled && item && amount === item.quantity) {
            commitSelection(current.id); closeSheet(); return true;
          }
          if (action === 'remove' || action === 'absent') {
            const result = item ? await mutate(() => cart.removeItem(item.id)) : { ok: true };
            if (!result?.ok || session !== sheetSession.current || intent !== selectionIntent.current || cart.getItem(productKey, target)) return false;
            selectAfterRemoval(option.id); closeSheet();
            return true;
          }
          const result = item
            ? await mutate(() => cart.setItemQuantity(item.id, amount))
            : await mutate(() => reportAdd(cart.addItem({ productKey, configuration: target, quantity: amount, presentation: snapshot(option) })));
          if (!result?.ok || session !== sheetSession.current || intent !== selectionIntent.current) return false;
          commitSelection(option.id); closeSheet();
          return true;
        }} />}
    </>
  );
}
