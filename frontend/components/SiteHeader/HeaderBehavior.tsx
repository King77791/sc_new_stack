'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { MainNavigation } from './MainNavigation';
import type { HeaderCategory, HeaderPanel } from './header-data';
import styles from './SiteHeader.module.css';

type HeaderBehaviorProps = {
  contacts: ReactNode;
  logo: ReactNode;
  actionLinks: ReactNode;
  categories: readonly HeaderCategory[];
};

export function HeaderBehavior({ contacts, logo, actionLinks, categories }: HeaderBehaviorProps) {
  const [panel, setPanel] = useState<HeaderPanel>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [keyboardFocus, setKeyboardFocus] = useState(false);
  const [query, setQuery] = useState('');
  const headerRef = useRef<HTMLElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTriggerRef = useRef<HTMLButtonElement>(null);
  const openedWithPointer = useRef(false);
  const pathname = usePathname();
  const hiddenNavigation = panel === 'search' || (collapsed && !hovered && !keyboardFocus && !panel);

  // One passive listener, one scheduled sample. React only updates on state transitions.
  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 1280px)');
    let anchorY = window.scrollY;
    let frame = 0;
    const sample = () => {
      frame = 0;
      const y = Math.max(0, window.scrollY);
      const header = headerRef.current;
      if (!header) return;
      const height = (header.querySelector('[data-primary-bar]')?.getBoundingClientRect().height ?? 80)
        + (header.querySelector('[data-main-navigation]')?.getBoundingClientRect().height ?? 80);
      const threshold = height * 1.5;
      const delta = y - anchorY;
      if (!desktop.matches || y <= threshold - 8) setCollapsed(false);
      else if (y >= threshold && delta >= 4) setCollapsed(true);
      else if (delta <= -4) setCollapsed(false);
      if (Math.abs(delta) >= 4 || y === 0) anchorY = y;
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(sample); };
    const resize = () => { setPanel(null); setHovered(false); schedule(); };
    window.addEventListener('scroll', schedule, { passive: true });
    desktop.addEventListener('change', resize);
    if (window.scrollY) { anchorY = 0; schedule(); }
    return () => {
      window.removeEventListener('scroll', schedule);
      desktop.removeEventListener('change', resize);
      cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => { setPanel(null); }, [pathname]);

  useEffect(() => {
    if (!panel) return;
    if (panel === 'search') searchRef.current?.focus();
    const previousOverflow = document.body.style.overflow;
    const previousPadding = document.body.style.paddingRight;
    if (panel === 'mobile') {
      const scrollbar = innerWidth - document.documentElement.clientWidth;
      if (scrollbar) document.body.style.paddingRight = `${scrollbar}px`;
      document.body.style.overflow = 'hidden';
    }
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setPanel(null);
      if (panel === 'search') searchTriggerRef.current?.focus();
      else headerRef.current?.querySelector<HTMLElement>(panel === 'mobile' ? '[data-burger]' : '[data-catalog-toggle]')?.focus();
    };
    const outside = (event: PointerEvent) => {
      if (!headerRef.current?.contains(event.target as Node)) setPanel(null);
    };
    document.addEventListener('keydown', escape);
    document.addEventListener('pointerdown', outside);
    return () => {
      if (panel === 'mobile') {
        document.body.style.overflow = previousOverflow;
        document.body.style.paddingRight = previousPadding;
      }
      document.removeEventListener('keydown', escape);
      document.removeEventListener('pointerdown', outside);
    };
  }, [panel]);

  return (
    <header ref={headerRef} className={styles.header} data-nav-hidden={hiddenNavigation} data-panel={panel ?? 'none'}
      onPointerEnter={event => { if (event.pointerType === 'mouse') setHovered(true); }}
      onPointerLeave={event => {
        if (event.pointerType !== 'mouse') return;
        setHovered(false);
        if (panel === 'catalog' && openedWithPointer.current) setPanel(null);
      }}
      onFocusCapture={event => setKeyboardFocus(event.target.matches(':focus-visible'))}
      onBlurCapture={event => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setKeyboardFocus(false);
          setPanel(null);
        }
      }}>
      <div className={styles.bar} data-primary-bar>
        {contacts}
        {logo}
        <div className={styles.actions} aria-label="Действия магазина">
          <button ref={searchTriggerRef} type="button" className={styles.action} aria-label="Поиск"
            aria-expanded={panel === 'search'} aria-controls="site-header-search"
            onClick={() => setPanel(panel === 'search' ? null : 'search')}>
            <Image src="/icons/search_ic.svg" width={56} height={56} alt="" />
          </button>
          {actionLinks}
        </div>
      </div>
      <MainNavigation categories={categories} panel={panel} hidden={hiddenNavigation}
        onPanelChange={next => { openedWithPointer.current = false; setPanel(next); }}
        onCatalogHover={() => { openedWithPointer.current = true; setPanel('catalog'); }} />
      <div id="site-header-search" className={styles.searchPanel} hidden={panel !== 'search'}>
        <form role="search" className={styles.searchForm} onSubmit={event => event.preventDefault()}>
          <span className={styles.searchIcon} aria-hidden="true">
            <Image src="/icons/search_ic.svg" width={56} height={56} alt="" />
          </span>
          <input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)}
            placeholder="Поиск" aria-label="Поиск по сайту" />
          <button type="button" aria-label="Закрыть поиск" onClick={() => {
            setQuery(''); setPanel(null); searchTriggerRef.current?.focus();
          }}>
            <Image src="/icons/close_reset_ic.svg" width={24} height={24} alt="" />
          </button>
        </form>
      </div>
    </header>
  );
}
