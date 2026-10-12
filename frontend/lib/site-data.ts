// Shared presentation data. Category slugs remain provisional until routing is approved.
export const mainNavigationItems = [
  { label: 'Каталог', href: '/catalog' },
  { label: 'Доставка и оплата', href: '/delivery-payment' },
  { label: 'События', href: '/events' },
  { label: 'Контакты', href: '/contacts' },
] as const;

export const catalogCategories = [
  { label: 'Черный', slug: 'black' },
  { label: 'Зеленый', slug: 'green' },
  { label: 'Улун', slug: 'oolong' },
  { label: 'Пуэр', slug: 'puer' },
  { label: 'Красный', slug: 'red' },
  { label: 'Белый', slug: 'white' },
  { label: 'Подарки', slug: 'gifts' },
  { label: 'Аксессуары', slug: 'accessories' },
] as const;

export const siteContacts = {
  email: { label: 'info@stolica-chaya.ru', href: 'mailto:info@stolica-chaya.ru' },
  phone: { label: '+7 (495) 777-60-21', href: 'tel:+74957776021' },
} as const;
