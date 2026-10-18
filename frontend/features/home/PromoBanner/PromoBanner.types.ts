/** Local banner presentation data, not a CMS/API contract. */
export type PromoBannerItem = Readonly<{
  id: string;
  label: string;
  href: string;
  navigation: 'internal' | 'external';
  background: string;
  /** One indivisible artwork exported from the complete content frame. */
  criticalArtwork: Readonly<{ src: string; width: number; height: number }>;
}>;

export type PromoBannerItems = readonly [PromoBannerItem, ...PromoBannerItem[]];
