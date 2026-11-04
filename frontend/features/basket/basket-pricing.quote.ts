import type { CartItem } from '../cart/cart.types';
import { getCartItemId } from '../cart/cart.model';
import { checkedMinor, moneyIssue, rub } from './basket-money';
import { nonempty, sameIdentity, validIdentity } from './basket-product.adapter';
import type { CatalogBundle, ConfigurationPrice, Diagnostic, IssueCode, LineQuote, PricingContext, ProductDiscountPolicy, ProductPresentation, QuoteBinding } from './basket-pricing.types';

export function validContext(value: unknown): value is PricingContext {
  if (!value || typeof value !== 'object') return false;
  const ctx = value as PricingContext;
  return (ctx.source === 'fixture' || ctx.source === 'backend') && nonempty(ctx.catalogRevision) && nonempty(ctx.pricingRevision);
}
export function sameContext(a: PricingContext, b: PricingContext): boolean {
  return a.source === b.source && a.catalogRevision === b.catalogRevision && a.pricingRevision === b.pricingRevision;
}

/** A coherent monetary bundle can omit a price (unavailable), but cannot mix revisions. */
export function validateCatalogBundle(bundle: CatalogBundle | undefined, product: ProductPresentation, context: PricingContext): IssueCode | undefined {
  if (!bundle) return 'unavailable';
  if (!validContext(context) || !validContext(bundle.context) || bundle.productKey !== product.productKey
    || !Array.isArray(bundle.prices)) return 'invalid-pricing-data';
  if (!sameContext(bundle.context, context)) return 'stale';
  const policy = bundle.policy;
  if (!policy || policy.status === 'unavailable') return 'unavailable';
  if (policy.status !== 'confirmed' || !['active', 'none'].includes(policy.state)
    || policy.productKey !== bundle.productKey || !nonempty(policy.policyRevision) || !validContext(policy.context)) return 'invalid-pricing-data';
  if (!sameContext(policy.context, context)) return 'stale';
  const identities = new Set<string>();
  for (const price of bundle.prices) {
    if (!price || !validIdentity(price.identity) || price.identity.productKey !== bundle.productKey
      || !nonempty(price.priceRevision) || !nonempty(price.policyRevision) || !validContext(price.context)
      || price.application !== 'catalog-confirmed' || price.quantityRule !== 'constant-unit-v1'
      || !product.definitions.some(d => sameIdentity({ productKey: product.productKey, configuration: d.configuration }, price.identity))) return 'invalid-pricing-data';
    const id = getCartItemId(price.identity);
    if (identities.has(id)) return 'invalid-pricing-data';
    identities.add(id);
    if (price.policyRevision !== policy.policyRevision || !sameContext(price.context, context)) return 'stale';
  }
}

export function projectProductBadge(policy: ProductDiscountPolicy | undefined): Readonly<{
  badge?: Readonly<{ basisPoints: number }>; diagnostics: readonly Diagnostic[];
}> {
  if (!policy || policy.status !== 'confirmed' || policy.state !== 'active') return { diagnostics: [] };
  const percentage = policy.percentage;
  if (!percentage || percentage.status === 'unavailable') return { diagnostics: [{ code: 'badge-unavailable', productKey: policy.productKey }] };
  if (percentage.status !== 'confirmed' || !Number.isSafeInteger(percentage.basisPoints)
    || percentage.basisPoints <= 0 || percentage.basisPoints > 10000
    || percentage.semantics !== 'product-policy-rate' || !nonempty(percentage.roundingRuleRef)) {
    return { diagnostics: [{ code: 'badge-invalid', productKey: policy.productKey }] };
  }
  return { badge: { basisPoints: percentage.basisPoints }, diagnostics: [] };
}

export function resolveBasketLineQuote(item: CartItem, product: ProductPresentation, bundle: CatalogBundle | undefined, context: PricingContext): LineQuote {
  const fail = (code: IssueCode, reason: string): LineQuote => ({ status: code,
    issue: { code, scope: 'line', productKey: item.productKey, itemId: item.id, reason } });
  if (!validIdentity(item) || item.id !== getCartItemId(item) || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) return fail('invalid-pricing-data', 'Invalid canonical identity or quantity');
  if (product.status !== 'ready') return fail(product.status === 'invalid' ? 'invalid-pricing-data' : 'unavailable', 'Current Product definition unavailable');
  if (!product.definitions.some(d => sameIdentity({ productKey: product.productKey, configuration: d.configuration }, item))) return fail('invalid-pricing-data', 'Configuration is not a Product member');
  const invalid = validateCatalogBundle(bundle, product, context);
  if (invalid) return fail(invalid, 'Catalog monetary bundle is not coherent');
  // Validation above establishes confirmed policy and unique membership; absence is not no-discount.
  const policy = bundle!.policy!;
  const price = bundle!.prices.find(p => sameIdentity(p.identity, item));
  if (!price) return fail('unavailable', 'Configuration price unavailable');
  const badMoney = moneyIssue(price.originalUnit, true) ?? moneyIssue(price.currentUnit, true);
  if (badMoney) return fail(badMoney, 'Invalid configuration money');
  const active = policy.status === 'confirmed' && policy.state === 'active';
  const original = price.originalUnit.minor, current = price.currentUnit.minor;
  if (active ? original <= current : original !== current) return fail('invalid-pricing-data', 'Prices contradict monetary policy state');
  const originalLine = checkedMinor(BigInt(original) * BigInt(item.quantity));
  const currentLine = checkedMinor(BigInt(current) * BigInt(item.quantity));
  if (originalLine === undefined || currentLine === undefined) return fail('aggregation-overflow', 'Line amount exceeds safe range');
  return { status: 'ready', binding: bindingFor(item, price, context),
    originalUnit: rub(original), currentUnit: rub(current), originalLine: rub(originalLine), currentLine: rub(currentLine),
    lineSavings: rub(Number(BigInt(originalLine) - BigInt(currentLine))), showOriginal: active };
}

function bindingFor(item: CartItem, price: ConfigurationPrice, context: PricingContext): QuoteBinding {
  return { itemId: item.id, identity: { productKey: item.productKey, configuration: { ...item.configuration } }, quantity: item.quantity,
    policyRevision: price.policyRevision, priceRevision: price.priceRevision, context: { ...context } };
}

/** Caller owns opaque request tokens; no global counter, transport or Cart publication promise. */
export function acceptsBasketQuote(quote: LineQuote, current: LineQuote, requestToken: unknown, currentToken: unknown): boolean {
  if (requestToken === undefined || requestToken === null || requestToken !== currentToken || quote.status !== 'ready' || current.status !== 'ready') return false;
  const a = quote.binding, b = current.binding;
  return a.itemId === b.itemId && sameIdentity(a.identity, b.identity) && a.quantity === b.quantity
    && a.policyRevision === b.policyRevision && a.priceRevision === b.priceRevision && sameContext(a.context, b.context);
}
