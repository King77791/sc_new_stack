import type { CartItem } from './cart.types';
import type { CartWidgetItemData } from './CartWidget/CartWidget.types';
import type { ConfigurationAvailability } from '@/features/product/ProductCard/configuration-contract';
import type { AvailabilityInput } from '../basket/basket-pricing.types';

function isUnavailable(item: CartItem, entries?: readonly ConfigurationAvailability[]) {
  if (!entries) return false; // Legacy isolated presentation callers without availability.
  if (!entries.length) return true; // Explicit empty current input cannot confirm availability.
  const canonical = entries.filter((entry): entry is ConfigurationAvailability & AvailabilityInput => 'identity' in entry);
  if (canonical.length) {
    const matches = canonical.filter(entry => entry.identity.productKey === item.productKey
      && entry.identity.configuration.kind === item.configuration.kind
      && (item.configuration.kind === 'fixed' || (entry.identity.configuration.kind === 'selectable' && entry.identity.configuration.id === item.configuration.id)));
    return matches.length !== 1 || matches[0].status !== 'available';
  }
  return item.configuration.kind === 'selectable' && entries.some(entry => entry.productKey === item.productKey
    && item.configuration.kind === 'selectable' && entry.configurationId === item.configuration.id && !entry.available);
}

/** One canonical position maps to one presentation row, in canonical order.
 * Unavailable-price copy is supplied by the shell's explicit presentation policy.
 * No quote is calculated and no position is filtered out.
 */
export function toCartWidgetItems(items: readonly CartItem[], unavailablePriceLabel: string, availability?: readonly ConfigurationAvailability[]): readonly CartWidgetItemData[] {
  return items.map(item => ({
    id: item.id,
    slug: item.presentation.slug,
    title: item.presentation.title,
    displayLinePrice: item.pricing.status === 'ready' ? item.pricing.displayLinePrice : unavailablePriceLabel,
    configurationLabel: item.presentation.configurationLabel,
    quantity: item.quantity,
    ...(isUnavailable(item, availability) ? { unavailable: true } : {}),
  }));
}
