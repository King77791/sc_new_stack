import type { StaticImageData } from 'next/image';

// Section presentation data, not a backend DTO. Counts must come from the server
// once API integration replaces the explicitly marked fixtures.
export type HomeCategory = {
  id: string;
  title: string;
  slug: string;
  image: StaticImageData | null;
  productCount: number;
};

export type CategoriesSectionProps = {
  categories: readonly HomeCategory[];
};
