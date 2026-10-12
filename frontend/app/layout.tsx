import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { SiteHeader } from '@/components/SiteHeader/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter/SiteFooter';
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
        <SiteHeader />
        <div className="app-content">{children}</div>
        <SiteFooter />
      </body>
    </html>
  );
}
