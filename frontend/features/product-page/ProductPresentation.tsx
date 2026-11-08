import Image from 'next/image';
import Link from 'next/link';
import type { CSSProperties } from 'react';
import { ProductCard } from '../product/ProductCard/ProductCard';
import type { ProductCardData } from '../product/ProductCard/ProductCard.types';
import type { ProductPageModel } from './product-page.read-model';
import { catalogTarget, type CatalogFamily } from './product-page.catalog';
import type { CatalogReference } from '../product-input/product-input.catalog';
import { productPagePrice } from './product-page.presentation';
import { ProductGallery } from './ProductGallery';
import styles from './ProductPresentation.module.css';

function CatalogValue({ family, reference }: Readonly<{ family: CatalogFamily; reference: CatalogReference }>) {
  const target = catalogTarget(family, reference);
  if (!target) return null;
  return target.href ? <Link href={target.href}>{target.label}</Link> : <span>{target.label}</span>;
}
const brewingFields = [
  ['preparingTime', 'Время заваривания', 'time', 33.8102, 40],
  ['temperature', 'Температура заваривания', 'temperature', 18.3429, 40],
  ['amountPerBrewing', 'Кол-во чая', 'amount', 34.2742, 40],
  ['infusionCount', 'Кол-во завариваний', 'infusions', 40, 39.9951],
] as const;

export function ProductPresentation({ product, related = [] }: Readonly<{ product: ProductPageModel; related?: readonly ProductCardData[] }>) {
  const price = productPagePrice(product), links = product.detail?.catalogLinks;
  const gallery = product.detail?.gallery?.length ? product.detail.gallery : product.image ? [product.image] : [];
  const availability = { available: '', unavailable: 'Нет в наличии.',
    unknown: 'Наличие не подтверждено.', 'not-purchasable': 'Товар недоступен для покупки.', mixed: 'Доступность зависит от фасовки.' }[product.availability];
  const rows: { key: string; label: string; value: React.ReactNode }[] = [];
  if (links?.region) rows.push({ key: 'region', label: 'Регион:', value: <CatalogValue family="region" reference={links.region} /> });
  else {
    if (product.country) rows.push({ key: 'country', label: 'Страна:', value: product.country.label });
    if (product.origin) rows.push({ key: 'origin', label: 'Регион:', value: product.origin.label });
  }
  if (links?.category) rows.push({ key: 'category', label: 'Вид:', value: <CatalogValue family="category" reference={links.category} /> });
  if (links?.tastes?.length) rows.push({ key: 'tastes', label: 'Вкус:', value: <span className={styles.values}>{links.tastes.map(taste => <CatalogValue key={taste.slug} family="taste" reference={taste} />)}</span> });
  for (const fact of product.detail?.characteristics ?? []) {
    if ((fact.key === 'type' && links?.category) || (fact.key === 'tastes' && links?.tastes?.length)) continue;
    rows.push({ key: fact.key, label: fact.label, value: fact.value });
  }
  if (product.detail?.physical?.fixedWeightGrams !== undefined) rows.push({ key: 'weight', label: 'Вес:', value: `${product.detail.physical.fixedWeightGrams} г.` });
  if (product.detail?.physical?.volumeMl !== undefined) rows.push({ key: 'volume', label: 'Объём:', value: `${product.detail.physical.volumeMl} мл` });
  const brewing = product.kind === 'tea' ? product.detail?.brewing : undefined;
  return <main className={styles.page}>
    <span className={styles.demoMarker} title="Демонстрационные данные, не производственный каталог">Демо</span>
    <nav className={styles.breadcrumbs} aria-label="Хлебные крошки"><ol>
      <li><Link href="/">Главная</Link></li><li>Каталог</li>
      {links?.category && <li><CatalogValue family="category" reference={links.category} /></li>}
      <li aria-current="page">{product.title}</li>
    </ol></nav>
    <section className={styles.hero} aria-labelledby="product-title">
      <div className={styles.geography}>
        {product.countryIllustration && <Image src={product.countryIllustration} alt="" width={80} height={80} />}
        {product.country && <span>{product.country.label}</span>}
      </div>
      <div className={styles.artwork}>
        {product.countryBackground && <Image className={styles.background} src={product.countryBackground} alt="" fill sizes="(max-width: 1279px) 375px, 720px" />}
        {product.image ? <Image className={styles.productImage} src={product.image.src} alt={product.image.alt}
          width={product.image.width} height={product.image.height} sizes="(max-width: 1279px) 300px, 545px" priority /> : <p>Изображение недоступно.</p>}
      </div>
      <div className={styles.summary}>
        <h1 id="product-title" className={styles.title}>{product.title}</h1>
        <div className={styles.price}>
          {price ? <>
            {price.original && <del><span className={styles.srOnly}>Цена без скидки: </span>{price.original}</del>}
            <p><span className={styles.srOnly}>Цена за единицу: </span><span className={styles.unitPrice}>{price.current}</span>{price.label && <small>/{price.label}</small>}</p>
          </> : <p className={styles.untrusted}>Цена недоступна.</p>}
        </div>
        {availability && <p className={styles.availability}>{availability}</p>}
      </div>
    </section>
    {(rows.length > 0 || (brewing && Object.keys(brewing).length > 0)) && <section className={styles.details} aria-label="Характеристики и заваривание">
      {rows.length > 0 && <dl className={styles.characteristics}>{rows.map(row => <div key={row.key}><dt>{row.label}</dt><dd>{row.value}</dd></div>)}</dl>}
      {brewing && Object.keys(brewing).length > 0 && <dl className={styles.brewing} aria-label="Параметры заваривания">{brewingFields.map(([key, label, icon, width, height]) => brewing[key] ? <div key={key}>
        <span className={styles.brewingIcon}><Image src={`/icons/product-page/${icon}.svg`} alt="" width={width} height={height} /></span>
        <div><dt>{label}</dt><dd>{brewing[key]}</dd></div>
      </div> : null)}</dl>}
    </section>}
    <ProductGallery identity={`${product.productKey}:${product.generation.snapshotId}`} title={product.title} images={gallery}
      mainImageFallback={!product.detail?.gallery?.length} />
    {related.length > 0 && <section className={styles.related} aria-labelledby="product-related-title">
      <h2 id="product-related-title">Также рекомендуем</h2>
      <ul style={{ '--related-columns': Math.ceil(related.length / 2) } as CSSProperties}>{related.map(card => <li key={card.slug}><ProductCard data={card} presentation="responsive" /></li>)}</ul>
    </section>}
  </main>;
}
