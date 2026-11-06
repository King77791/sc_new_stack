import { adaptBasketProduct, nonempty, sameIdentity, validIdentity } from '../basket/basket-product.adapter';
import { moneyIssue } from '../basket/basket-money';
import { projectProductBadge, validateCatalogBundle, validContext } from '../basket/basket-pricing.quote';
import type { AvailabilityInput, CatalogBundle, ConfigurationPrice } from '../basket/basket-pricing.types';
import type { ProductCardData } from '../product/ProductCard/ProductCard.types';
import { productDefinitionCard } from './product-input.definition';
import { deepFreeze } from './product-input.snapshot';
import type { ProductInputIssue, ProductInputSnapshot, ProductInputViews } from './product-input.types';

/** Expected malformed input yields diagnostics, never a global application exception. */
export function prepareProductInputs(snapshot: ProductInputSnapshot): ProductInputViews {
  const issues: ProductInputIssue[] = [], products: ProductCardData[] = [], bundles: CatalogBundle[] = [], availability: AvailabilityInput[] = [];
  if (!snapshot || !nonempty(snapshot.snapshotId) || snapshot.provenance !== 'demonstration-fixture'
    || !validContext(snapshot.context) || snapshot.context.source !== 'fixture' || !Array.isArray(snapshot.products)) {
    return deepFreeze({ snapshot, products, bundles, availability, issues: [{ code: 'snapshot' as const }] });
  }
  for (const product of snapshot.products) {
    const productKey = product?.productKey;
    const issue = (code: ProductInputIssue['code']) => issues.push({ code, productKey });
    if (!product || !nonempty(productKey)) { issue('definition'); continue; }
    if (snapshot.products.filter(p => p?.productKey === productKey).length !== 1) issue('duplicate-product');
    const card = productDefinitionCard(product);
    if (!card) { issue('definition'); continue; }
    products.push(card);
    const definition = adaptBasketProduct(productKey, [], [card]);
    if (card.slug !== productKey || definition.status !== 'ready'
      || !['regular', 'preorder'].includes(card.purchasePresentation)) issue('definition');
    if (card.purchasePresentation === 'preorder') issue('excluded-preorder');
    const bundle = product.commerce;
    if (bundle) bundles.push(bundle);
    const bundleIssue = validateCatalogBundle(bundle, definition, snapshot.context);
    if (bundleIssue) issue(bundleIssue === 'stale' ? 'revision' : 'policy');
    if (bundle && Array.isArray(bundle.prices)) {
      for (const price of bundle.prices) {
        if (moneyIssue(price?.originalUnit, true) || moneyIssue(price?.currentUnit, true)) { issue('money'); continue; }
        const policy = bundle.policy;
        if (policy?.status === 'confirmed' && (policy.state === 'active'
          ? price.originalUnit.minor <= price.currentUnit.minor : price.originalUnit.minor !== price.currentUnit.minor)) issue('money');
      }
      if (projectProductBadge(bundle.policy).diagnostics.length) issue('badge');
    }
    const entries: readonly AvailabilityInput[] = Array.isArray(product.availability) ? product.availability : [];
    for (const d of definition.definitions) {
      const identity = { productKey, configuration: d.configuration };
      const matches = entries.filter(a => a && sameIdentity(a.identity, identity));
      const valid = matches.length === 1 && ['available', 'unavailable', 'unknown', 'not-purchasable'].includes(matches[0]?.status);
      if (!valid) issue('availability');
      // A bad Product definition cannot authorize an increase, even with an explicit available record.
      availability.push({ identity, status: definition.status !== 'ready' || card.slug !== productKey || !valid ? 'unknown'
        : card.purchasePresentation === 'preorder' ? 'not-purchasable' : matches[0].status });
      if (!bundle || !Array.isArray(bundle.prices) || !bundle.prices.some((p: ConfigurationPrice) => p && sameIdentity(p.identity, identity))) issue('price-missing');
    }
    if (entries.some(a => !a || !validIdentity(a.identity) || a.identity.productKey !== productKey
      || !definition.definitions.some(d => sameIdentity(a.identity, { productKey, configuration: d.configuration })))) issue('availability');
    if (product.purchase.kind === 'fixed' && availability.filter(a => a.identity.productKey === productKey
      && a.identity.configuration.kind === 'fixed' && a.status === 'available').length !== 1) issue('fixed-purchase-unavailable');
    if (!card.image || !nonempty(card.image.src) || !Number.isSafeInteger(card.image.width) || card.image.width <= 0
      || !Number.isSafeInteger(card.image.height) || card.image.height <= 0
      || typeof card.image.alt !== 'string'
      || (card.country && (!nonempty(card.country.slug) || !nonempty(card.country.label)))
      || (card.kind === 'tea' && (!Array.isArray(card.moods) || card.moods.length < 1 || card.moods.length > 3
        || card.moods.some(m => !m || !nonempty(m.slug) || !nonempty(m.label) || !nonempty(m.icon)
          || !Number.isSafeInteger(m.iconWidth) || m.iconWidth <= 0 || !Number.isSafeInteger(m.iconHeight) || m.iconHeight <= 0)))) issue('presentation');
  }
  // All derived inputs are immutable; caller must construct/freeze snapshot before passing it here.
  return deepFreeze({ snapshot, products, bundles, availability, issues });
}
