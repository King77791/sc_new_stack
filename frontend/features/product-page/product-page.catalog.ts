import { validCatalogReference, type CatalogReference } from '../product-input/product-input.catalog';

export type CatalogFamily = 'region' | 'category' | 'taste';
/** No corresponding App Router pages exist at this checkpoint. No aliases/redirects. */
export const implementedCatalogFamilies: readonly CatalogFamily[] = [];
export function catalogTarget(family: CatalogFamily, reference: CatalogReference, implemented = implementedCatalogFamilies) {
  if (!['region', 'category', 'taste'].includes(family) || !validCatalogReference(reference)) return undefined;
  const prefix = { region: '/catalog/region/', category: '/category/', taste: '/catalog/taste/' }[family];
  const target = `${prefix}${encodeURIComponent(reference.slug)}`;
  return { label: reference.label, target, ...(implemented.includes(family) ? { href: target } : {}) };
}
