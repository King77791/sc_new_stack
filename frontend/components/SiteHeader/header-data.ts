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

export const mainNavigationItems = [
  { label: 'Каталог', href: '/catalog' },
  { label: 'Доставка и оплата', href: '/delivery-payment' },
  { label: 'События', href: '/events' },
  { label: 'Контакты', href: '/contacts' },
] as const;

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
  { label: 'Черный', slug: 'black', image: '/images/black_tea_image.png', items: temporaryTeaItems },
  { label: 'Зеленый', slug: 'green', image: '/images/green_tea_image.png', items: [] },
  { label: 'Улун', slug: 'oolong', image: '/images/oolung_tea_image.png', items: [
    { title: 'Габа Улун из Дун Дин: Гармония гор', slug: 'demo-gaba-dong-ding' },
  ] },
  { label: 'Пуэр', slug: 'puer', image: '/images/puer_tea_image.png', items: [] },
  { label: 'Красный', slug: 'red', image: '/images/red_tea_image.png', items: [] },
  { label: 'Белый', slug: 'white', image: '/images/white_tea_image.png', items: [] },
  { label: 'Подарочные наборы', slug: 'gifts', image: '/images/gift_set_image.png', items: [] },
  { label: 'Аксессуары', slug: 'accessories', image: '/images/accessories_image.png', accessories: true, items: [] },
];
