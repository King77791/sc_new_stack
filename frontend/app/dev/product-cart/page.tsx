import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ProductCard } from '@/features/product/ProductCard/ProductCard';
import { productCardExamples } from '@/features/product/ProductCard/product-card.fixtures';
import { ProductCartHarness } from './ProductCartHarness';

export const metadata: Metadata = { title: 'ProductCard → Cart QA', robots: { index: false, follow: false } };
export const dynamic = 'force-dynamic';

export default function ProductCartPage() {
  if (process.env.NODE_ENV !== 'development') notFound();
  const examples = [
    { id: 'a', label: 'Selectable Tea A', data: productCardExamples[0].data },
    { id: 'b', label: 'Same selectable Tea B', data: productCardExamples[0].data },
    { id: 'pressed', label: 'Fixed pressed Tea', data: productCardExamples[3].data },
    { id: 'ceramics', label: 'Fixed Ceramics', data: productCardExamples[4].data },
    { id: 'ceramics-copy', label: 'Same Ceramics again', data: productCardExamples[4].data },
    { id: 'availability', label: 'Disabled configurations', data: productCardExamples[6].data },
    { id: 'preorder', label: 'Preorder', data: productCardExamples[2].data },
  ];
  return <ProductCartHarness>{examples.map(example => <section key={example.id} data-card={example.id}>
    <h2>{example.label}</h2>
    <ProductCard data={example.data} presentation="responsive" />
  </section>)}</ProductCartHarness>;
}
