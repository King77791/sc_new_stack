import { catalogCategories } from '@/lib/site-data';
export { mainNavigationItems } from '@/lib/site-data';

// Header presentation props, not domain entities or backend DTOs.
export type CatalogItem = { title: string; slug: string };
export type HeaderCategory = {
  label: string;
  slug: string;
  image: string;
  accessories?: boolean;
  items: readonly CatalogItem[];
};
export type HeaderPanel = 'catalog' | 'mobile' | 'search' | null;

export const favoritesNavigation = {
  href: '/favorites', label: 'Избранное', icon: '/icons/favorite_ic.svg',
} as const;

// Explicit UI prototype slugs; neither URLs nor grouping claim production data.
const temporaryTeaItems: readonly CatalogItem[] = [
  { title: 'Цзинь Ло', slug: 'demo-jin-luo' },
  { title: 'Цзинь Цзунь Мэй', slug: 'demo-jin-zun-mei' },
  { title: 'Дянь Хун', slug: 'demo-dian-hong' },
  { title: 'Цзинь Хао Дянь Хун', slug: 'demo-jin-hao-dian-hong' },
  { title: 'Тань Ян Гун Фу', slug: 'demo-tan-yang-gong-fu' },
];

// Category slugs are temporary route segments pending approved navigation data.
export const headerCategories: readonly HeaderCategory[] = [
  { ...catalogCategories[0], image: '/images/black_tea_image.png', items: temporaryTeaItems },
  { ...catalogCategories[1], image: '/images/green_tea_image.png', items: [] },
  { ...catalogCategories[2], image: '/images/oolung_tea_image.png', items: [
    { title: 'Габа Улун из Дун Дин: Гармония гор', slug: 'demo-gaba-dong-ding' },
  ] },
  { ...catalogCategories[3], image: '/images/puer_tea_image.png', items: [] },
  { ...catalogCategories[4], image: '/images/red_tea_image.png', items: [] },
  { ...catalogCategories[5], image: '/images/white_tea_image.png', items: [] },
  { ...catalogCategories[6], image: '/images/gift_set_image.png', items: [] },
  { ...catalogCategories[7], image: '/images/accessories_image.png', accessories: true, items: [] },
];
