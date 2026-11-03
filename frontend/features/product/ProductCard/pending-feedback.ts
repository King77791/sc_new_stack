/** Local presentation timer; never delays or owns a Cart mutation. */
export const PENDING_FEEDBACK_DELAY = 120;

type Clock = {
  schedule: (callback: () => void, delay: number) => unknown;
  cancel: (handle: unknown) => void;
};

export function createPendingFeedback(onVisibility: (visible: boolean) => void, clock: Clock = {
  schedule: (callback, delay) => setTimeout(callback, delay),
  cancel: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
}) {
  let timer: unknown;
  let generation = 0;
  let disposed = false;
  const clear = () => { generation += 1; clock.cancel(timer); timer = undefined; };
  return {
    start() {
      if (disposed) return;
      clear();
      onVisibility(false);
      const session = generation;
      timer = clock.schedule(() => {
        if (!disposed && session === generation) onVisibility(true);
      }, PENDING_FEEDBACK_DELAY);
    },
    finish() {
      clear();
      if (!disposed) onVisibility(false);
    },
    dispose() { clear(); disposed = true; },
  };
}
