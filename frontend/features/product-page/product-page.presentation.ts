import type { ProductPageModel } from './product-page.read-model';
import type { ProductInputViews } from '../product-input/product-input.types';
import { productInputCards } from '../product-input/product-input.presentation';
import { formatBasketMoney } from '../basket/basket-money';

/** Format an existing unit quote only. No price calculation or configuration state. */
export function productPagePrice(product: ProductPageModel) {
  const option = product.configurations.find(option => option.weightGrams === 50) ?? product.configurations[0];
  if (!option || option.quote.status !== 'ready') return undefined;
  return { current: formatBasketMoney(option.quote.currentUnit), label: option.label,
    ...(option.quote.showOriginal ? { original: formatBasketMoney(option.quote.originalUnit) } : {}) };
}
export function relatedProductCards(product: ProductPageModel, inputs: ProductInputViews) {
  const cards = productInputCards(inputs), result: typeof cards[number][] = [];
  for (const key of product.detail?.relatedProductKeys ?? []) {
    if (key === product.productKey || result.some(card => card.slug === key)) continue;
    const matches = cards.filter(card => card.slug === key);
    if (matches.length === 1) result.push(matches[0]);
  }
  return result;
}
