import type { CartItem } from './cart.types';
import type { CartWidgetItemData } from './CartWidget/CartWidget.types';
import type { ConfigurationAvailability } from '@/features/product/ProductCard/configuration-contract';

/** One canonical position maps to one presentation row, in canonical order.
 * Unavailable-price copy is supplied by the shell's explicit presentation policy.
 * No quote is calculated and no position is filtered out.
 */
export function toCartWidgetItems(items: readonly CartItem[], unavailablePriceLabel: string, availability: readonly ConfigurationAvailability[] = []): readonly CartWidgetItemData[] {
  return items.map(item => ({
    id: item.id,
    slug: item.presentation.slug,
    title: item.presentation.title,
    displayLinePrice: item.pricing.status === 'ready' ? item.pricing.displayLinePrice : unavailablePriceLabel,
    configurationLabel: item.presentation.configurationLabel,
    quantity: item.quantity,
    ...(item.configuration.kind === 'selectable' && availability.some(entry => entry.productKey === item.productKey
      && item.configuration.kind === 'selectable' && entry.configurationId === item.configuration.id && !entry.available) ? { unavailable: true } : {}),
  }));
}
