import type { CartIdentity, CartItem } from '../cart/cart.types';
import type { ProductCardData } from '../product/ProductCard/ProductCard.types';
import { normalizeConfigurations } from '../product/ProductCard/configuration-contract';
import type { Availability, AvailabilityInput, Definition, Diagnostic, ProductPresentation } from './basket-pricing.types';

export const nonempty = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
export function validIdentity(value: unknown): value is CartIdentity {
  if (!value || typeof value !== 'object') return false;
  const identity = value as CartIdentity;
  return nonempty(identity.productKey) && !!identity.configuration
    && (identity.configuration.kind === 'fixed' || (identity.configuration.kind === 'selectable' && nonempty(identity.configuration.id)));
}
export function sameIdentity(a: CartIdentity, b: CartIdentity): boolean {
  return validIdentity(a) && validIdentity(b) && a.productKey === b.productKey && a.configuration.kind === b.configuration.kind
    && (a.configuration.kind === 'fixed' || (b.configuration.kind === 'selectable' && a.configuration.id === b.configuration.id));
}
export function safeProductHref(slug: unknown): string | undefined {
  // Only one unencoded local slug segment; encodeURIComponent must never receive lone surrogates.
  if (!nonempty(slug) || slug !== slug.trim() || /[\s/\\%?#:\u0000-\u001f\u007f\ud800-\udfff]/u.test(slug)
    || slug === '.' || slug === '..') return undefined;
  return `/product/${encodeURIComponent(slug)}`;
}

export function adaptBasketProduct(productKey: string, items: readonly CartItem[], products: readonly ProductCardData[]): ProductPresentation {
  const matches = products.filter(p => p && p.slug === productKey);
  const fallback = items[0]?.presentation;
  const base = { productKey, title: fallback?.title ?? productKey, href: safeProductHref(fallback?.slug), definitions: [] };
  if (matches.length !== 1) return { ...base, status: matches.length ? 'ambiguous' : 'missing', diagnostics: [] };
  const product = matches[0];
  const diagnostics: Diagnostic[] = [];
  const href = safeProductHref(product.slug);
  if (!href) diagnostics.push({ code: 'navigation-unavailable', productKey });
  const img = product.image;
  const image = img && nonempty(img.src) && typeof img.alt === 'string' && Number.isSafeInteger(img.width)
    && img.width > 0 && Number.isSafeInteger(img.height) && img.height > 0 ? { ...img } : undefined;
  if (!image) diagnostics.push({ code: 'image-unavailable', productKey });
  let definitions: Definition[] = [], valid = nonempty(product.title) && !!href;
  if (product.kind === 'tea' && product.weight?.presentation === 'selectable') {
    const options = product.weight.configurations;
    if (!Array.isArray(options)) valid = false;
    else {
      // normalizeConfigurations is an existing throwing input validator, not an arbitrary resolver.
      try {
        definitions = normalizeConfigurations(options).map(o => ({ configuration: { kind: 'selectable', id: o.id }, label: o.label, weightGrams: o.weightGrams }));
      } catch {
        valid = false;
        diagnostics.push({ code: 'ordering-fallback', productKey });
      }
    }
  } else if ((product.kind === 'tea' && product.weight?.presentation === 'fixed') || product.kind === 'ceramics') {
    definitions = [{ configuration: { kind: 'fixed' }, label: product.kind === 'tea' ? product.weight.label : undefined }];
  } else valid = false;
  return { productKey, status: valid ? 'ready' : 'invalid', title: nonempty(product.title) ? product.title : base.title,
    href, image, definitions, diagnostics };
}

export function basketAvailability(identity: CartIdentity, products: readonly ProductCardData[], inputs: readonly AvailabilityInput[]): Availability {
  if (!validIdentity(identity)) return 'unknown';
  const matches = products.filter(p => p && p.slug === identity.productKey);
  if (matches.length !== 1) return 'unknown';
  const product = matches[0];
  if (product.purchasePresentation === 'preorder') return 'not-purchasable';
  if (product.purchasePresentation !== 'regular') return 'unknown';
  if (identity.configuration.kind === 'selectable' && product.kind === 'tea' && product.weight?.presentation === 'selectable') {
    if (!Array.isArray(product.weight.configurations)) return 'unknown';
    const option = product.weight.configurations.find(o => o && o.id === (identity.configuration.kind === 'selectable' ? identity.configuration.id : ''));
    if (!option || (option.disabled !== undefined && typeof option.disabled !== 'boolean')) return 'unknown';
    if (option.disabled) return 'unavailable';
  }
  const entries = inputs.filter(entry => validIdentity(entry.identity) && sameIdentity(entry.identity, identity));
  if (entries.length !== 1) return 'unknown';
  return ['available', 'unavailable', 'unknown', 'not-purchasable'].includes(entries[0].status) ? entries[0].status : 'unknown';
}
