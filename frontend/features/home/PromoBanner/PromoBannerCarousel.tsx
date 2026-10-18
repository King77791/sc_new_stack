'use client';

import Image from 'next/image';
import { useEffect, useId, useRef, useState, type PointerEvent, type ReactNode } from 'react';
import styles from './PromoBanner.module.css';

const AUTOPLAY_DELAY_MS = 5_000;
type Slide = Readonly<{ id: string; label: string; content: ReactNode }>;

export function PromoBannerCarousel({ slides }: Readonly<{ slides: readonly Slide[] }>) {
  const [activeId, setActiveId] = useState(slides[0]?.id);
  const [manualRevision, setManualRevision] = useState(0);
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  const [autoplayAllowed, setAutoplayAllowed] = useState(false);
  const banner = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ pointerId: number; x: number; y: number } | null>(null);
  const suppressClick = useRef(false);
  const id = useId();
  const activeIndex = Math.max(0, slides.findIndex(slide => slide.id === activeId));
  const active = slides[activeIndex];
  if (activeId !== active?.id) setActiveId(active?.id);
  const multiple = slides.length > 1;
  const paused = hovered || focused || !autoplayAllowed;

  useEffect(() => {
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setAutoplayAllowed(!reducedMotion.matches && !document.hidden);
    update();
    reducedMotion.addEventListener('change', update);
    document.addEventListener('visibilitychange', update);
    return () => {
      reducedMotion.removeEventListener('change', update);
      document.removeEventListener('visibilitychange', update);
    };
  }, []);

  useEffect(() => {
    if (!banner.current?.contains(document.activeElement)) setFocused(false);
  }, [slides]);

  useEffect(() => {
    if (!multiple || paused) return;
    const timer = window.setTimeout(() => {
      setActiveId(slides[(activeIndex + 1) % slides.length].id);
    }, AUTOPLAY_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [slides, activeIndex, multiple, paused, manualRevision]);

  const select = (index: number) => {
    const slide = slides[index];
    if (!slide) return;
    setActiveId(slide.id);
    setManualRevision(revision => revision + 1);
  };

  const startGesture = (event: PointerEvent<HTMLDivElement>) => {
    // Pointer interaction ends keyboard-focus pause, including clicks on controls.
    setFocused(false);
    suppressClick.current = false;
    gesture.current = null;
    if (event.pointerType === 'touch') setHovered(false);
    if (!multiple || !event.isPrimary || event.pointerType === 'mouse'
      || !(event.target instanceof HTMLElement) || event.target.closest('button')) return;
    gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    // Keep tap's original link target while tracking movement outside the banner.
    event.target.setPointerCapture(event.pointerId);
  };

  const finishGesture = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current;
    gesture.current = null;
    if (!start || start.pointerId !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    // Require 10% of banner width, bounded for small phones and wide tablets.
    const threshold = Math.min(80, Math.max(40, event.currentTarget.clientWidth * 0.1));
    if (Math.abs(dx) < threshold || Math.abs(dx) <= Math.abs(dy) * 1.5) return;
    suppressClick.current = true;
    select((activeIndex + (dx < 0 ? 1 : -1) + slides.length) % slides.length);
  };

  return (
    <div ref={banner} className={styles.banner} role="group" aria-label="Предложения магазина"
      aria-roledescription={multiple ? 'карусель' : undefined}
      onPointerEnter={event => {
        if (event.pointerType !== 'touch' && event.buttons === 0
          && window.matchMedia('(any-hover: hover)').matches) setHovered(true);
      }}
      onPointerLeave={() => setHovered(false)}
      onPointerDownCapture={startGesture}
      onPointerUp={finishGesture}
      onPointerCancel={() => { gesture.current = null; suppressClick.current = false; setHovered(false); }}
      onLostPointerCapture={() => {
        if (gesture.current) { gesture.current = null; suppressClick.current = false; }
      }}
      onClickCapture={event => {
        if (!suppressClick.current) return;
        suppressClick.current = false;
        if (event.detail === 0) return;
        event.preventDefault();
        event.stopPropagation();
      }}
      onDragStart={event => event.preventDefault()}
      onKeyDownCapture={() => setFocused(true)}
      onFocusCapture={event => setFocused(event.target.matches(':focus-visible'))}
      onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) setFocused(false); }}>
      {slides.map((slide, index) => (
        <div key={slide.id} id={`${id}-${index}`} className={styles.slide}
          data-active={index === activeIndex} aria-hidden={index !== activeIndex}
          inert={index !== activeIndex} role="group" aria-roledescription="слайд"
          aria-label={`${index + 1} из ${slides.length}: ${slide.label}`}>
          {slide.content}
        </div>
      ))}
      {multiple && <>
        <button type="button" className={`${styles.arrow} ${styles.previous}`} aria-label="Предыдущий баннер"
          onClick={() => select((activeIndex - 1 + slides.length) % slides.length)}>
          <Image src="/icons/promo/next-slide.svg" alt="" width={18.6952} height={32} />
        </button>
        <button type="button" className={`${styles.arrow} ${styles.next}`} aria-label="Следующий баннер"
          onClick={() => select((activeIndex + 1) % slides.length)}>
          <Image src="/icons/promo/next-slide.svg" alt="" width={18.6952} height={32} />
        </button>
        <div className={styles.pagination} role="group" aria-label="Выбрать баннер">
          {slides.map((slide, index) => (
            <button key={slide.id} type="button" className={styles.dot}
              aria-label={`Баннер ${index + 1}: ${slide.label}`} aria-controls={`${id}-${index}`}
              aria-current={index === activeIndex ? 'true' : undefined} onClick={() => select(index)} />
          ))}
        </div>
        <p className={styles.srOnly} aria-live={paused ? 'polite' : 'off'} aria-atomic="true">
          {activeIndex + 1} из {slides.length}: {active?.label}
        </p>
      </>}
    </div>
  );
}
