'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { CartWidgetItem } from './CartWidgetItem';
import type { CartWidgetProps } from './CartWidget.types';
import styles from './CartWidget.module.css';

const positionPlural = new Intl.PluralRules('ru');
const positionWords: Partial<Record<Intl.LDMLPluralRule, string>> = {
  one: 'позиция', few: 'позиции', many: 'позиций', other: 'позиций',
};

/** Empty Cart unmounts only the presentation, so the next appearance starts collapsed. */
export function CartWidget(props: CartWidgetProps) {
  return props.items.length > 0 ? <NonEmptyCartWidget {...props} /> : null;
}

function NonEmptyCartWidget({ items, onRemoveItem }: CartWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const contentId = useId();
  const chevron = useRef<HTMLButtonElement>(null);
  const removeButtons = useRef(new Map<string, HTMLButtonElement>());
  const pendingRemoval = useRef<{ id: string; index: number; nextId?: string } | null>(null);

  useEffect(() => {
    const pending = pendingRemoval.current;
    if (!pending || items.some(item => item.id === pending.id)) return;
    pendingRemoval.current = null;
    const next = removeButtons.current.get(pending.nextId ?? '')
      ?? removeButtons.current.get(items[Math.min(pending.index, items.length - 1)]?.id ?? '');
    // Last-item focus belongs to future shell integration; an empty widget has no controls.
    if (next?.getClientRects().length) next.focus({ preventScroll: true });
  }, [items]);

  const requestRemoval = (id: string) => {
    const index = items.findIndex(item => item.id === id);
    pendingRemoval.current = { id, index, nextId: (items[index + 1] ?? items[index - 1])?.id };
    onRemoveItem(id);
  };

  return (
    <aside className={styles.widget} aria-label="Состав корзины" data-expanded={expanded}>
      <div className={styles.header}>
        <span>В корзине:</span>
        <button className={styles.count} type="button" hidden={expanded}
          aria-expanded={expanded} aria-controls={contentId}
          onClick={() => { setExpanded(true); chevron.current?.focus(); }}>
          {items.length} {positionWords[positionPlural.select(items.length)]}
        </button>
        <button ref={chevron} className={styles.toggle} type="button"
          aria-label={expanded ? 'Свернуть корзину' : 'Развернуть корзину'}
          aria-expanded={expanded} aria-controls={contentId} onClick={() => setExpanded(value => !value)}>
          <Image className={styles.chevron} src="/icons/events/chevron.svg" alt="" width={14} height={24} />
        </button>
      </div>
      <div id={contentId} className={styles.body} hidden={!expanded}>
        <div className={styles.itemsViewport} role="region" aria-label="Позиции корзины" tabIndex={0}>
          <ul className={styles.items}>
            {items.map(item => <CartWidgetItem key={item.id} item={item} onRemove={requestRemoval}
              removeRef={element => {
                if (element) removeButtons.current.set(item.id, element);
                else removeButtons.current.delete(item.id);
              }} />)}
          </ul>
        </div>
        <div className={styles.footer}>
          <Link href="/basket" className={styles.basketLink}>Перейти в корзину</Link>
        </div>
      </div>
    </aside>
  );
}
