import type { CartItem } from '../cart/cart.types';
import { projectBasketPricing } from '../basket/basket-pricing.projection';
import type { ProductInputViews } from './product-input.types';

/** Read-only integration API for future BasketFeature. No store, commands, Checkout or fetching. */
export function projectProductInputBasket(items: readonly CartItem[], inputs: ProductInputViews) {
  return projectBasketPricing(items, inputs.products, inputs.bundles, inputs.snapshot?.context, inputs.availability);
}
