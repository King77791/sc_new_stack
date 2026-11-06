import type { ProductCardData, ProductCardPrice } from '../product/ProductCard/ProductCard.types';
import type { CartItem, ConfigurationKey } from '../cart/cart.types';
import { getCartItemId } from '../cart/cart.model';
import { adaptBasketProduct, basketAvailability } from '../basket/basket-product.adapter';
import { projectProductBadge, resolveBasketLineQuote } from '../basket/basket-pricing.quote';
import { formatBasketMoney } from '../basket/basket-money';
import type { ProductInputViews } from './product-input.types';
import { deepFreeze } from './product-input.snapshot';

export function productInputCards(inputs: ProductInputViews): readonly ProductCardData[] {
  const result: ProductCardData[] = [];
  for (const card of inputs.products) {
    if (inputs.issues.some(i => (!i.productKey || i.productKey === card.slug) && i.code !== 'badge')) continue;
    const definition = adaptBasketProduct(card.slug, [], inputs.products);
    const bundle = inputs.bundles.find(b => b.productKey === card.slug);
    const priceFor = (configuration: ConfigurationKey): ProductCardPrice | undefined => {
      const identity = { productKey: card.slug, configuration };
      const item: CartItem = { ...identity, id: getCartItemId(identity), quantity: 1,
        presentation: { slug: card.slug, title: card.title }, pricing: { status: 'unavailable' } };
      const quote = resolveBasketLineQuote(item, definition, bundle, inputs.snapshot.context);
      if (quote.status !== 'ready') return undefined;
      const badge = projectProductBadge(bundle?.policy).badge;
      return { current: formatBasketMoney(quote.currentUnit), ...(quote.showOriginal ? {
        discount: { original: formatBasketMoney(quote.originalUnit), label: badge ? `−${badge.basisPoints / 100}%` : '' },
      } : {}) };
    };
    if (card.kind === 'tea' && card.weight.presentation === 'selectable') {
      const configurations = card.weight.configurations.map(option => ({ ...option,
        price: priceFor({ kind: 'selectable', id: option.id })!,
        disabled: basketAvailability({ productKey: card.slug, configuration: { kind: 'selectable', id: option.id } }, inputs.products, inputs.availability) !== 'available',
      })).sort((a, b) => a.weightGrams - b.weightGrams);
      if (configurations.some(o => !o.price)) continue;
      result.push({ ...card, price: configurations[0].price, weight: { ...card.weight, configurations } });
    } else {
      // Frozen fixed Card has no disabled purchase prop; exclude non-purchasable fixed inputs explicitly.
      const identity = { productKey: card.slug, configuration: { kind: 'fixed' as const } };
      const price = priceFor(identity.configuration);
      if (price && basketAvailability(identity, inputs.products, inputs.availability) === 'available') result.push({ ...card, price });
    }
  }
  return deepFreeze(result);
}
