import type { PromoBannerItems } from './PromoBanner.types';

// Temporary local presentation content until a CMS contract is available.
export const homePromoBanners = [{
  id: 'gift-sets',
  label: 'Новинка — подарочные наборы. Уникальный и эстетичный подарок. Подробнее.',
  href: 'https://stolica-chaya.ru/',
  navigation: 'external',
  background: '/images/promo/gift-sets-background.png',
  criticalArtwork: { src: '/images/promo/gift-sets-artwork.webp', width: 760, height: 760 },
}, {
  id: 'green-tea',
  label: 'Новая коллекция зелёного чая уже на нашем сайте. Подробнее в каталоге.',
  href: '/catalog/',
  navigation: 'internal',
  background: '/images/promo/green-tea-background.png',
  criticalArtwork: { src: '/images/promo/green-tea-artwork.webp', width: 760, height: 760 },
}] as const satisfies PromoBannerItems;
