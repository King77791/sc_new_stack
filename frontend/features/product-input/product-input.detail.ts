import { projectCatalogLinks, type ProductCatalogLinks } from './product-input.catalog';
/** Local presentation extension only, not a backend Product/BrewingGuide DTO. */
export type ProductDetailMedia = Readonly<{ src: string; alt: string; width: number; height: number }>;
export type ProductDetailPresentation = Readonly<{
  provenance: 'demonstration-fixture';
  gallery?: readonly ProductDetailMedia[];
  characteristics?: readonly Readonly<{ key: 'type' | 'tastes' | 'harvest-year' | 'material'; label: string; value: string }>[];
  brewing?: Readonly<{ preparingTime?: string; temperature?: string; amountPerBrewing?: string; infusionCount?: string }>;
  physical?: Readonly<{ fixedWeightGrams?: number; volumeMl?: number }>;
  relatedProductKeys?: readonly string[];
  catalogLinks?: ProductCatalogLinks;
}>;

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
const text = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const keys = (value: Record<string, unknown>, allowed: readonly string[]) => Object.keys(value).every(key => allowed.includes(key));
/** Only local static paths; no remote images or silently coerced dimensions. */
export function validDetailMedia(value: unknown): value is ProductDetailMedia {
  return record(value) && keys(value, ['src', 'alt', 'width', 'height'])
    && text(value.src) && /^\/images\/[a-zA-Z0-9/_-]+\.(png|jpe?g|webp|avif|svg)$/.test(value.src)
    && typeof value.alt === 'string' && Number.isSafeInteger(value.width) && Number(value.width) > 0
    && Number.isSafeInteger(value.height) && Number(value.height) > 0;
}

/** Reject invalid optional metadata independently of commercial validation. Never mutate input. */
export function projectProductDetail(value: unknown, productKey: string): Readonly<{
  detail?: ProductDetailPresentation; diagnostics: readonly string[];
}> {
  if (value === undefined) return { diagnostics: [] };
  const invalid = () => ({ diagnostics: ['invalid-detail'] });
  if (!record(value) || !keys(value, ['provenance', 'gallery', 'characteristics', 'brewing', 'physical', 'relatedProductKeys', 'catalogLinks'])
    || value.provenance !== 'demonstration-fixture') return invalid();
  if (value.gallery !== undefined && (!Array.isArray(value.gallery) || !value.gallery.every(validDetailMedia))) return invalid();
  if (value.characteristics !== undefined && (!Array.isArray(value.characteristics)
    || !value.characteristics.every(row => record(row) && keys(row, ['key', 'label', 'value'])
      && typeof row.key === 'string' && ['type', 'tastes', 'harvest-year', 'material'].includes(row.key) && text(row.label) && text(row.value))
    || new Set(value.characteristics.map(row => row.key)).size !== value.characteristics.length)) return invalid();
  if (value.brewing !== undefined && (!record(value.brewing)
    || !keys(value.brewing, ['preparingTime', 'temperature', 'amountPerBrewing', 'infusionCount'])
    || !Object.values(value.brewing).every(text))) return invalid();
  if (value.physical !== undefined && (!record(value.physical) || !keys(value.physical, ['fixedWeightGrams', 'volumeMl'])
    || !Object.values(value.physical).every(n => typeof n === 'number' && Number.isFinite(n) && n > 0))) return invalid();
  if (value.relatedProductKeys !== undefined && !Array.isArray(value.relatedProductKeys)) return invalid();
  const links = projectCatalogLinks(value.catalogLinks), diagnostics = [...links.diagnostics];
  const detail = structuredClone(value);
  delete detail.catalogLinks;
  if (links.links) detail.catalogLinks = links.links;
  if (Array.isArray(value.relatedProductKeys)) {
    const related: string[] = [];
    for (const key of value.relatedProductKeys) {
      if (!text(key) || key === productKey || related.includes(key)) diagnostics.push('invalid-related-reference');
      else related.push(key);
    }
    detail.relatedProductKeys = related;
  }
  return { detail: detail as ProductDetailPresentation, diagnostics };
}
