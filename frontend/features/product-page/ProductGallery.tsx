'use client';

import { useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import type { ProductDetailMedia } from '../product-input/product-input.detail';
import { galleryGesture } from './gallery-gesture';
import styles from './ProductGallery.module.css';

type Props = Readonly<{ identity: string; title: string; images: readonly ProductDetailMedia[]; mainImageFallback?: boolean }>;
/** A new Product/media generation starts a new interaction session, including gesture cleanup. */
export function ProductGallery(props: Props) {
  return <GallerySession key={`${props.identity}:${JSON.stringify(props.images)}`} {...props} />;
}
function GallerySession({ title, images, mainImageFallback = false }: Props) {
  const [active, setActive] = useState(0), [offset, setOffset] = useState(0);
  const viewport = useRef<HTMLDivElement>(null);
  const gesture = useRef<{ pointerId: number; x: number; y: number; target: HTMLDivElement; horizontal: boolean } | null>(null);
  const multiple = images.length > 1;
  const release = useCallback(() => {
    const current = gesture.current;
    gesture.current = null;
    if (current?.target.hasPointerCapture(current.pointerId)) current.target.releasePointerCapture(current.pointerId);
  }, []);
  useEffect(() => {
    const resize = () => { release(); setOffset(0); };
    window.addEventListener('resize', resize);
    return () => { window.removeEventListener('resize', resize); release(); };
  }, [release]);
  const move = (delta: number) => setActive(value => Math.max(0, Math.min(images.length - 1, value + delta)));
  const cancel = () => { release(); setOffset(0); };
  const finish = (event: PointerEvent<HTMLDivElement>) => {
    const current = gesture.current;
    if (!current || current.pointerId !== event.pointerId) return;
    const delta = galleryGesture(event.clientX - current.x, event.clientY - current.y, viewport.current?.clientWidth ?? 375);
    release(); setOffset(0);
    if (delta) move(delta);
  };
  if (!images.length) return <section className={styles.empty} aria-label="Фотографии товара"><p>Изображение недоступно.</p></section>;
  return <section className={styles.gallery} aria-label={`Фотографии: ${title}`}>
    <div ref={viewport} className={styles.viewport} role="region" aria-label="Галерея изображений"
      aria-roledescription={multiple ? 'карусель' : undefined} tabIndex={multiple ? 0 : undefined}
      data-multiple={multiple || undefined} data-main-image-fallback={mainImageFallback || undefined}
      data-dragging={offset !== 0 || undefined}
      onKeyDown={event => {
        if (!multiple || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault(); cancel();
        if (event.key === 'Home') setActive(0);
        else if (event.key === 'End') setActive(images.length - 1);
        else move(event.key === 'ArrowRight' ? 1 : -1);
      }}
      onPointerDown={event => {
        if (!multiple || !event.isPrimary || event.button !== 0 || (event.target as HTMLElement).closest('button')) return;
        cancel();
        gesture.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, target: event.currentTarget, horizontal: false };
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={event => {
        const current = gesture.current;
        if (!current || current.pointerId !== event.pointerId) return;
        const dx = event.clientX - current.x, dy = event.clientY - current.y;
        if (!current.horizontal && Math.abs(dy) > 8 && Math.abs(dy) >= Math.abs(dx)) { cancel(); return; }
        if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy) * 1.5) current.horizontal = true;
        if (current.horizontal) setOffset(Math.max(-160, Math.min(160, dx)));
      }}
      onPointerUp={finish} onPointerCancel={cancel} onLostPointerCapture={cancel} onDragStart={event => event.preventDefault()}>
      {images.map((image, index) => <figure key={`${image.src}:${index}`} className={styles.slide}
        aria-hidden={index !== active} data-active={index === active || undefined}
        style={{ transform: `translateX(calc(${index - active} * (100% + var(--gallery-gap)) + ${offset}px))` }}>
        {/* Local, validated media; intrinsic dimensions reserve the source ratio. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt={index === active ? image.alt : ''} width={image.width} height={image.height}
          draggable={false} loading={Math.abs(index - active) <= 1 ? 'eager' : 'lazy'} />
      </figure>)}
      {multiple && <div className={styles.controls}>
        <button type="button" aria-label="Предыдущее изображение" disabled={active === 0} onClick={() => { cancel(); move(-1); }}><span className={styles.previous} aria-hidden="true" /></button>
        <button type="button" aria-label="Следующее изображение" disabled={active === images.length - 1} onClick={() => { cancel(); move(1); }}><span className={styles.next} aria-hidden="true" /></button>
      </div>}
    </div>
    {multiple && <p className={styles.status} aria-live="polite" aria-atomic="true">Изображение {active + 1} из {images.length}</p>}
  </section>;
}
