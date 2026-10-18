import type { ProductCardData } from '@/features/product/ProductCard/ProductCard.types';
import { homeDailyTopProducts } from './daily-top.data';

export const singleDailyTopExample = homeDailyTopProducts.slice(0, 1);

/** Dev-only distinct identities to verify truncation, not additional published products. */
export const oversizedDailyTopExample: readonly ProductCardData[] = Array.from({ length: 9 }, (_, index) => ({
  ...homeDailyTopProducts[index % homeDailyTopProducts.length],
  slug: `daily-top-limit-${index + 1}`,
  title: `Товар ${index + 1}: ${homeDailyTopProducts[index % homeDailyTopProducts.length].title}`,
}));
