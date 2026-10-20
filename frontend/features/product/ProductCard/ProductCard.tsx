import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { ProductCardProps } from './ProductCard.types';
import styles from './ProductCard.module.css';
import { FavoriteButton } from './FavoriteButton';
import { ProductCardPurchase } from './ProductCardPurchase';
import { TitleMarquee } from './TitleMarquee';

export function ProductCard({ data, presentation, favorite = false }: ProductCardProps) {
  const compact = presentation === 'compact';
  const responsive = presentation === 'responsive';
  const preorder = data.purchasePresentation === 'preorder';
  const productHref = `/product/${encodeURIComponent(data.slug)}`;

  return (
    <article
      className={`${styles.card} ${styles[presentation]} ${preorder ? styles.preorder : ''} ${data.price.discount ? styles.discount : ''}`}
      data-presentation={presentation}
      data-product-kind={data.kind}
      data-purchase-presentation={data.purchasePresentation}
      aria-label={data.title}
    >
      <div className={styles.visual}>
        {/* Only artwork is clipped. Links and future interactive overlays are siblings. */}
        <div className={styles.artwork} aria-hidden="true">
          {data.country?.background && (
            <div className={styles.regionalBackground}>
              <Image src={data.country.background} alt="" fill sizes={responsive ? '(max-width: 1279px) 210px, 360px' : compact ? '210px' : '360px'} />
            </div>
          )}
        </div>
        <Link href={productHref} className={styles.imageLink} aria-label={`О товаре: ${data.title}`}>
          <span className={styles.imageClip}>
            <Image
              src={data.image.src}
              alt={data.image.alt}
              width={data.image.width}
              height={data.image.height}
              sizes={responsive ? '(max-width: 1279px) 140px, 245px' : compact ? '140px' : '245px'}
              className={styles.productImage}
            />
          </span>
        </Link>
        {data.kind === 'tea' && (
          <ul className={styles.moods} aria-label="Состояния">
            {data.moods.map((mood) => (
              <li key={mood.slug}>
                <Link href={`/catalog/mood/${encodeURIComponent(mood.slug)}`} aria-label={mood.label}
                  style={{ '--mood-icon': `url("${mood.icon}")`, '--mood-width': `${mood.iconWidth}px`, '--mood-height': `${mood.iconHeight}px` } as CSSProperties}>
                  <Image src={mood.icon} alt="" width={mood.iconWidth} height={mood.iconHeight} />
                  <span className={styles.moodTooltip} aria-hidden="true">{mood.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {data.country && (
          <Link href={`/catalog/region/${encodeURIComponent(data.country.slug)}`} className={styles.geography}>
            <Image className={styles.countryMarker} src="/icons/regions/marker.svg" alt="" width={7} height={10} />
            {data.country.illustration && (
              <div className={styles.countryIllustration} aria-hidden="true">
                <Image src={data.country.illustration} alt="" width={68} height={77} />
              </div>
            )}
            <div className={styles.geographyLabels}>
              {data.country && <span><span className={styles.srOnly}>Страна: </span>{data.country.label}</span>}
            </div>
          </Link>
        )}
      </div>

      <ProductCardPurchase data={{ title: data.title, price: data.price, purchasePresentation: data.purchasePresentation, weight: data.weight }} presentation={presentation}>
        <h3 className={styles.title}>
          <TitleMarquee href={productHref} title={data.title} />
        </h3>
      </ProductCardPurchase>
      <FavoriteButton initialActive={favorite} />
    </article>
  );
}
