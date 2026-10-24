'use client';

import { useState } from 'react';
import { CartWidget } from '@/features/cart/CartWidget/CartWidget';
import type { CartWidgetItemData } from '@/features/cart/CartWidget/CartWidget.types';
import { cartWidgetFixtures, type CartWidgetScenario } from './cart-widget.fixtures';
import styles from './page.module.css';

/** Local QA data owner only. This harness is not a shared or persistent Cart. */
export function CartWidgetDemo({ initialScenario }: Readonly<{ initialScenario: CartWidgetScenario }>) {
  const [items, setItems] = useState<readonly CartWidgetItemData[]>(cartWidgetFixtures[initialScenario].items);
  const [run, setRun] = useState(0);
  const [lastRemoval, setLastRemoval] = useState('');
  return (
    <>
      <div className={styles.content}>
        <h1>CartWidget · presentation QA</h1>
        <p>Изолированные dev fixtures. Нет общего Cart state, backend, persistence или связи с ProductCard.</p>
        <div className={styles.scenarios} role="group" aria-label="Выбрать fixture">
          {(Object.keys(cartWidgetFixtures) as CartWidgetScenario[]).map(scenario => (
            <button type="button" key={scenario} onClick={() => {
              setItems(cartWidgetFixtures[scenario].items); setRun(value => value + 1); setLastRemoval('');
            }}>{cartWidgetFixtures[scenario].label}</button>
          ))}
        </div>
        <p role="status">Позиций fixture: {items.length}. {lastRemoval && `Remove callback: ${lastRemoval}.`}</p>
        <p>Цена — готовая сумма всей строки. Фасовка относится к одной единице, quantity отображается отдельно.</p>
        <p>Desktop ≥1280 px. Откройте widget через число позиций или стрелку. Удалите среднюю строку:
          фокус перейдёт на следующий remove. После последней позиции widget исчезнет;
          production focus target будет определён при интеграции Cart/Header.</p>
        <div className={styles.scrollGuide}>
          <h2>Footer layering QA</h2>
          <p>Прокрутите вниз к настоящему SiteFooter. Он должен постепенно перекрыть widget.
            Прокрутите обратно: expanded/collapsed state сохраняется. Повторите в обоих состояниях.</p>
        </div>
      </div>
      <CartWidget key={run} items={items} onRemoveItem={id => {
        setLastRemoval(id); setItems(current => current.filter(item => item.id !== id));
      }} />
    </>
  );
}
