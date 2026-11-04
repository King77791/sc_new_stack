import type { CartItem } from '../cart/cart.types';
import { getCartItemId } from '../cart/cart.model';
import type { ProductCardData } from '../product/ProductCard/ProductCard.types';
import { checkedMinor, rub } from './basket-money';
import { adaptBasketProduct, basketAvailability, sameIdentity, validIdentity } from './basket-product.adapter';
import { projectProductBadge, resolveBasketLineQuote, validateCatalogBundle } from './basket-pricing.quote';
import type { AvailabilityInput, BasketLine, BasketProjection, CatalogBundle, Coverage, PricingContext, PricingIssue, PricingTotals, ProductGroup } from './basket-pricing.types';

function coverage(ready: number, total: number): Coverage {
  return ready === total ? 'complete' : ready ? 'partially-unavailable' : 'unavailable';
}
function aggregate(totals: readonly PricingTotals[]): PricingTotals | undefined {
  const sum = (key: keyof PricingTotals) => checkedMinor(totals.reduce((n, t) => n + BigInt(t[key].minor), BigInt(0)));
  const reference = sum('referenceSubtotal'), current = sum('currentSubtotal'), discount = sum('discountAmount');
  return reference === undefined || current === undefined || discount === undefined ? undefined
    : { referenceSubtotal: rub(reference), currentSubtotal: rub(current), discountAmount: rub(discount) };
}

/** Derived values only. The returned item references remain canonical; no commands or state. */
export function projectBasketPricing(items: readonly CartItem[], products: readonly ProductCardData[], bundles: readonly CatalogBundle[],
  context: PricingContext, availability: readonly AvailabilityInput[] = []): BasketProjection {
  const byProduct = new Map<string, CartItem[]>();
  for (const item of items) byProduct.set(item.productKey, [...(byProduct.get(item.productKey) ?? []), item]);
  const duplicateIds = new Set(items.filter((item, i) => items.findIndex(other => other.id === item.id) !== i).map(item => item.id));
  const groups: ProductGroup[] = [];
  for (const [productKey, canonical] of byProduct) {
    const product = adaptBasketProduct(productKey, canonical, products);
    const matches = bundles.filter(b => b && b.productKey === productKey);
    const bundle = matches.length === 1 ? matches[0] : undefined;
    const lines: BasketLine[] = canonical.map(item => {
      const definition = product.definitions.find(d => sameIdentity({ productKey, configuration: d.configuration }, item));
      let quote = resolveBasketLineQuote(item, product, bundle, context);
      if (matches.length > 1 || duplicateIds.has(item.id)) quote = { status: 'invalid-pricing-data', issue: {
        code: 'invalid-pricing-data', scope: 'line', productKey, itemId: item.id, reason: 'Ambiguous pricing bundle or duplicate Cart identity' } };
      const state = basketAvailability(item, products, availability);
      const valid = product.status === 'ready' && !!definition && validIdentity(item) && item.id === getCartItemId(item)
        && Number.isSafeInteger(item.quantity) && item.quantity > 0 && !duplicateIds.has(item.id);
      return { item, definition, quote, availability: state, canIncrease: valid && state === 'available',
        canTransfer: valid && item.configuration.kind === 'selectable',
        canDecrease: Number.isSafeInteger(item.quantity) && item.quantity > 0, canRemove: true };
    });
    // Only sort with complete explicit metadata. Otherwise preserve canonical relative order.
    if (lines.every(line => line.definition && (line.definition.configuration.kind === 'fixed' || Number.isSafeInteger(line.definition.weightGrams)))) {
      lines.sort((a, b) => (a.definition?.weightGrams ?? 0) - (b.definition?.weightGrams ?? 0));
    }
    const issues = lines.flatMap(line => line.quote.status === 'ready' ? [] : [line.quote.issue]);
    const ready = lines.flatMap(line => line.quote.status === 'ready' ? [{ referenceSubtotal: line.quote.originalLine,
      currentSubtotal: line.quote.currentLine, discountAmount: line.quote.lineSavings }] : []);
    const totals = ready.length === lines.length ? aggregate(ready) : undefined;
    if (ready.length === lines.length && !totals) issues.push({ code: 'aggregation-overflow', scope: 'group', productKey, reason: 'Group amount exceeds safe range' });
    const badge = bundle && product.status === 'ready' && matches.length === 1 && !validateCatalogBundle(bundle, product, context)
      ? projectProductBadge(bundle.policy) : { diagnostics: [] };
    groups.push({ productKey, product, lines, coverage: coverage(ready.length, lines.length), issues,
      diagnostics: [...product.diagnostics, ...badge.diagnostics], badge: badge.badge, totals,
      showSavings: !!totals && totals.discountAmount.minor > 0 });
  }
  const issues: PricingIssue[] = groups.flatMap(group => group.issues);
  const readyLines = groups.reduce((n, group) => n + group.lines.filter(line => line.quote.status === 'ready').length, 0);
  const totals = groups.every(group => group.totals) ? aggregate(groups.map(group => group.totals!)) : undefined;
  if (groups.every(group => group.totals) && !totals) issues.push({ code: 'aggregation-overflow', scope: 'basket', reason: 'Basket amount exceeds safe range' });
  const validQuantities = items.every(item => Number.isSafeInteger(item.quantity) && item.quantity > 0);
  const totalQuantity = validQuantities ? checkedMinor(items.reduce((n, item) => n + BigInt(item.quantity), BigInt(0))) : undefined;
  if (validQuantities && totalQuantity === undefined) issues.push({ code: 'aggregation-overflow', scope: 'basket', reason: 'Total quantity exceeds safe range' });
  const sources = groups.flatMap(group => group.lines.flatMap(line => line.quote.status === 'ready' ? [line.quote.binding.context.source] : []));
  const authority = sources.length !== items.length || !items.length ? 'unknown' : sources.every(s => s === 'backend') ? 'backend' : 'fixture';
  return { groups, coverage: coverage(readyLines, items.length), issues, totals,
    itemCount: items.length, totalQuantity, productGroupCount: groups.length, authority };
}
