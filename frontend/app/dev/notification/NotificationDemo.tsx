'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { NotificationPreview, useNotification } from '@/components/Notification/NotificationProvider';
import { createNotificationController } from '@/components/Notification/notification.controller';
import type { NotificationEvent } from '@/components/Notification/notification.types';
import styles from './page.module.css';

function cart(label = '50 г.'): NotificationEvent {
  return { type: 'cart.added', payload: { itemId: label, productKey: 'synthetic', title: 'Synthetic tea', configurationLabel: label, addedQuantity: 1 } };
}

export function NotificationDemo() {
  const notify = useNotification();
  const [preview] = useState(createNotificationController);
  const [interactive, setInteractive] = useState(false);
  const [clicks, setClicks] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const during = (delay: number) => {
    notify(cart());
    timers.current.push(setTimeout(() => notify({ type: 'favorite.added', payload: { productKey: 'synthetic', title: 'Synthetic favorite' } }), delay));
  };
  const showPreview = (text: string, controls = false) => {
    setInteractive(controls);
    preview.notify({ type: 'favorite.added', payload: { productKey: 'preview', title: text } });
  };
  return <main className={styles.demo}>
    <h1>Notification · isolated QA</h1>
    <p>Синтетические события не изменяют Cart/Favorite. Motion: 625 / 1250 / 625 ms. Наведите мышь для паузы REST.</p>
    <div className={styles.controls}>
      <button onClick={() => notify(cart())}>Cart success</button>
      <button onClick={() => notify({ type: 'favorite.added', payload: { productKey: 'synthetic', title: 'Synthetic favorite' } })}>Favorite success</button>
      <button onClick={() => { notify(cart()); notify(cart()); }}>Repeated identical</button>
      <button onClick={() => { notify(cart()); notify(cart()); notify(cart('100 г.')); }}>ADD 50 / 50 / 100</button>
      <button onClick={() => during(250)}>Event during ENTER</button>
      <button onClick={() => during(1000)}>Event during REST</button>
      <button onClick={() => during(2100)}>Event during EXIT</button>
    </div>
    <h2>Shell composition preview</h2>
    <p>Отдельный dev preview использует тот же lifecycle и shell, без новых production event types. Запускайте после завершения основной очереди.</p>
    <div className={styles.controls}>
      <button onClick={() => showPreview('Длинное сообщение для проверки естественного переноса текста и безопасных отступов от границ viewport. '.repeat(4))}>Long text</button>
      <button onClick={() => showPreview('Неразрывноеслово'.repeat(35))}>Unbreakable text</button>
      <button onClick={() => showPreview('Проверка hover + focus: Tab к кнопке или ссылке, затем уберите мышь.', true)}>Interactive preview</button>
    </div>
    <p>Preview action count: <output data-preview-clicks>{clicks}</output></p>
    <p>Reduced motion: включите системную настройку или DevTools → Rendering → prefers-reduced-motion.</p>
    <Link href="/dev/notification/observer">Client navigation observer</Link>
    <NotificationPreview controller={preview} renderContent={event => <>
      <span>{event.payload.title}</span>
      {interactive && <div className={styles.previewActions}>
        <button onClick={() => setClicks(value => value + 1)}>Preview action</button>
        <Link href="/dev/notification/observer">Preview link</Link>
      </div>}
    </>} />
  </main>;
}
