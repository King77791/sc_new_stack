import type { ProductCardData } from '../product/ProductCard/ProductCard.types';
import type { AvailabilityInput, CatalogBundle, Definition, PricingContext } from '../basket/basket-pricing.types';
import type { ProductDetailPresentation } from './product-input.detail';

type Metadata<T> = T extends ProductCardData ? Omit<T, 'price' | 'weight'> : never;
/** Local application contract; not a backend DTO, stock model, or Cart. */
export type ProductInput = Readonly<{
  productKey: string;
  presentation: Metadata<ProductCardData>;
  /** Optional display metadata; never a source of identity, commerce or State assignments. */
  detail?: ProductDetailPresentation;
  purchase: Readonly<{ kind: 'standard'; label: string; definitions: readonly Definition[] }>
    | Readonly<{ kind: 'fixed'; label?: string }>;
  availability: readonly AvailabilityInput[];
  commerce: CatalogBundle;
}>;
export type ProductInputSnapshot = Readonly<{
  snapshotId: string;
  provenance: 'demonstration-fixture';
  context: PricingContext;
  products: readonly ProductInput[];
}>;
export type ProductInputIssue = Readonly<{
  code: 'snapshot' | 'duplicate-product' | 'definition' | 'excluded-preorder' | 'policy'
    | 'money' | 'price-missing' | 'revision' | 'availability' | 'badge' | 'presentation' | 'fixed-purchase-unavailable';
  productKey?: string;
}>;
export type ProductInputViews = Readonly<{
  snapshot: ProductInputSnapshot;
  products: readonly ProductCardData[];
  bundles: readonly CatalogBundle[];
  availability: readonly AvailabilityInput[];
  issues: readonly ProductInputIssue[];
}>;
