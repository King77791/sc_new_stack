import { catalogCategories, mainNavigationItems } from '@/lib/site-data';

export const footerCategories = catalogCategories;
export const footerNavigation = mainNavigationItems.slice(1);
export const footerSocialLinks = [
  { label: 'YouTube — Столица чая', href: 'https://www.youtube.com/@stolica_chaya', icon: '/icons/social-youtube.svg' },
  { label: 'Telegram — Столица чая', href: 'https://t.me/stolitsa_chaya', icon: '/icons/social-telegram.svg' },
] as const;
