import type { ProductCardConfiguration, ProductCardData } from './ProductCard.types';

export const TEA_WEIGHTS = [50, 100, 200, 250] as const;
export type TeaWeight = typeof TEA_WEIGHTS[number];
export type CanonicalConfigurations = readonly [ProductCardConfiguration, ProductCardConfiguration, ProductCardConfiguration, ProductCardConfiguration];

/** Presentation input validation, not a backend DTO. Order is normalized from explicit metadata. */
export function normalizeConfigurations(input: readonly ProductCardConfiguration[]): CanonicalConfigurations {
  const ids = new Set<string>(), weights = new Set<number>();
  if (input.length !== TEA_WEIGHTS.length) throw new Error('Expected four canonical tea configurations');
  for (const option of input) {
    if (!option.id.trim() || ids.has(option.id) || weights.has(option.weightGrams)
      || !TEA_WEIGHTS.includes(option.weightGrams) || option.label !== `${option.weightGrams} г.`) {
      throw new Error('Invalid canonical tea configuration identity, weight or label');
    }
    ids.add(option.id); weights.add(option.weightGrams);
  }
  const sorted = [...input].sort((a,b) => a.weightGrams - b.weightGrams);
  return [sorted[0], sorted[1], sorted[2], sorted[3]];
}

/** disabled is a legacy presentation flag: it prohibits ADD/increase, not inspection or reduction. */
export function canRequestQuantity(option: ProductCardConfiguration, actual: number, requested: number) {
  return !option.disabled || requested <= actual;
}

export type ConfigurationAvailability = Readonly<{
  productKey: string;
  configurationId: string;
  available: boolean;
}>;

/** Explicit product-input snapshot for consumers; never read availability from Cart presentation. */
export function configurationAvailability(products: readonly ProductCardData[]): readonly ConfigurationAvailability[] {
  return products.flatMap(product => product.kind === 'tea' && product.purchasePresentation !== 'preorder' && product.weight.presentation === 'selectable'
    ? normalizeConfigurations(product.weight.configurations).map(option => ({
      productKey: product.slug, configurationId: option.id, available: !option.disabled,
    })) : []);
}
