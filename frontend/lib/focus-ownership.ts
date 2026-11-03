/** Local interaction lease: BODY is allowed only if no newer focus/pointer intent was observed. */
export function captureFocusOwnership(origin: HTMLElement | null) {
  let owned = origin !== null && document.activeElement === origin;
  const focus = (event: FocusEvent) => {
    if (event.target !== origin && event.target !== document.body && event.target !== document.documentElement) owned = false;
  };
  const pointer = (event: PointerEvent) => {
    if (origin === document.body || !(event.target instanceof Node) || !origin?.contains(event.target)) owned = false;
  };
  document.addEventListener('focusin', focus, true);
  document.addEventListener('pointerdown', pointer, true);
  const dispose = () => {
    owned = false;
    document.removeEventListener('focusin', focus, true);
    document.removeEventListener('pointerdown', pointer, true);
  };
  return {
    dispose,
    release() {
      const active = document.activeElement;
      const retained = owned && (active === origin || active === document.body);
      dispose();
      return retained;
    },
  };
}
