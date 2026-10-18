import type { UpcomingEventPromoData } from './UpcomingEventPromo.types';

// Backend will supply the already selected 0..1 event. No frontend ranking.
export const homeUpcomingEvent: UpcomingEventPromoData | null = {
  id: 'tree-touts-tea-ceremony',
  articleId: 31,
  categorySlug: 'tea-culture',
  typeLabel: 'Мероприятие',
  title: 'Чайная церемония\nTree Touts',
  address: 'проспект Мира, д. 150,\nгостиница «Космос»',
  image: {
    src: '/images/events/tree-touts-tea-ceremony.webp',
    width: 240,
    height: 240,
    alt: 'Афиша чайной церемонии Tree Touts',
  },
};
