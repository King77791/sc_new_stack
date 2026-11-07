import type { BasketProjection, BasketLine, PricingTotals, PricingIssue } from '../basket-pricing.types';
import { formatBasketMoney } from '../basket-money';

export const CHECKOUT_UNAVAILABLE = 'Оформление заказа пока недоступно';
export function pricingStatus(issues: readonly PricingIssue[]) {
  if (issues.some(i => i.code === 'aggregation-overflow')) return 'Сумма превышает допустимый предел. Стоимость уточняется.';
  if (issues.some(i => i.code === 'stale')) return 'Цены обновляются. Стоимость уточняется.';
  return 'Стоимость уточняется';
}
function totalsView(totals?: PricingTotals) {
  if (!totals) return undefined;
  const discounted = totals.discountAmount.minor > 0;
  return { current: formatBasketMoney(totals.currentSubtotal),
    original: discounted ? formatBasketMoney(totals.referenceSubtotal) : undefined,
    savings: discounted ? formatBasketMoney(totals.discountAmount) : undefined };
}
export function basketLineView(line: BasketLine) {
  const quote = line.quote;
  return { ...line, label: line.definition?.label ?? line.item.presentation.configurationLabel
      ?? (line.item.configuration.kind === 'fixed' ? 'За штуку' : 'Неизвестная фасовка'),
    price: quote.status === 'ready' ? formatBasketMoney(quote.currentLine) : undefined,
    original: quote.status === 'ready' && quote.showOriginal ? formatBasketMoney(quote.originalLine) : undefined,
    priceStatus: quote.status === 'ready' ? undefined : pricingStatus([quote.issue]),
    availabilityLabel: line.availability === 'available' ? undefined : line.availability === 'unavailable' ? 'Нет в наличии'
      : line.availability === 'not-purchasable' ? 'Покупка недоступна' : 'Наличие уточняется' };
}
/** Presentation only; preserve Gate 8B Product identity, ordering and canonical item references. */
export function toBasketView(projection: BasketProjection) {
  return { empty: projection.itemCount === 0,
    groups: projection.groups.map(group => ({ productKey: group.productKey, presentation: group.product,
      badge: group.badge ? `−${group.badge.basisPoints / 100}%` : undefined,
      configurations: group.lines.map(basketLineView), totals: totalsView(group.totals),
      coverage: group.coverage, issues: group.issues,
      priceStatus: group.totals ? undefined : pricingStatus(group.issues) })),
    summary: { quantity: projection.totalQuantity, totals: totalsView(projection.totals),
      priceStatus: projection.totals ? undefined : pricingStatus(projection.issues),
      checkoutLabel: CHECKOUT_UNAVAILABLE },
  };
}
export type BasketViewModel = ReturnType<typeof toBasketView>;

/** Deterministic next/previous fallback after a row disappears. No Cart mutation or focus side effect. */
export function basketFocusTarget(previous: readonly string[], removed: string, remaining: readonly string[]) {
  const index = previous.indexOf(removed);
  const candidates = index < 0 ? remaining : [...previous.slice(index + 1), ...previous.slice(0, index).reverse()];
  return candidates.find(id => remaining.includes(id)) ?? remaining[0];
}
