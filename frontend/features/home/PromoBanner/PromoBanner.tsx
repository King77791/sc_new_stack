import Image from 'next/image';
import Link from 'next/link';
import type { PromoBannerItems } from './PromoBanner.types';
import { PromoBannerCarousel } from './PromoBannerCarousel';
import styles from './PromoBanner.module.css';

export function PromoBanner({ items }: Readonly<{ items: PromoBannerItems }>) {
  return (
    <PromoBannerCarousel slides={items.map((item, index) => {
      const artwork = <>
        <Image src={item.background} alt="" fill sizes="100vw"
          priority={index === 0} className={styles.background} />
        <span className={styles.darken} />
        <span className={styles.canvas}>
          <Image src={item.criticalArtwork.src} alt=""
            width={item.criticalArtwork.width} height={item.criticalArtwork.height}
            priority={index === 0} sizes="(max-width: 759px) 100vw, 760px"
            className={styles.content} />
        </span>
      </>;
      return {
        id: item.id,
        label: item.label,
        content: item.navigation === 'external'
          ? <a href={item.href} className={styles.link} aria-label={item.label} target="_blank" rel="noopener noreferrer">{artwork}</a>
          : <Link href={item.href} className={styles.link} aria-label={item.label}>{artwork}</Link>,
      };
    })} />
  );
}
