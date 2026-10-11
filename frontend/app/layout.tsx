import type { Metadata } from 'next';
import localFont from 'next/font/local';
import { SiteHeader } from '@/components/SiteHeader/SiteHeader';
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
  title: 'Сервис на SSR',
  description: 'Минимальный каркас приложения на Next.js и PHP',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body className={ceraPro.variable}>
        <SiteHeader />
        {children}
      </body>
    </html>
  );
}
