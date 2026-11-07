/** Basket-local presentation history only. Never retains items, quantities or prices. */
export function reconcileBasketGroupOrder(previous: readonly string[], current: readonly string[]): readonly string[] {
  const remaining = new Set(current);
  const next: string[] = [];
  for (const key of previous) if (remaining.delete(key)) next.push(key);
  for (const key of current) if (remaining.delete(key)) next.push(key);
  return next.length === previous.length && next.every((key, index) => key === previous[index]) ? previous : next;
}
