import type { ProductCardData } from '@/features/product/ProductCard/ProductCard.types';
import { normalizeConfigurations } from '@/features/product/ProductCard/configuration-contract';
import type { CartIdentity, ResolveTransferTarget } from './cart.types';

/** Pure frontend Product-input adapter. The caller supplies the current snapshot on each execution. */
export function resolveProductTransferTarget(products: readonly ProductCardData[], target: CartIdentity): ReturnType<ResolveTransferTarget> {
  try {
    const matches = products.filter(product => product.slug === target.productKey);
    if (matches.length !== 1) return { ok: false, reason: 'validation-unavailable' };
    const product = matches[0];
    if (product.kind !== 'tea' || product.purchasePresentation === 'preorder'
      || product.weight.presentation !== 'selectable' || target.configuration.kind !== 'selectable') {
      return { ok: false, reason: 'invalid-identity' };
    }
    if (typeof product.title !== 'string' || !product.title.trim()) return { ok: false, reason: 'validation-unavailable' };
    const configurationId = target.configuration.id;
    const option = normalizeConfigurations(product.weight.configurations).find(option => option.id === configurationId);
    if (!option) return { ok: false, reason: 'invalid-identity' };
    if (option.disabled !== undefined && typeof option.disabled !== 'boolean') return { ok: false, reason: 'validation-unavailable' };
    return { ok: true, identity: { productKey: product.slug, configuration: { kind: 'selectable', id: option.id } },
      available: !option.disabled, presentation: { slug: product.slug, title: product.title, configurationLabel: option.label } };
  } catch {
    return { ok: false, reason: 'validation-unavailable' };
  }
}
