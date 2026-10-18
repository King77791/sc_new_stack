import type { ProductCardData } from '@/features/product/ProductCard/ProductCard.types';
import { productCardExamples } from '@/features/product/ProductCard/product-card.fixtures';

// Explicit backend-like order, reusing prepared regular ProductCard data unchanged.
// The future backend selects/ranks products and must exclude preorder products.
export const homeDailyTopProducts: readonly ProductCardData[] = [
  productCardExamples[0].data,
  productCardExamples[1].data,
  productCardExamples[3].data,
  productCardExamples[4].data,
];
