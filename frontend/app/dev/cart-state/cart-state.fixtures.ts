import { productCardExamples } from '@/features/product/ProductCard/product-card.fixtures';
import type { AddItemInput } from '@/features/cart/cart.types';
export { resolveCartFixturePricing as resolveDevPricing } from '@/features/cart/cart-pricing.fixtures';

// Existing presentation slugs/configuration IDs are temporary frontend identities.
const tea = productCardExamples[0].data;
const pressed = productCardExamples[3].data;
const ceramics = productCardExamples[4].data;
const configurations = tea.kind === 'tea' && tea.weight.presentation === 'selectable' ? tea.weight.configurations : [];

export const cartExamples: readonly Readonly<{ label: string; input: AddItemInput }>[] = [
  ...configurations.map(configuration => ({
    label: `Да Хун Пао / ${configuration.label}`,
    input: {
      productKey: tea.slug,
      configuration: { kind: 'selectable' as const, id: configuration.id },
      quantity: 1,
      presentation: { slug: tea.slug, title: 'Да Хун Пао', configurationLabel: configuration.label },
    },
  })),
  {
    label: 'Шу Пуэр / fixed',
    input: { productKey: pressed.slug, configuration: { kind: 'fixed' }, quantity: 1,
      presentation: { slug: pressed.slug, title: pressed.title, configurationLabel: pressed.kind === 'tea' ? pressed.weight.label : undefined } },
  },
  {
    label: 'Чайник / fixed',
    input: { productKey: ceramics.slug, configuration: { kind: 'fixed' }, quantity: 1,
      presentation: { slug: ceramics.slug, title: ceramics.title } },
  },
];

