import Link from 'next/link';
import { notFound } from 'next/navigation';

export default function NotificationObserverPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <main className="page"><h1>Notification navigation observer</h1><p>Application queue сохраняется при client navigation.</p><Link href="/dev/notification">Back to harness</Link></main>;
}
