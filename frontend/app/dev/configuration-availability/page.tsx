import { notFound } from 'next/navigation';
import { AvailabilityHarness } from './AvailabilityHarness';

export const dynamic = 'force-dynamic';
export default function AvailabilityPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  return <AvailabilityHarness />;
}
