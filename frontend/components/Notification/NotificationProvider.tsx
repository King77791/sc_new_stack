'use client';

import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type Dispatch, type ReactNode, type SetStateAction } from 'react';
import { createNotificationController, emptySnapshot, type NotificationController } from './notification.controller';
import { notificationMessage } from './notification.types';
import { NotificationShell } from './NotificationShell';
import styles from './Notification.module.css';

const NotificationContext = createContext<NotificationController | null>(null);
type PreviewRegistration = {
  controller: NotificationController;
  renderContent: (event: Parameters<typeof notificationMessage>[0]) => ReactNode;
};
const PreviewContext = createContext<Dispatch<SetStateAction<PreviewRegistration | null>> | null>(null);

export function NotificationProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [controller] = useState(createNotificationController);
  const [preview, setPreview] = useState<PreviewRegistration | null>(null);
  return <NotificationContext.Provider value={controller}>
    <PreviewContext.Provider value={setPreview}>
      {children}
      {preview && <NotificationViewport {...preview} preview />}
    </PreviewContext.Provider>
  </NotificationContext.Provider>;
}

/** Registers composition at the application boundary, outside page stacking contexts. */
export function NotificationPreview({ controller, renderContent }: PreviewRegistration) {
  const register = useContext(PreviewContext);
  if (!register) throw new Error('NotificationPreview requires NotificationProvider');
  useEffect(() => {
    const registration = { controller, renderContent };
    register(registration);
    return () => register(current => current === registration ? null : current);
  }, [controller, renderContent, register]);
  return null;
}

function useController() {
  const controller = useContext(NotificationContext);
  if (!controller) throw new Error('Notification requires NotificationProvider');
  return controller;
}

export function useNotification() {
  return useController().notify;
}

export function NotificationHost() {
  const controller = useController();
  return <NotificationViewport controller={controller} />;
}

/** Also used by the isolated dev composition preview, without extending dispatch events. */
function NotificationViewport({ controller, renderContent = notificationMessage, preview = false }: Readonly<{
  controller: NotificationController;
  renderContent?: (event: Parameters<typeof notificationMessage>[0]) => ReactNode;
  preview?: boolean;
}>) {
  const state = useSyncExternalStore(controller.subscribe, controller.getSnapshot, () => emptySnapshot);
  const { active, phase, paused } = state;
  const [connection, setConnection] = useState(-1);
  const stage = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => controller.setReducedMotion(media.matches);
    update(); setConnection(controller.connect());
    const shell = stage.current?.firstElementChild;
    controller.pause('hover', Boolean(shell?.matches(':hover')));
    controller.pause('focus', Boolean(shell?.contains(document.activeElement)));
    media.addEventListener('change', update);
    return () => { media.removeEventListener('change', update); controller.disconnect(); };
  }, [controller]);
  useEffect(() => {
    if (!active || phase !== 'starting') return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => controller.enter(active.id));
    });
    return () => cancelAnimationFrame(frame);
  }, [controller, active, phase]);
  return <>
    <div className={styles.live} data-notification-live={preview ? undefined : ''} data-preview-live={preview ? '' : undefined} role="status" aria-live="polite" aria-atomic="true">
      {active && phase !== 'starting' && <span key={active.id}>{notificationMessage(active.event)}</span>}
    </div>
    <div ref={stage} className={styles.stage} data-notification-host={preview ? undefined : ''} data-notification-preview={preview ? '' : undefined}>
      {active && <NotificationShell key={active.id} data-notification-id={active.id}
        data-event={active.event.type} data-phase={phase} data-paused={paused}
        aria-hidden={preview ? undefined : true} inert={phase === 'starting' || phase === 'entering' || phase === 'exiting' ? true : undefined}
        onMouseEnter={() => controller.pause('hover', true)} onMouseLeave={() => controller.pause('hover', false)}
        onFocusCapture={() => controller.pause('focus', true)}
        onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget)) controller.pause('focus', false); }}
        onTransitionRun={event => {
          // React 19.1 does not copy propertyName onto its transitionrun wrapper.
          if (event.target === event.currentTarget && event.nativeEvent.propertyName === 'transform') controller.transitionStarted(active.id, phase, connection);
        }}
        onTransitionEnd={event => {
          if (event.target === event.currentTarget && event.propertyName === 'transform') controller.complete(active.id, phase, connection);
        }}>
        {renderContent(active.event)}
      </NotificationShell>}
    </div>
  </>;
}
