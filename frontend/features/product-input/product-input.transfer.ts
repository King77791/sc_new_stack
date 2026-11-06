import type { ResolveTransferTarget } from '../cart/cart.types';
import { resolveProductTransferTarget } from '../cart/cart-transfer-product.adapter';
import { basketAvailability } from '../basket/basket-product.adapter';
import type { ProductInputViews } from './product-input.types';

/** Preserve the existing F1 validator, including fixed-target rejection. */
export function productInputTransferTarget(inputs: ProductInputViews): ResolveTransferTarget {
  return target => {
    if (inputs.issues.some(i => i.code === 'snapshot' || (i.productKey === target.productKey
      && ['definition', 'duplicate-product', 'excluded-preorder'].includes(i.code)))) return { ok: false, reason: 'validation-unavailable' };
    const result = resolveProductTransferTarget(inputs.products, target);
    if (!result.ok) return result;
    const state = basketAvailability(target, inputs.products, inputs.availability);
    if (state === 'unknown') return { ok: false, reason: 'validation-unavailable' };
    return { ...result, available: state === 'available' };
  };
}
