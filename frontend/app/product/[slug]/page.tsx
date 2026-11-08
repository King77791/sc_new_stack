import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { applicationProductInputs } from '@/features/product-input/product-input.application';
import { lookupProductPage } from '@/features/product-page/product-page.read-model';
import { ProductPresentation } from '@/features/product-page/ProductPresentation';
import { relatedProductCards } from '@/features/product-page/product-page.presentation';

type Props = Readonly<{ params: Promise<{ slug: string }> }>;
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const result = lookupProductPage(applicationProductInputs.views, (await params).slug);
  return { title: result.status === 'found' ? result.product.title : 'Товар не найден', robots: { index: false, follow: false } };
}

/** Page composition; persistent Header/Footer/CartProvider remain in RootLayout. */
export default async function ProductPage({ params }: Props) {
  const result = lookupProductPage(applicationProductInputs.views, (await params).slug);
  if (result.status !== 'found') notFound();
  return <ProductPresentation product={result.product} related={relatedProductCards(result.product, applicationProductInputs.views)} />;
}
