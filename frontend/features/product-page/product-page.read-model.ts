import type { Availability, Definition, LineQuote, PricingContext } from '../basket/basket-pricing.types';
import { adaptBasketProduct, basketAvailability, safeProductHref } from '../basket/basket-product.adapter';
import { resolveBasketLineQuote } from '../basket/basket-pricing.quote';
import { getCartItemId } from '../cart/cart.model';
import { deepFreeze } from '../product-input/product-input.snapshot';
import { projectProductDetail, validDetailMedia, type ProductDetailMedia, type ProductDetailPresentation } from '../product-input/product-input.detail';
import type { ProductInputViews } from '../product-input/product-input.types';

export type ProductPageConfiguration = Definition & Readonly<{
  availability: Availability;
  quote: LineQuote;
  discountStatus: 'active' | 'none' | 'unavailable';
  canAdd: boolean;
}>;
export type ProductPageModel = Readonly<{
  productKey: string; slug: string; title: string; kind: 'tea' | 'ceramics';
  generation: Readonly<{ snapshotId: string; provenance: 'demonstration-fixture'; context: PricingContext }>;
  image?: ProductDetailMedia;
  countryBackground?: string;
  countryIllustration?: string;
  detail?: ProductDetailPresentation;
  country?: Readonly<{ slug: string; label: string }>;
  origin?: Readonly<{ label: string }>;
  configurations: readonly ProductPageConfiguration[];
  availability: Availability | 'mixed';
  /** No approved Product × State source exists in this generation. Fixture moods are not promoted. */
  states: readonly never[];
  statesStatus: 'approved-source-unavailable';
  diagnostics: readonly string[];
}>;
export type ProductPageLookup = Readonly<{ status: 'not-found' | 'invalid-identity' | 'ambiguous' | 'input-unavailable' }>
  | Readonly<{ status: 'found'; product: ProductPageModel }>;

/** A stateless consumer of the shared generation, never the filtered Card list or a Cart store. */
export function lookupProductPage(inputs: ProductInputViews, slug: string): ProductPageLookup {
  if (!safeProductHref(slug)) return { status: 'not-found' };
  const snapshot = inputs?.snapshot;
  if (!snapshot || !Array.isArray(snapshot.products) || inputs.issues.some(issue => issue.code === 'snapshot')) return { status: 'input-unavailable' };
  const matches = snapshot.products.filter(product => product?.presentation?.slug === slug);
  if (!matches.length) return { status: 'not-found' };
  if (matches.length !== 1) return { status: 'ambiguous' };
  const raw = matches[0], metadata = raw.presentation;
  if (raw.productKey !== slug || snapshot.products.filter(product => product?.productKey === raw.productKey).length !== 1)
    return { status: 'invalid-identity' };
  if (typeof metadata.title !== 'string' || !metadata.title.trim() || !['tea', 'ceramics'].includes(metadata.kind)) return { status: 'invalid-identity' };
  const definition = adaptBasketProduct(raw.productKey, [], inputs.products);
  const diagnostics = inputs.issues.filter(issue => !issue.productKey || issue.productKey === raw.productKey).map(issue => issue.code as string);
  const detail = projectProductDetail(raw.detail, raw.productKey);
  diagnostics.push(...detail.diagnostics);
  const bundles = inputs.bundles.filter(bundle => bundle?.productKey === raw.productKey);
  const excluded = metadata.purchasePresentation !== 'regular';
  const configurations = definition.definitions.map(option => {
    const identity = { productKey: raw.productKey, configuration: option.configuration };
    // Q=1 is a quote request to the existing engine, not a canonical CartItem or mutation.
    const item = { ...identity, id: getCartItemId(identity), quantity: 1,
      presentation: { slug, title: metadata.title }, pricing: { status: 'unavailable' as const } };
    const quote: LineQuote = excluded
      ? { status: 'unavailable', issue: { code: 'unavailable', scope: 'line', productKey: raw.productKey, reason: 'Product excluded from purchase integration' } }
      : resolveBasketLineQuote(item, definition, bundles.length === 1 ? bundles[0] : undefined, snapshot.context);
    const availability = basketAvailability(identity, inputs.products, inputs.availability);
    const invalid = diagnostics.some(code => ['definition', 'duplicate-product', 'presentation'].includes(code));
    const discountStatus = quote.status === 'ready' ? quote.showOriginal ? 'active' as const : 'none' as const : 'unavailable' as const;
    return { ...option, availability, quote, discountStatus, canAdd: definition.status === 'ready' && !invalid && availability === 'available' && quote.status === 'ready' };
  });
  const statuses = new Set(configurations.map(option => option.availability));
  const availability = excluded ? 'not-purchasable' : statuses.size === 1 ? configurations[0].availability : statuses.size > 1 ? 'mixed' : 'unknown';
  return deepFreeze(structuredClone({ status: 'found' as const, product: {
    productKey: raw.productKey, slug, title: metadata.title, kind: metadata.kind,
    generation: { snapshotId: snapshot.snapshotId, provenance: snapshot.provenance, context: { ...snapshot.context } },
    ...(validDetailMedia(metadata.image) ? { image: { ...metadata.image } } : {}),
    ...(metadata.country?.background && /^\/images\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp|avif)$/.test(metadata.country.background)
      ? { countryBackground: metadata.country.background } : {}),
    ...(metadata.country?.illustration && /^\/icons\/regions\/[a-zA-Z0-9_-]+\.svg$/.test(metadata.country.illustration)
      ? { countryIllustration: metadata.country.illustration } : {}),
    ...(metadata.country && typeof metadata.country.label === 'string' && typeof metadata.country.slug === 'string'
      ? { country: { label: metadata.country.label, slug: metadata.country.slug } } : {}),
    ...(metadata.origin && typeof metadata.origin.label === 'string' ? { origin: { label: metadata.origin.label } } : {}),
    ...(detail.detail ? { detail: detail.detail } : {}),
    configurations, availability, states: [], statesStatus: 'approved-source-unavailable', diagnostics,
  } }));
}
