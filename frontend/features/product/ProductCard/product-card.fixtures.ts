import type { ProductCardData, ProductCardMood } from './ProductCard.types';

// Development presentation examples only. Values are not backend data or pricing rules.
const moods: readonly [ProductCardMood, ProductCardMood, ProductCardMood] = [
  { slug: 'energy', label: 'Энергия', icon: '/icons/moods/energy.svg', iconWidth: 32, iconHeight: 32 },
  { slug: 'concentration', label: 'Концентрация', icon: '/icons/moods/concentration.svg', iconWidth: 32, iconHeight: 32 },
  { slug: 'immunity', label: 'Иммунитет', icon: '/icons/moods/immunity.svg', iconWidth: 28, iconHeight: 30 },
];

const country = {
  label: 'Китай',
  illustration: '/icons/regions/china.svg',
  background: '/images/regions/backgrounds/china.jpg',
} as const;

const teaImage = {
  src: '/images/products/darjeeling-orange-valley.png',
  alt: 'Золотистые чайные листья, вид сверху',
  width: 500,
  height: 500,
} as const;

export const productCardExamples: readonly Readonly<{
  label: string;
  data: ProductCardData;
  favorite?: boolean;
}>[] = [
  {
    label: 'Весовой чай',
    data: {
      kind: 'tea', slug: 'tea-presentation', title: 'Золотистый чай', image: teaImage,
      country, moods, weight: { presentation: 'selectable', label: '50 г', configurations: [
        { id: 'tea-50', label: '50 г', price: { current: '1 030 ₽' } },
        { id: 'tea-100', label: '100 г', price: { current: '1 980 ₽' } },
        { id: 'tea-200', label: '200 г', price: { current: '3 800 ₽' } },
      ] },
      price: { current: '1 030 ₽' }, purchasePresentation: 'regular',
    },
  },
  {
    label: 'Скидка',
    data: {
      kind: 'tea', slug: 'discount-tea-presentation', title: 'Дарджилин Апельсиновая Долина', image: teaImage,
      // Independent labels demonstrate that Country and Origin are not one domain field.
      country: { label: 'Индия' }, origin: { label: 'Дарджилинг' }, moods,
      weight: { presentation: 'selectable', label: '100 г', configurations: [
        { id: 'discount-50', label: '50 г', price: { current: '640 ₽', discount: { original: '850 ₽', label: '−25%' } } },
        { id: 'discount-100', label: '100 г', price: { current: '1 200 ₽', discount: { original: '1 600 ₽', label: '−25%' } } },
        { id: 'discount-250', label: '250 г', price: { current: '2 700 ₽', discount: { original: '3 600 ₽', label: '−25%' } } },
      ] },
      price: { current: '1 200 ₽', discount: { original: '1 600 ₽', label: '−25%' } },
      purchasePresentation: 'regular',
    },
  },
  {
    label: 'Предзаказ',
    data: {
      kind: 'tea', slug: 'preorder-tea-presentation', title: 'Жень Шень',
      image: { src: '/images/products/ginseng-tea.png', alt: 'Зелёные листья чая', width: 500, height: 500 },
      country, moods: [moods[0]], weight: { presentation: 'selectable', label: '50 г', configurations: [
        { id: 'preorder-50', label: '50 г', price: { current: '1 600 ₽' } },
      ] },
      price: { current: '1 600 ₽' }, purchasePresentation: 'preorder',
    },
  },
  {
    label: 'Фиксированный вес', favorite: true,
    data: {
      kind: 'tea', slug: 'pressed-puer-presentation', title: 'Шу Пуэр V93',
      image: { src: '/images/products/pressed-puer.png', alt: 'Прессованный пуэр в бумажной упаковке', width: 545, height: 545 },
      country, origin: { label: 'Юньнань' }, moods: [moods[0], moods[1]],
      weight: { presentation: 'fixed', label: '100 г' },
      price: { current: '1 500 ₽' }, purchasePresentation: 'regular',
    },
  },
  {
    label: 'Керамика',
    data: {
      kind: 'ceramics', slug: 'teapot-pharaoh-presentation', title: 'Чайник «Фараон», 800 мл',
      image: { src: '/images/products/teapot-pharaoh.png', alt: 'Коричневый керамический чайник', width: 400, height: 400 },
      country, price: { current: '9 300 ₽' }, purchasePresentation: 'regular',
    },
  },
  {
    label: 'Длинное название',
    data: {
      kind: 'tea', slug: 'long-title-tea-presentation',
      title: 'Дарджилин Апельсиновая Долина — весенний сбор с длинным названием', image: teaImage,
      country: { label: 'Индия' }, origin: { label: 'Дарджилинг' }, moods,
      weight: { presentation: 'selectable', label: '200 г', configurations: [
        { id: 'long-100', label: '100 г', price: { current: '5 400 ₽' } },
        { id: 'long-200', label: '200 г', price: { current: '10 300 ₽' } },
      ] },
      price: { current: '10 300 ₽' }, purchasePresentation: 'regular',
    },
  },
];
