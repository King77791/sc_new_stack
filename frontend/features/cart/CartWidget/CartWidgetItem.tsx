import Image from 'next/image';
import Link from 'next/link';
import type { Ref } from 'react';
import type { CartWidgetItemData } from './CartWidget.types';
import styles from './CartWidget.module.css';

export function CartWidgetItem({ item, onRemove, removeRef }: Readonly<{
  item: CartWidgetItemData;
  onRemove: (id: string) => void;
  removeRef: Ref<HTMLButtonElement>;
}>) {
  const identity = item.configurationLabel ? `${item.title}, ${item.configurationLabel}` : item.title;
  return (
    <li className={styles.item}>
      <div className={styles.description}>
        <Link className={styles.title} href={`/product/${encodeURIComponent(item.slug)}`}>{item.title}</Link>
        <p className={styles.price}>
          <span><span className={styles.srOnly}>Цена всей позиции: </span>{item.displayLinePrice}</span>
          {item.configurationLabel && <small>
            <span aria-hidden="true">/ </span>
            <span className={styles.srOnly}>Конфигурация одной единицы: </span>{item.configurationLabel}
          </small>}
        </p>
      </div>
      <span className={styles.quantity}><span className={styles.srOnly}>Количество: </span>{item.quantity} шт.</span>
      <button ref={removeRef} className={styles.remove} type="button"
        aria-label={`Удалить ${identity} из корзины`} onClick={() => onRemove(item.id)}>
        <span className={styles.trashFrame} aria-hidden="true">
          <Image src="/icons/cart/remove.svg" alt="" width={21} height={26} />
        </span>
      </button>
    </li>
  );
}
