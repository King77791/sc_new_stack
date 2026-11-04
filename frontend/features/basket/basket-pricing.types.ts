import type { CartIdentity, CartItem, ConfigurationKey } from '../cart/cart.types';

/** Basket-local inputs, not backend DTOs or a second Cart. */
export type Money = Readonly<{ currency: 'RUB'; minor: number }>;
export type PricingContext = Readonly<{
  source: 'fixture' | 'backend'; catalogRevision: string; pricingRevision: string;
}>;
export type PercentageMetadata = Readonly<{
  status: 'confirmed'; basisPoints: number; semantics: 'product-policy-rate'; roundingRuleRef: string;
}> | Readonly<{ status: 'unavailable' | 'invalid' }>;
export type ProductDiscountPolicy = Readonly<{
  productKey: string; policyRevision: string; context: PricingContext;
}> & (Readonly<{ status: 'confirmed'; state: 'none' }>
  | Readonly<{ status: 'confirmed'; state: 'active'; percentage?: PercentageMetadata }>
  | Readonly<{ status: 'unavailable' | 'invalid' }>);
export type ConfigurationPrice = Readonly<{
  identity: CartIdentity; originalUnit: Money; currentUnit: Money;
  priceRevision: string; policyRevision: string; quantityRule: 'constant-unit-v1';
  application: 'catalog-confirmed'; context: PricingContext;
}>;
export type CatalogBundle = Readonly<{
  productKey: string; context: PricingContext; policy?: ProductDiscountPolicy;
  prices: readonly ConfigurationPrice[];
}>;
export type Availability = 'available' | 'unavailable' | 'unknown' | 'not-purchasable';
export type AvailabilityInput = Readonly<{ identity: CartIdentity; status: Availability }>;
export type Definition = Readonly<{
  configuration: ConfigurationKey; label?: string; weightGrams?: number;
}>;
export type ProductPresentation = Readonly<{
  productKey: string; status: 'ready' | 'missing' | 'ambiguous' | 'invalid';
  title: string; href?: string;
  image?: Readonly<{ src: string; alt: string; width: number; height: number }>;
  definitions: readonly Definition[]; diagnostics: readonly Diagnostic[];
}>;
export type IssueCode = 'unavailable' | 'invalid-pricing-data' | 'stale'
  | 'incompatible-currency' | 'aggregation-overflow';
export type PricingIssue = Readonly<{
  code: IssueCode; scope: 'line' | 'group' | 'basket'; reason: string;
  productKey?: string; itemId?: string;
}>;
export type Diagnostic = Readonly<{
  code: 'badge-unavailable' | 'badge-invalid' | 'ordering-fallback' | 'navigation-unavailable' | 'image-unavailable';
  productKey: string;
}>;
export type QuoteBinding = Readonly<{
  itemId: string; identity: CartIdentity; quantity: number;
  policyRevision: string; priceRevision: string; context: PricingContext;
}>;
export type ReadyLineQuote = Readonly<{
  status: 'ready'; binding: QuoteBinding; originalUnit: Money; currentUnit: Money;
  originalLine: Money; currentLine: Money; lineSavings: Money; showOriginal: boolean;
}>;
export type LineQuote = ReadyLineQuote | Readonly<{ status: IssueCode; issue: PricingIssue }>;
export type Coverage = 'complete' | 'partially-unavailable' | 'unavailable';
export type PricingTotals = Readonly<{ referenceSubtotal: Money; currentSubtotal: Money; discountAmount: Money }>;
export type BasketLine = Readonly<{
  item: CartItem; definition?: Definition; quote: LineQuote; availability: Availability;
  canIncrease: boolean; canTransfer: boolean; canDecrease: boolean; canRemove: true;
}>;
export type ProductGroup = Readonly<{
  productKey: string; product: ProductPresentation; lines: readonly BasketLine[];
  coverage: Coverage; issues: readonly PricingIssue[]; diagnostics: readonly Diagnostic[];
  badge?: Readonly<{ basisPoints: number }>; totals?: PricingTotals; showSavings: boolean;
}>;
export type BasketProjection = Readonly<{
  groups: readonly ProductGroup[]; coverage: Coverage; issues: readonly PricingIssue[];
  totals?: PricingTotals; itemCount: number; totalQuantity?: number; productGroupCount: number;
  authority: 'fixture' | 'backend' | 'unknown';
}>;
