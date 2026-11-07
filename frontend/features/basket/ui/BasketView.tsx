import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { BasketViewModel } from '../adapters/basket-ui.adapter';
import type { BasketInteractions, BasketInteractionState } from '../model/basket-interactions';
import type { CartIdentity, CartItem } from '../../cart/cart.types';
import { BasketPromoCode } from './BasketPromoCode';
import styles from './Basket.module.css';

type Action = (identity: CartIdentity, action: 'increase' | 'decrease' | 'remove', origin: HTMLButtonElement) => void;
export function BasketView({ view, interaction, onAction, onEdit, editor, headingRef }: Readonly<{
  view: BasketViewModel; interaction: BasketInteractionState; onAction: Action;
  onEdit: (item: CartItem, origin: HTMLButtonElement) => void;
  editor?: Readonly<{ sourceId: string; content: ReactNode }>;
  headingRef: React.RefObject<HTMLHeadingElement | null>;
}>) {
  const titleId = useId();
  return <main className={styles.page}>
    <nav className={styles.breadcrumb} aria-label="Хлебные крошки"><Link href="/">Главная</Link><span aria-hidden="true"> / </span><span aria-current="page">Корзина</span></nav>
    <div className={styles.titleBar}><h1 id={titleId} ref={headingRef} tabIndex={-1}>Корзина</h1></div>
    {view.empty ? <section className={styles.empty} aria-labelledby={titleId}>
      <h2>В корзине пока пусто</h2><p>Выберите чай на главной странице.</p><Link className={styles.homeLink} href="/">На главную</Link>
    </section> : <div className={styles.layout}>
      <div className={styles.groups} aria-label="Товары в корзине">
        {view.groups.map(group => <section key={group.productKey} className={styles.group} aria-label={group.presentation.title} data-product-key={group.productKey}>
          <header className={styles.productHeader}>
            {group.presentation.image ? <Image className={styles.productImage} src={group.presentation.image.src}
              alt={group.presentation.image.alt} width={100} height={100} />
              : <div className={styles.imageFallback} role="img" aria-label="Изображение отсутствует">Нет фото</div>}
            <h2>{group.presentation.href ? <Link href={group.presentation.href}>{group.presentation.title}</Link> : group.presentation.title}</h2>
            {group.badge && <span className={styles.badge} data-discount-badge>{group.badge}</span>}
          </header>
          <ul className={styles.lines}>
            {group.configurations.map(line => {
              const pending = interaction.pending.includes(line.item.id);
              const name = `${group.presentation.title}, ${line.label}`;
              return <li key={line.item.id} className={styles.line} data-row-id={line.item.id} aria-busy={pending || undefined}>
                <div className={styles.configuration}>
                  <span className={styles.weight}>{line.label}</span>
                  {line.canTransfer && <button type="button" className={styles.textButton} disabled={pending}
                    aria-expanded={editor?.sourceId === line.item.id} aria-label={`Изменить фасовку: ${name}`}
                    data-action="edit" onClick={event => onEdit(line.item, event.currentTarget)}>Изменить фасовку</button>}
                  {line.availabilityLabel && <span className={styles.availability}>{line.availabilityLabel}</span>}
                </div>
                <div className={styles.quantity} aria-label={`Количество: ${name}`}>
                  <button type="button" className={styles.quantityButton} data-action="decrease" disabled={pending || !line.canDecrease}
                    aria-label={`Уменьшить количество: ${name}`} onClick={event => onAction(line.item, 'decrease', event.currentTarget)}><span className={styles.minus} aria-hidden="true" /></button>
                  <span className={styles.quantityValue} aria-label={`${line.item.quantity} шт.`}>{line.item.quantity}</span>
                  <button type="button" className={styles.quantityButton} data-action="increase"
                    disabled={pending || !line.canIncrease || line.item.quantity >= Number.MAX_SAFE_INTEGER}
                    aria-label={`Увеличить количество: ${name}`} onClick={event => onAction(line.item, 'increase', event.currentTarget)}><span className={styles.plus} aria-hidden="true" /></button>
                </div>
                <div className={styles.linePrice}>{line.price ? <><strong>{line.price}</strong>{line.original && <del>{line.original}</del>}</>
                  : <span>{line.priceStatus}</span>}</div>
                <button type="button" className={styles.remove} data-action="remove" disabled={pending}
                  aria-label={`Удалить: ${name}`} onClick={event => onAction(line.item, 'remove', event.currentTarget)}><span aria-hidden="true" /></button>
                <div className={styles.lineStatus} role="status" aria-live="polite" aria-atomic="true">
                  {pending ? 'Обновляем…' : interaction.errors[line.item.id] ?? ''}
                </div>
                {editor?.sourceId === line.item.id && <div className={styles.editorSlot}>{editor.content}</div>}
              </li>;
            })}
          </ul>
          <footer className={styles.groupFooter}>
            {group.totals ? <>
              {group.totals.original && <span>Без скидки <del>{group.totals.original}</del></span>}
              {group.totals.savings && <span className={styles.savings}>Экономия {group.totals.savings}</span>}
              <strong>Итого по товару: {group.totals.current}</strong>
            </> : <p role="status">{group.priceStatus}</p>}
          </footer>
        </section>)}
      </div>
      <aside className={styles.summary} aria-label="Детали корзины">
        <h2>Детали заказа</h2>
        <div className={styles.summaryBody}>
          <dl className={styles.summaryDetails}>
            <div><dt>Товары, шт.</dt><dd>{view.summary.quantity ?? 'Уточняется'}</dd></div>
            {view.summary.totals?.original && <div><dt>Без скидки</dt><dd>{view.summary.totals.original}</dd></div>}
            {view.summary.totals?.savings && <div className={styles.summarySavings}><dt>Экономия</dt><dd>{view.summary.totals.savings}</dd></div>}
          </dl>
          <div className={styles.summaryResult}>
            <dl className={styles.summaryTotal}><div><dt>Итого:</dt><dd>{view.summary.totals?.current ?? 'Стоимость уточняется'}</dd></div></dl>
            <p className={styles.summaryNote}>Стоимость товаров без доставки</p>
            {view.summary.priceStatus && <p role="status">{view.summary.priceStatus}</p>}
          </div>
          <BasketPromoCode />
          <div className={styles.summaryActions}>
            <button type="button" className={styles.checkout} disabled>{view.summary.checkoutLabel}</button>
            <button type="button" className={styles.share} disabled>Поделиться корзиной</button>
          </div>
        </div>
      </aside>
    </div>}
  </main>;
}

/** Inline, non-modal editor: no focus trap, draft quantity, body lock or new Cart. */
export function BasketTransferEditor({ source, interactions, pending, stale, error, onConfirm, onCancel }: Readonly<{
  source: CartItem; interactions: BasketInteractions; pending: boolean; stale: boolean; error?: string;
  onConfirm: (target: CartIdentity, origin: HTMLButtonElement) => void;
  onCancel: (origin: HTMLElement) => void;
}>) {
  const options = interactions.targets(source);
  const [selected, setSelected] = useState('');
  const host = useRef<HTMLDivElement>(null), confirm = useRef<HTMLButtonElement>(null);
  const name = useId();
  useEffect(() => { host.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus(); }, []);
  const option = options.find(o => o.identity.configuration.kind === 'selectable' && o.identity.configuration.id === selected);
  return <div className={styles.editor} ref={host} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation();
      // Escape uses the currently focused editor control, preserving the shared focus lease policy.
      const origin = document.activeElement;
      onCancel(origin instanceof HTMLElement ? origin : confirm.current!);
    }
  }}>
    <fieldset disabled={pending || stale}><legend>Перенести всё количество ({source.quantity}) в другую фасовку</legend>
      <div className={styles.options}>{options.map(o => {
        if (o.identity.configuration.kind !== 'selectable') return null;
        const id = o.identity.configuration.id;
        return <label key={id}><input type="radio" name={name} value={id} checked={id === selected} disabled={!o.available || o.current}
          onChange={() => setSelected(id)} />{o.label}{o.current ? ' — текущая' : !o.available ? ' — недоступна' : ''}</label>;
      })}</div>
    </fieldset>
    <p className={styles.editorStatus} role="status" aria-live="polite" aria-atomic="true">
      {stale ? 'Позиция изменилась. Закройте выбор фасовки и откройте его заново.' : error ?? 'Переносится всё количество. Одинаковые фасовки объединятся.'}
    </p>
    <div className={styles.editorActions}>
      <button type="button" ref={confirm} className={styles.confirm} disabled={pending || stale || !option?.available || option.current}
        onClick={event => { if (option) onConfirm(option.identity, event.currentTarget); }}>Перенести</button>
      <button type="button" className={styles.cancel} onClick={event => onCancel(event.currentTarget)}>Отмена</button>
    </div>
  </div>;
}
