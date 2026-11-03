import { notFound } from 'next/navigation';
import { TransferProviderQA } from './TransferProviderQA';

export const dynamic = 'force-dynamic';

export default function CartTransferPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <TransferProviderQA />;
}
