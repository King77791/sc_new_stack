import { notFound } from 'next/navigation';
import { NotificationDemo } from './NotificationDemo';

export const metadata = { title: 'Notification — isolated QA', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function NotificationPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <NotificationDemo />;
}
