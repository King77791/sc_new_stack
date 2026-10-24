import type { CartWidgetItemData } from '@/features/cart/CartWidget/CartWidget.types';

// Explicit presentation totals, not unit prices, stock rules, API responses or a Cart store.
const threeItems: readonly CartWidgetItemData[] = [
  { id: 'fixture-long-zhu-100', slug: 'lyu-lun-chzhu', title: 'Люй Лун Чжу', displayLinePrice: '540 ₽', configurationLabel: '100 г.', quantity: 3 },
  { id: 'fixture-orange-valley-100', slug: 'darjeeling-orange-valley', title: 'Дарджилин Апельсиновая Долина', displayLinePrice: '900 ₽', configurationLabel: '100 г.', quantity: 3 },
  { id: 'fixture-ginseng-100', slug: 'ginseng', title: 'Жень Шень', displayLinePrice: '800 ₽', configurationLabel: '100 г.', quantity: 2 },
];

const longTitleItems: readonly CartWidgetItemData[] = [
  threeItems[1],
  { ...threeItems[1], id: 'fixture-long-title-100', slug: 'long-title-tea-presentation', title: 'Дарджилин Апельсиновая Долина — весенний сбор с длинным названием' },
  { ...threeItems[0], id: 'fixture-dian-hong-long-100', slug: 'jin-hao-dian-hong', title: 'Цзинь Хао Дянь Хун — золотистые почки из Юньнани, весенний сбор' },
];

export const cartWidgetFixtures = {
  empty: { label: '0 позиций', items: [] },
  one: { label: '1 позиция', items: [threeItems[2]] },
  three: { label: '3 позиции · Figma', items: threeItems },
  longTitles: { label: 'Длинные названия · wrapping', items: longTitleItems },
  unbreakable: {
    label: 'Неразрывный title · robustness',
    // Regression data only; not a production content or Product model requirement.
    items: [{ ...threeItems[2], id: 'fixture-unbreakable-100', slug: 'unbreakable-title-qa', title: 'Сверхдлинноенеразрывноеназваниечайногопродукта' }],
  },
  many: {
    label: '21 позиция · scroll',
    items: Array.from({ length: 21 }, (_, index) => ({
      ...longTitleItems[index % longTitleItems.length], id: `fixture-row-${index}`,
    })),
  },
  configurations: {
    label: 'Один чай · две конфигурации',
    items: [
      { id: 'fixture-dian-hong-50', slug: 'jin-hao-dian-hong', title: 'Цзинь Хао Дянь Хун', displayLinePrice: '540 ₽', configurationLabel: '50 г.', quantity: 3 },
      { id: 'fixture-dian-hong-100', slug: 'jin-hao-dian-hong', title: 'Цзинь Хао Дянь Хун', displayLinePrice: '900 ₽', configurationLabel: '100 г.', quantity: 2 },
    ],
  },
} satisfies Record<string, { label: string; items: readonly CartWidgetItemData[] }>;

export type CartWidgetScenario = keyof typeof cartWidgetFixtures;
