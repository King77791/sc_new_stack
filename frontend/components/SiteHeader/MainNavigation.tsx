'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useId, useState } from 'react';
import { favoritesNavigation, mainNavigationItems, type HeaderCategory, type HeaderPanel } from './header-data';
import styles from './SiteHeader.module.css';

type MainNavigationProps = {
  categories: readonly HeaderCategory[];
  panel: HeaderPanel;
  hidden: boolean;
  onPanelChange: (panel: HeaderPanel) => void;
  onCatalogHover: () => void;
};

export function MainNavigation({ categories, panel, hidden, onPanelChange, onCatalogHover }: MainNavigationProps) {
  const menuId = useId();
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const category = categories.find(entry => entry.slug === selectedSlug) ?? categories[0];
  const open = panel === 'catalog' || panel === 'mobile';
  const categoryHref = (entry: HeaderCategory) => `/catalog/${encodeURIComponent(entry.slug)}`;
  const products = (entry: HeaderCategory) => entry.items.map(item => (
    <Link key={item.slug} href={`/product/${encodeURIComponent(item.slug)}`} onClick={() => onPanelChange(null)}>
      {item.title}
    </Link>
  ));

  return (
    <>
      <button type="button" data-burger className={styles.burger} data-open={panel === 'mobile'}
        aria-label={panel === 'mobile' ? 'Закрыть меню' : 'Открыть меню'} aria-expanded={panel === 'mobile'} aria-controls={menuId}
        onClick={() => onPanelChange(panel === 'mobile' ? null : 'mobile')}>
        <span /><span /><span />
      </button>
      <div className={styles.navigationRoot} data-open={open} inert={hidden}>
        <nav className={styles.desktopNavigation} data-main-navigation aria-label="Основная навигация">
          <ul>
            {mainNavigationItems.map((item, index) => (
              <li key={item.href}>
                <Link href={item.href} className={styles.mainNavigationLink} data-catalog-trigger={index === 0 ? true : undefined}
                  onPointerEnter={event => {
                    if (event.pointerType !== 'mouse' || !window.matchMedia('(hover: hover)').matches) return;
                    if (index === 0) onCatalogHover();
                    else if (panel === 'catalog') onPanelChange(null);
                  }} onClick={() => onPanelChange(null)}>{item.label}</Link>
                {index === 0 && (
                  <button type="button" data-catalog-toggle className={styles.catalogToggle}
                    aria-label={panel === 'catalog' ? 'Закрыть меню каталога' : 'Открыть меню каталога'}
                    aria-expanded={panel === 'catalog'} aria-controls={menuId}
                    onClick={() => onPanelChange(panel === 'catalog' ? null : 'catalog')}>
                    <span className={styles.chevron} aria-hidden="true" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </nav>
        <div id={menuId} className={styles.menu} hidden={!open}>
          {category && <>
            <div className={styles.categoryArt} aria-hidden="true" data-accessories={!!category.accessories}>
              <Image key={category.image} src={category.image} width={600} height={365} alt="" />
            </div>
            <nav className={styles.desktopCatalog} aria-label="Каталог">
              <div className={styles.categories}>
                {categories.map(entry => (
                  <button key={entry.slug} type="button" aria-pressed={category.slug === entry.slug}
                    onClick={() => setSelectedSlug(entry.slug)}>{entry.label}</button>
                ))}
              </div>
              <div className={styles.catalogContent}>
                <div className={styles.catalogItems}>{products(category)}</div>
                <Link className={styles.catalogLink} href={categoryHref(category)} onClick={() => onPanelChange(null)}>
                  Перейти в каталог
                  <Image src="/icons/catalog_arrow_ic.svg" width={32} height={32} alt="" />
                </Link>
              </div>
            </nav>
          </>}
          <nav className={styles.mobileCatalog} aria-label="Меню магазина">
            <Link href={favoritesNavigation.href} className={styles.menuFavorites} onClick={() => onPanelChange(null)}>
              {favoritesNavigation.label}
              <Image src={favoritesNavigation.icon} width={40} height={40} alt="" />
            </Link>
            <div className={styles.mobileCatalogCard}>
              <Link className={styles.mobileCatalogTitle} href="/catalog" onClick={() => onPanelChange(null)}>Каталог</Link>
              {categories.map(entry => (
                <details key={entry.slug} className={styles.accordion} open={entry.slug === 'green'}>
                  <summary>{entry.label}<span className={styles.chevron} aria-hidden="true" /></summary>
                  <div className={styles.mobileItems}>
                    {products(entry)}
                    <Link href={categoryHref(entry)} className={styles.catalogLink} onClick={() => onPanelChange(null)}>
                      Перейти в каталог
                      <Image src="/icons/catalog_arrow_ic.svg" width={32} height={32} alt="" />
                    </Link>
                  </div>
                </details>
              ))}
            </div>
            {mainNavigationItems.slice(1).map(item => (
              <Link key={item.href} href={item.href} className={styles.secondaryLink} onClick={() => onPanelChange(null)}>{item.label}</Link>
            ))}
          </nav>
        </div>
      </div>
    </>
  );
}
