import type { BasketProjection } from './basket-pricing.types';

export type CheckoutBlocker = 'empty-cart' | 'invalid-quantity' | 'missing-product' | 'invalid-configuration'
  | 'availability-unconfirmed' | 'incomplete-pricing' | 'stale-pricing' | 'currency-mismatch' | 'overflow'
  | 'fixture-only-authority' | 'authority-unconfirmed' | 'checkout-integration-missing';

export function evaluateBasketCheckout(projection: BasketProjection): Readonly<{
  projectionReady: boolean; authority: BasketProjection['authority']; checkoutActionAvailable: false;
  reasons: readonly CheckoutBlocker[];
}> {
  const reasons = new Set<CheckoutBlocker>();
  if (!projection.itemCount) reasons.add('empty-cart');
  if (projection.groups.some(group => group.lines.some(line => !Number.isSafeInteger(line.item.quantity) || line.item.quantity <= 0))) reasons.add('invalid-quantity');
  for (const group of projection.groups) {
    if (group.product.status !== 'ready') reasons.add('missing-product');
    for (const line of group.lines) {
      if (!line.definition || line.quote.status === 'invalid-pricing-data') reasons.add('invalid-configuration');
      if (line.availability !== 'available') reasons.add('availability-unconfirmed');
    }
  }
  if (projection.coverage !== 'complete' || !projection.totals || projection.issues.length) reasons.add('incomplete-pricing');
  for (const issue of projection.issues) {
    if (issue.code === 'stale') reasons.add('stale-pricing');
    if (issue.code === 'incompatible-currency') reasons.add('currency-mismatch');
    if (issue.code === 'aggregation-overflow') reasons.add('overflow');
  }
  const projectionReady = reasons.size === 0;
  if (projection.authority === 'fixture') reasons.add('fixture-only-authority');
  if (projection.authority === 'unknown') reasons.add('authority-unconfirmed');
  reasons.add('checkout-integration-missing');
  return { projectionReady, authority: projection.authority, checkoutActionAvailable: false, reasons: [...reasons] };
}
