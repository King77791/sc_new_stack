import type { ResolveCartPricing } from './cart.types';

/** Existing frontend-only QA quotes, not production commerce prices or pricing rules.
 * Unknown quantities/configurations intentionally have no quote. Replace with
 * backend-confirmed pricing when the API contract is supplied.
 */
export const resolveCartFixturePricing: ResolveCartPricing = item => {
  if (item.productKey === 'tea-presentation' && item.configuration.kind === 'selectable') {
    if (item.configuration.id === 'tea-50') {
      if (item.quantity === 1) return { status: 'ready', displayLinePrice: '1 030 ₽' };
      if (item.quantity === 2) return { status: 'ready', displayLinePrice: '2 060 ₽' };
    }
    if (item.configuration.id === 'tea-100' && item.quantity === 1) {
      return { status: 'ready', displayLinePrice: '1 980 ₽' };
    }
  }
  if (item.configuration.kind === 'fixed' && item.quantity === 1) {
    if (item.productKey === 'pressed-puer-presentation') return { status: 'ready', displayLinePrice: '1 500 ₽' };
    if (item.productKey === 'teapot-pharaoh-presentation') return { status: 'ready', displayLinePrice: '9 300 ₽' };
  }
  return { status: 'unavailable' };
};
