import { catalogCategories } from '@/lib/site-data';
import black from '@/public/images/categories/black.png';
import green from '@/public/images/categories/green.png';
import oolong from '@/public/images/categories/oolong.png';
import puer from '@/public/images/categories/puer.png';
import red from '@/public/images/categories/red.png';
import white from '@/public/images/categories/white.png';
import gifts from '@/public/images/categories/gifts.png';
import accessories from '@/public/images/categories/accessories.png';
import type { HomeCategory } from './CategoriesSection.types';

type CategorySlug = (typeof catalogCategories)[number]['slug'];

// Full Home imagery only; no fallback to Header graphics.
const categoryImages: Record<CategorySlug, HomeCategory['image']> = {
  black, green, oolong, puer, red, white, gifts, accessories,
};

// UI fixtures only: these are neither inventory nor production category totals.
const fixtureCounts: Record<CategorySlug, number> = {
  black: 21, green: 32, oolong: 15, puer: 11,
  red: 5, white: 2, gifts: 1, accessories: 24,
};

export const homeCategoryFixtures: readonly HomeCategory[] = catalogCategories.map(category => ({
  id: `fixture-category-${category.slug}`,
  title: category.label,
  slug: category.slug,
  image: categoryImages[category.slug],
  productCount: fixtureCounts[category.slug],
}));
