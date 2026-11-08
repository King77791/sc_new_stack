import { productCardExamples } from '../product/ProductCard/product-card.fixtures';
import type { PricingContext } from '../basket/basket-pricing.types';
import type { ProductInput } from './product-input.types';
import { createProductInputSnapshot } from './product-input.snapshot';

const context: PricingContext = { source: 'fixture', catalogRevision: 'demo-catalog-9b1-v1', pricingRevision: 'demo-prices-9b1-v1' };
type NumericFixture = Readonly<{ active?: true; prices: Readonly<Record<string, readonly [number, number]>> }>;
/** Explicit demonstration O/C kopeks, NOT backend-confirmed commerce facts.
 * Reviewed inventory is documented in docs/product-input-integration.md.
 * IDs are existing opaque identities, never inferred from weight or display strings.
 */
const numeric: Readonly<Record<string, NumericFixture>> = {
  'tea-presentation': { prices: { 'tea-50': [103000, 103000], 'tea-100': [198000, 198000], 'tea-200': [380000, 380000], 'tea-250': [465000, 465000] } },
  'discount-tea-presentation': { active: true, prices: { 'discount-50': [85000, 64000], 'discount-100': [160000, 120000], 'discount-200': [304000, 228000], 'discount-250': [360000, 270000] } },
  'pressed-puer-presentation': { prices: { fixed: [150000, 150000] } },
  'teapot-pharaoh-presentation': { prices: { fixed: [930000, 930000] } },
  'long-title-tea-presentation': { prices: { 'long-50': [280000, 280000], 'long-100': [540000, 540000], 'long-200': [1030000, 1030000], 'long-250': [1260000, 1260000] } },
  'availability-tea-presentation': { prices: { 'availability-50': [103000, 103000], 'availability-100': [198000, 198000], 'availability-200': [380000, 380000], 'availability-250': [465000, 465000] } },
  'preorder-tea-presentation': { prices: { 'preorder-50': [160000, 160000] } },
};

const products: ProductInput[] = productCardExamples.map(({ data }) => {
  // Reuse ONLY non-price presentation metadata from the frozen legacy examples.
  const presentation = { kind: data.kind, slug: data.slug, title: data.title,
    image: data.slug === 'tea-presentation'
      ? { src: '/images/products/tea-presentation/main.webp', alt: 'Золотистые чайные листья, вид сверху', width: 500, height: 500 }
      : data.image,
    country: data.country, origin: data.origin, purchasePresentation: data.purchasePresentation,
    ...(data.kind === 'tea' ? { moods: data.moods } : {}) } as ProductInput['presentation'];
  const selectable = data.kind === 'tea' && data.weight.presentation === 'selectable' ? data.weight : undefined;
  const definitions = selectable ? selectable.configurations.map(o => ({
    configuration: { kind: 'selectable' as const, id: o.id }, label: o.label, weightGrams: o.weightGrams,
  })) : [{ configuration: { kind: 'fixed' as const }, ...(data.kind === 'tea' ? { label: data.weight.label } : {}) }];
  const productKey = data.slug, policyRevision = 'demo-policy-v1', fixture = numeric[productKey];
  // Owner-approved reference UI content only. Identity and all commerce inputs stay unchanged.
  const detail: ProductInput['detail'] = productKey === 'tea-presentation' ? {
    provenance: 'demonstration-fixture',
    gallery: [
      { src: '/images/products/tea-presentation/gallery-01.webp', alt: 'Чайные листья в стеклянной пиале, вид сверху', width: 755, height: 500 },
      { src: '/images/products/tea-presentation/gallery-02.webp', alt: 'Чайные листья на светлом фоне', width: 755, height: 500 },
      { src: '/images/products/tea-presentation/gallery-03.webp', alt: 'Чайные листья в стеклянной пиале, вид сбоку', width: 755, height: 500 },
      { src: '/images/products/tea-presentation/gallery-04.webp', alt: 'Чайные листья крупным планом', width: 755, height: 500 },
    ],
    characteristics: [{ key: 'harvest-year', label: 'Урожай:', value: '2021' }],
    catalogLinks: {
      region: { label: 'Юньнань', slug: 'yunnan' },
      category: { label: 'Пуэр', slug: 'puer' },
      tastes: [{ label: 'Дымный', slug: 'smoky' }, { label: 'Землистый', slug: 'earthy' }],
    },
    brewing: { preparingTime: '3–5 мин', temperature: '95–100 °C', amountPerBrewing: 'на 500 мл 5–7 г', infusionCount: '1 заваривание' },
    relatedProductKeys: ['discount-tea-presentation', 'pressed-puer-presentation', 'teapot-pharaoh-presentation', 'long-title-tea-presentation', 'availability-tea-presentation'],
  } : undefined;
  return { productKey, presentation, ...(detail ? { detail } : {}),
    purchase: selectable ? { kind: 'standard', label: selectable.label, definitions }
      : { kind: 'fixed', ...(data.kind === 'tea' ? { label: data.weight.label } : {}) },
    availability: definitions.map(d => ({ identity: { productKey, configuration: d.configuration },
      status: data.purchasePresentation === 'preorder' ? 'not-purchasable'
        : productKey === 'availability-tea-presentation' && d.configuration.kind === 'selectable'
          && ['availability-200', 'availability-250'].includes(d.configuration.id) ? 'unavailable' : 'available' })),
    commerce: { productKey, context, policy: { productKey, policyRevision, context, status: 'confirmed',
      ...(fixture.active ? { state: 'active', percentage: { status: 'confirmed', basisPoints: 2500,
        semantics: 'product-policy-rate', roundingRuleRef: 'explicit-demo-unit-prices-v1' } } : { state: 'none' }) },
      prices: definitions.flatMap(d => {
        const amounts = fixture.prices[d.configuration.kind === 'fixed' ? 'fixed' : d.configuration.id];
        return amounts ? [{ identity: { productKey, configuration: d.configuration },
          originalUnit: { currency: 'RUB' as const, minor: amounts[0] }, currentUnit: { currency: 'RUB' as const, minor: amounts[1] },
          priceRevision: 'demo-unit-v1', policyRevision, context, quantityRule: 'constant-unit-v1' as const, application: 'catalog-confirmed' as const }] : [];
      }) },
  };
});

/** One deeply immutable generation, including explicit invalid/non-purchasable preorder metadata. */
export const applicationProductSnapshot = createProductInputSnapshot({ snapshotId: 'demo-product-input-10b2b-v1',
  provenance: 'demonstration-fixture', context, products });
