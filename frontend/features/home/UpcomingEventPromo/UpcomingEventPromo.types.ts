/** Local presentation data; not an Events API or venue model. */
export type UpcomingEventPromoData = Readonly<{
  id: string;
  articleId: number;
  categorySlug: string;
  typeLabel: string;
  title: string;
  address: string;
  image: Readonly<{ src: string; width: number; height: number; alt: string }>;
}>;
