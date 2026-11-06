import type { ProductCardData } from '@/features/product/ProductCard/ProductCard.types';
import { applicationProductInputs } from '@/features/product-input/product-input.application';

// Explicit presentation order; all prices come from the shared numeric generation.
// The future backend selects/ranks products and must exclude preorder products.
export const homeDailyTopProducts: readonly ProductCardData[] = [
  'tea-presentation', 'discount-tea-presentation', 'pressed-puer-presentation', 'teapot-pharaoh-presentation',
].flatMap(key => applicationProductInputs.cards.filter(product => product.slug === key));
