import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Сервис на SSR',
  description: 'Минимальный каркас приложения на Next.js и PHP',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
