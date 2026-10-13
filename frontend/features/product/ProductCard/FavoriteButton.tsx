'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './ProductCard.module.css';

export function FavoriteButton({ initialActive }: Readonly<{ initialActive: boolean }>) {
  const [active, setActive] = useState(initialActive);
  return (
    <button type="button" className={styles.favorite}
      aria-label={active ? 'Удалить из избранного' : 'Добавить в избранное'}
      aria-pressed={active} onClick={() => setActive(!active)}>
      <Image src={`/icons/product/favorite-${active ? 'filled' : 'outline'}.svg`} alt=""
        width={active ? 28 : 24} height={active ? 24 : 21}
        className={active ? styles.favoriteFilled : styles.favoriteOutline} />
    </button>
  );
}
