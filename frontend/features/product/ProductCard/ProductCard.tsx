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
  const preorder = data.purchasePresentation === 'preorder';
  const discount = data.price.discount;
  const productHref = `/product/${encodeURIComponent(data.slug)}`;

  return (
    <article
      className={`${styles.card} ${styles[presentation]} ${preorder ? styles.preorder : ''} ${discount ? styles.discount : ''}`}
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
              <Image src={data.country.background} alt="" fill sizes={compact ? '210px' : '360px'} />
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
              sizes={compact ? '140px' : '245px'}
              className={styles.productImage}
            />
          </span>
        </Link>
        {!compact && data.kind === 'tea' && (
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
        {(data.country || (!compact && data.origin)) && (
          // BLOCKED BY CATALOG ROUTING: independent labels below are future navigation boundaries; no speculative href.
          <div className={styles.geography}>
            {compact ? (
              <Image src="/icons/regions/marker.svg" alt="" width={7} height={10} />
            ) : data.country?.illustration ? (
              <div className={styles.countryIllustration}>
                <Image src={data.country.illustration} alt="" width={68} height={77} />
              </div>
            ) : null}
            <div className={styles.geographyLabels}>
              {data.country && <span><span className={styles.srOnly}>Страна: </span>{data.country.label}</span>}
              {!compact && data.origin && <span className={styles.origin}><span className={styles.srOnly}>Регион: </span>{data.origin.label}</span>}
            </div>
          </div>
        )}
        {compact && discount && <span className={styles.discountBadge}>{discount.label}</span>}
      </div>

      <ProductCardPurchase data={{ title: data.title, price: data.price, purchasePresentation: data.purchasePresentation, weight: data.weight }} presentation={presentation}>
        <h3 className={styles.title}>
          {compact ? <Link href={productHref} title={data.title}>{data.title}</Link>
            : <TitleMarquee href={productHref} title={data.title} />}
        </h3>
      </ProductCardPurchase>
      <FavoriteButton initialActive={favorite} />
    </article>
  );
}
