import type { NotificationEvent } from './notification.types';

export const ENTER_MS = 625;
export const REST_MS = 1250;
export const EXIT_MS = 625;
export type NotificationPhase = 'starting' | 'entering' | 'resting' | 'exiting';
export type Occurrence = Readonly<{ id: number; event: NotificationEvent }>;
export type NotificationSnapshot = Readonly<{
  active: Occurrence | null;
  pending: readonly Occurrence[];
  phase: NotificationPhase;
  paused: boolean;
}>;
export const emptySnapshot: NotificationSnapshot = { active: null, pending: [], phase: 'starting', paused: false };

type Clock = {
  now(): number;
  set(callback: () => void, delay: number): unknown;
  clear(handle: unknown): void;
};
const browserClock: Clock = {
  now: () => performance.now(),
  set: (callback, delay) => setTimeout(callback, delay),
  clear: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

/** Transient UI lifecycle only; injectable clock keeps timing tests deterministic. */
export function createNotificationController(clock: Clock = browserClock) {
  let snapshot = emptySnapshot;
  let serial = 0;
  let timer: unknown;
  let deadline = 0;
  let remaining = REST_MS;
  let reduced = false;
  let connected = false;
  let connection = 0;
  let timerVersion = 0;
  const reasons = new Set<'hover' | 'focus'>();
  const listeners = new Set<() => void>();
  const publish = (next: NotificationSnapshot) => { snapshot = next; listeners.forEach(listener => listener()); };
  const cancel = () => { timerVersion++; if (timer !== undefined) clock.clear(timer); timer = undefined; };
  const isCurrent = (id: number, phase: NotificationPhase) => snapshot.active?.id === id && snapshot.phase === phase;
  const schedule = (delay: number, callback: () => void) => {
    cancel();
    if (!connected) return;
    const version = timerVersion;
    deadline = clock.now() + delay;
    timer = clock.set(() => {
      if (!connected || version !== timerVersion) return;
      timer = undefined; callback();
    }, delay);
  };
  const remove = (id: number) => {
    if (snapshot.active?.id !== id) return;
    cancel(); reasons.clear(); remaining = REST_MS;
    const [active = null, ...pending] = snapshot.pending;
    publish({ active, pending, phase: 'starting', paused: false });
  };
  const exit = (id: number) => {
    if (!isCurrent(id, 'resting')) return;
    cancel();
    if (reduced) { remove(id); return; }
    publish({ ...snapshot, phase: 'exiting', paused: false });
    watchdog(id, 'exiting');
  };
  const restTimer = () => {
    const id = snapshot.active?.id;
    if (id === undefined || snapshot.phase !== 'resting' || reasons.size) return;
    schedule(remaining, () => { if (isCurrent(id, 'resting')) exit(id); });
  };
  const rest = (id: number) => {
    if (snapshot.active?.id !== id) return;
    cancel(); remaining = REST_MS;
    publish({ ...snapshot, phase: 'resting', paused: reasons.size > 0 });
    restTimer();
  };
  // Transition events are primary. This also recovers a remounted DOM with no transition.
  const watchdog = (id: number, phase: 'entering' | 'exiting') => {
    schedule((phase === 'entering' ? ENTER_MS : EXIT_MS) + 80, () => {
      if (!isCurrent(id, phase)) return;
      if (phase === 'entering') rest(id); else remove(id);
    });
  };
  return {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    notify: (event: NotificationEvent) => {
      const occurrence = { id: ++serial, event };
      publish(snapshot.active
        ? { ...snapshot, pending: [...snapshot.pending, occurrence] }
        : { active: occurrence, pending: [], phase: 'starting', paused: false });
    },
    connect: () => {
      if (connected) return connection;
      connected = true; connection++;
      const id = snapshot.active?.id;
      if (snapshot.phase === 'resting') restTimer();
      else if (id !== undefined && (snapshot.phase === 'entering' || snapshot.phase === 'exiting')) watchdog(id, snapshot.phase);
      return connection;
    },
    disconnect: () => {
      if (snapshot.phase === 'resting' && timer !== undefined) remaining = Math.max(0, deadline - clock.now());
      connected = false; cancel();
      // Hover/focus belong to the disconnected DOM, not the retained occurrence.
      reasons.clear();
      if (snapshot.paused) publish({ ...snapshot, paused: false });
    },
    enter: (id: number) => {
      if (!connected || !isCurrent(id, 'starting')) return;
      if (reduced) { rest(id); return; }
      publish({ ...snapshot, phase: 'entering' });
      watchdog(id, 'entering');
    },
    transitionStarted: (id: number, phase: NotificationPhase, owner = connection) => {
      if (!connected || owner !== connection || !isCurrent(id, phase)) return;
      if (phase === 'entering' || phase === 'exiting') watchdog(id, phase);
    },
    complete: (id: number, phase: NotificationPhase, owner = connection) => {
      if (!connected || owner !== connection || !isCurrent(id, phase)) return;
      if (phase === 'entering') rest(id);
      if (phase === 'exiting') remove(id);
    },
    setReducedMotion: (value: boolean) => {
      reduced = value;
      const id = snapshot.active?.id;
      if (value && id !== undefined) {
        if (snapshot.phase === 'entering') rest(id);
        else if (snapshot.phase === 'exiting') remove(id);
      }
    },
    pause: (reason: 'hover' | 'focus', value: boolean) => {
      const wasPaused = reasons.size > 0;
      if (value) reasons.add(reason); else reasons.delete(reason);
      if (snapshot.phase !== 'resting' || wasPaused === (reasons.size > 0)) return;
      if (reasons.size) {
        if (timer !== undefined) remaining = Math.max(0, deadline - clock.now());
        cancel();
      }
      publish({ ...snapshot, paused: reasons.size > 0 });
      if (!reasons.size) restTimer();
    },
  };
}
export type NotificationController = ReturnType<typeof createNotificationController>;
