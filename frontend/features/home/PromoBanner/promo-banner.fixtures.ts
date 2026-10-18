import type { PromoBannerItems } from './PromoBanner.types';
import { homePromoBanners } from './promo-banner.data';

/** Dev-only single-banner state alongside the production multi-banner example. */
export const singlePromoBannerExample = [homePromoBanners[0]] as const satisfies PromoBannerItems;
