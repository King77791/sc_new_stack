import type { CartItem } from '../cart/cart.types';
import { getCartItemId } from '../cart/cart.model';
import type { ProductCardData } from '../product/ProductCard/ProductCard.types';
import type { AvailabilityInput, CatalogBundle, PricingContext } from './basket-pricing.types';
import { rub } from './basket-money';

/** Synthetic QA only. No prices are read/parsed from legacy ProductCard or Cart fixtures. */
export const basketFixtureContext: PricingContext = { source: 'fixture', catalogRevision: 'qa-c1', pricingRevision: 'qa-p1' };

export function makeBasketFixture(productKey = 'basket-qa-tea', active = true, fixed = false): Readonly<{
  product: ProductCardData; bundle: CatalogBundle; availability: readonly AvailabilityInput[];
}> {
  const configurations = ([50, 100, 200, 250] as const).map((weightGrams, i) => ({
    id: `${productKey}-slot-${i}`, label: `${weightGrams} г.`, weightGrams, price: { current: 'QA presentation only' },
  }));
  const product: ProductCardData = { kind: 'tea', slug: productKey, title: 'Synthetic Basket Tea',
    image: { src: '/images/products/darjeeling-orange-valley.png', alt: 'QA tea', width: 500, height: 500 },
    moods: [{ slug: 'qa', label: 'QA', icon: '/icons/moods/energy.svg', iconWidth: 32, iconHeight: 32 }],
    weight: fixed ? { presentation: 'fixed', label: '357 г.' } : { presentation: 'selectable', label: '50 г.', configurations },
    purchasePresentation: 'regular', price: { current: 'QA presentation only' } };
  const identities = fixed ? [{ productKey, configuration: { kind: 'fixed' as const } }]
    : configurations.map(option => ({ productKey, configuration: { kind: 'selectable' as const, id: option.id } }));
  const originals = [100000, 180000, 320000, 400000], currents = [85000, 153000, 272000, 340000];
  const bundle: CatalogBundle = { productKey, context: basketFixtureContext,
    policy: { productKey, policyRevision: 'policy-1', context: basketFixtureContext, status: 'confirmed',
      ...(active ? { state: 'active' as const, percentage: { status: 'confirmed' as const, basisPoints: 1500,
        semantics: 'product-policy-rate' as const, roundingRuleRef: 'synthetic-unit-half-up-v1' } } : { state: 'none' as const }) },
    prices: identities.map((identity, i) => ({ identity, originalUnit: rub(originals[i]), currentUnit: rub(active ? currents[i] : originals[i]),
      priceRevision: `price-${i}-1`, policyRevision: 'policy-1', quantityRule: 'constant-unit-v1', application: 'catalog-confirmed', context: basketFixtureContext })) };
  return { product, bundle, availability: identities.map(identity => ({ identity, status: 'available' })) };
}

export function makeBasketCartItem(bundle: CatalogBundle, slot = 0, quantity = 1): CartItem {
  const identity = bundle.prices[slot].identity;
  return { ...identity, id: getCartItemId(identity), quantity,
    presentation: { title: 'Snapshot QA title', slug: bundle.productKey, configurationLabel: 'Snapshot label' },
    pricing: { status: 'unavailable' } };
}

export function makeBasketRoundingFixture() {
  const fixture = makeBasketFixture('basket-qa-rounding', true, true);
  return { ...fixture, bundle: { ...fixture.bundle, prices: fixture.bundle.prices.map(price => ({ ...price,
    originalUnit: rub(101), currentUnit: rub(86) })) } };
}
