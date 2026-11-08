import { safeProductHref } from '../basket/basket-product.adapter';

export type CatalogReference = Readonly<{ label: string; slug: string }>;
export type ProductCatalogLinks = Readonly<{
  /** Explicit editorial mapping; Country/Origin never imply a Region target. */
  region?: CatalogReference;
  category?: CatalogReference;
  tastes?: readonly CatalogReference[];
}>;
export function validCatalogReference(value: unknown): value is CatalogReference {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const ref = value as Record<string, unknown>;
  return Object.keys(ref).every(key => key === 'label' || key === 'slug')
    && typeof ref.label === 'string' && ref.label.trim().length > 0
    && typeof ref.slug === 'string' && Boolean(safeProductHref(ref.slug));
}
export function projectCatalogLinks(value: unknown): Readonly<{ links?: ProductCatalogLinks; diagnostics: readonly string[] }> {
  if (value === undefined) return { diagnostics: [] };
  if (!value || typeof value !== 'object' || Array.isArray(value)
    || Object.keys(value).some(key => !['region', 'category', 'tastes'].includes(key))) return { diagnostics: ['invalid-catalog-links'] };
  const raw = value as Record<string, unknown>, links: { region?: CatalogReference; category?: CatalogReference; tastes?: CatalogReference[] } = {};
  const diagnostics: string[] = [];
  for (const key of ['region', 'category'] as const) {
    if (raw[key] === undefined) continue;
    if (validCatalogReference(raw[key])) links[key] = { ...raw[key] };
    else diagnostics.push(`invalid-catalog-${key}`);
  }
  if (raw.tastes !== undefined) {
    const tastes: CatalogReference[] = [];
    if (!Array.isArray(raw.tastes)) diagnostics.push('invalid-catalog-tastes');
    else for (const ref of raw.tastes) {
      if (!validCatalogReference(ref) || tastes.some(taste => taste.slug === ref.slug)) diagnostics.push('invalid-catalog-taste');
      else tastes.push({ ...ref });
    }
    links.tastes = tastes;
  }
  return { links, diagnostics };
}
