import type { ConfigurationAvailability } from '../product/ProductCard/configuration-contract';
import { basketAvailability } from '../basket/basket-product.adapter';
import type { AvailabilityInput } from '../basket/basket-pricing.types';
import type { ProductInputViews } from './product-input.types';
import { deepFreeze } from './product-input.snapshot';

/** Compatibility fields let the frozen container pass canonical fixed identities as structural props.
 * Empty configurationId for fixed is not an identity; canonical identity remains {kind:'fixed'}.
 */
export type ProductWidgetAvailability = ConfigurationAvailability & AvailabilityInput;
export function productInputWidgetAvailability(inputs: ProductInputViews): readonly ProductWidgetAvailability[] {
  return deepFreeze(inputs.availability.map(entry => {
    const status = basketAvailability(entry.identity, inputs.products, inputs.availability);
    return { ...entry, status, productKey: entry.identity.productKey,
      configurationId: entry.identity.configuration.kind === 'selectable' ? entry.identity.configuration.id : '',
      available: status === 'available' };
  }));
}
