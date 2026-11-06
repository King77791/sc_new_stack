import type { ResolveCartPricing } from '../cart/cart.types';
import { formatBasketMoney } from '../basket/basket-money';
import { adaptBasketProduct } from '../basket/basket-product.adapter';
import { resolveBasketLineQuote } from '../basket/basket-pricing.quote';
import type { ProductInputViews } from './product-input.types';

/** The existing Gate 8B engine prepares the entire canonical line, with checked BigInt arithmetic. */
export function productInputCartPricing(inputs: ProductInputViews): ResolveCartPricing {
  return item => {
    if (inputs.issues.some(i => i.code === 'snapshot' || (i.productKey === item.productKey && i.code === 'excluded-preorder'))) return { status: 'unavailable' };
    const canonical = { ...item, pricing: { status: 'unavailable' as const } };
    const matches = inputs.bundles.filter(b => b.productKey === item.productKey);
    const quote = resolveBasketLineQuote(canonical, adaptBasketProduct(item.productKey, [canonical], inputs.products),
      matches.length === 1 ? matches[0] : undefined, inputs.snapshot.context);
    return quote.status === 'ready' ? { status: 'ready', displayLinePrice: formatBasketMoney(quote.currentLine) } : { status: 'unavailable' };
  };
}
