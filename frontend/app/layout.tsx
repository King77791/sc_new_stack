import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { SiteHeader } from '@/components/SiteHeader/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter/SiteFooter';
import { CartApplicationProvider } from '@/features/cart/CartApplicationProvider';
import { CartWidgetContainer } from '@/features/cart/CartWidgetContainer';
import { NotificationProvider, NotificationHost } from '@/components/Notification/NotificationProvider';
import { productCardExamples } from '@/features/product/ProductCard/product-card.fixtures';
import { configurationAvailability } from '@/features/product/ProductCard/configuration-contract';
import './globals.css';

const ceraPro = localFont({
  src: [
    { path: '../public/fonts/CeraPro-Regular.woff2', weight: '400', style: 'normal' },
    { path: '../public/fonts/CeraPro-Medium.woff2', weight: '500', style: 'normal' },
  ],
  variable: '--font-cera-pro',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'Столица чая',
    template: '%s | Столица чая',
  },
  description: 'Натуральный китайский чай и исинская керамика. Столица чая — управляй состоянием.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={ceraPro.variable}>
        <NotificationProvider><CartApplicationProvider>
          <SiteHeader />
          <div className="app-content">{children}</div>
          <CartWidgetContainer unavailablePriceLabel="Цена недоступна" availability={configurationAvailability(productCardExamples.map(example => example.data))} />
          <SiteFooter />
          <NotificationHost />
        </CartApplicationProvider></NotificationProvider>
      </body>
    </html>
  );
}
