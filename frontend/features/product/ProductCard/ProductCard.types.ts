/** UI presentation inputs only; not a Product model or a backend contract. */
export type ProductCardPresentation = 'full' | 'compact';

export type ProductCardMood = Readonly<{
  slug: string;
  label: string;
  icon: string;
  iconWidth: number;
  iconHeight: number;
}>;

type TeaMoods = readonly [ProductCardMood]
  | readonly [ProductCardMood, ProductCardMood]
  | readonly [ProductCardMood, ProductCardMood, ProductCardMood];

export type ProductCardCountry = Readonly<{
  label: string;
  illustration?: string;
  background?: string;
}>;

export type ProductCardOrigin = Readonly<{ label: string }>;

export type ProductCardPrice = Readonly<{
  current: string;
  discount?: Readonly<{ original: string; label: string }>;
}>;

/** Local presentation choices, not an API or commerce model. */
export type ProductCardConfiguration = Readonly<{
  id: string;
  label: string;
  price: ProductCardPrice;
}>;

type CardContent = Readonly<{
  slug: string;
  title: string;
  image: Readonly<{ src: string; alt: string; width: number; height: number }>;
  country?: ProductCardCountry;
  origin?: ProductCardOrigin;
  /** Already prepared display values. No pricing or discount calculations. */
  price: ProductCardPrice;
  purchasePresentation: 'regular' | 'preorder';
}>;

export type ProductCardData = CardContent & (
  | Readonly<{
    kind: 'tea';
    moods: TeaMoods;
    weight: Readonly<{ presentation: 'fixed'; label: string }>
      | Readonly<{
        presentation: 'selectable';
        label: string;
        configurations: readonly [ProductCardConfiguration, ...ProductCardConfiguration[]];
      }>;
  }>
  | Readonly<{ kind: 'ceramics'; moods?: never; weight?: never }>
);

export type ProductCardProps = Readonly<{
  data: ProductCardData;
  presentation: ProductCardPresentation;
  /** User relation displayed separately from product content; no persistence. */
  favorite?: boolean;
}>;
