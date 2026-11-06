import type { ProductCardData } from '../product/ProductCard/ProductCard.types';
import type { ProductInput } from './product-input.types';

/** Membership-only input for Gate 8B. This unavailable label is never parsed as money. */
export function productDefinitionCard(product: ProductInput): ProductCardData | undefined {
  if (!product?.presentation || !product.purchase) return undefined;
  const metadata = product.presentation, purchase = product.purchase;
  const price = { current: 'Цена недоступна' };
  if (metadata.kind === 'ceramics') return purchase.kind === 'fixed' ? { ...metadata, price } : undefined;
  if (metadata.kind !== 'tea') return undefined;
  if (purchase.kind === 'fixed') return { ...metadata, price, weight: { presentation: 'fixed', label: purchase.label ?? '' } };
  if (purchase.kind !== 'standard' || !Array.isArray(purchase.definitions)) return undefined;
  return { ...metadata, price, weight: { presentation: 'selectable', label: purchase.label,
    configurations: purchase.definitions.map(d => ({
      id: d?.configuration?.kind === 'selectable' ? d.configuration.id : '',
      label: d?.label ?? '', weightGrams: d?.weightGrams as 50 | 100 | 200 | 250, price,
      // Availability is a separate input. Do not turn unknown into confirmed unavailable here.
    })) } };
}
