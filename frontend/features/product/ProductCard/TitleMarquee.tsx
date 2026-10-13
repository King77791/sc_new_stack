'use client';

import Link from 'next/link';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import styles from './ProductCard.module.css';

export function TitleMarquee({ href, title }: Readonly<{ href: string; title: string }>) {
  const link = useRef<HTMLAnchorElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [overflow, setOverflow] = useState(0);
  useEffect(() => {
    const element = link.current;
    const content = text.current;
    if (!element || !content) return;
    const measure = () => setOverflow(Math.max(0, content.scrollWidth - element.clientWidth));
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    observer.observe(content);
    measure();
    return () => observer.disconnect();
  }, [title]);
  const motionStyle = {
    '--title-distance': `${-overflow}px`,
    '--title-duration': `${Math.max(2, overflow / 45)}s`,
  } as CSSProperties;
  return (
    <Link href={href} title={title} ref={link} className={styles.marquee}
      data-overflow={overflow > 0} style={motionStyle}>
      <span ref={text}>{title}</span>
    </Link>
  );
}
