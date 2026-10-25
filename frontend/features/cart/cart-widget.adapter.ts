import type { CartItem } from './cart.types';
import type { CartWidgetItemData } from './CartWidget/CartWidget.types';

/** One canonical position maps to one presentation row, in canonical order.
 * Unavailable-price copy is supplied by the shell's explicit presentation policy.
 * No quote is calculated and no position is filtered out.
 */
export function toCartWidgetItems(items: readonly CartItem[], unavailablePriceLabel: string): readonly CartWidgetItemData[] {
  return items.map(item => ({
    id: item.id,
    slug: item.presentation.slug,
    title: item.presentation.title,
    displayLinePrice: item.pricing.status === 'ready' ? item.pricing.displayLinePrice : unavailablePriceLabel,
    configurationLabel: item.presentation.configurationLabel,
    quantity: item.quantity,
  }));
}
