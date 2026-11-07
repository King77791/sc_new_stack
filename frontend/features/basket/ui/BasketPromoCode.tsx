'use client';

import { useId, useState } from 'react';
import styles from './Basket.module.css';

/** Editable presentation draft only. No pricing, commands, submission or persistence. */
export function BasketPromoCode() {
  const [expanded, setExpanded] = useState(false);
  const [value, setValue] = useState('');
  const id = useId();
  return <div className={styles.promo}>
    <button type="button" className={styles.promoTrigger} aria-expanded={expanded} aria-controls={`${id}-panel`}
      onClick={() => setExpanded(current => !current)}>Есть промокод?<span className={styles.promoChevron} aria-hidden="true" /></button>
    <div id={`${id}-panel`} className={styles.promoPanel} hidden={!expanded}>
      <label htmlFor={`${id}-input`}>Промокод</label>
      <div className={styles.promoField}>
        <input id={`${id}-input`} type="text" value={value} autoComplete="off"
          onChange={event => setValue(event.currentTarget.value)}
          onKeyDown={event => { if (event.key === 'Enter') event.preventDefault(); }} />
        <button type="button" className={styles.promoApply} aria-label="Применить промокод" disabled>
          <span className={styles.promoApplyIcon} aria-hidden="true" />
        </button>
      </div>
    </div>
  </div>;
}
