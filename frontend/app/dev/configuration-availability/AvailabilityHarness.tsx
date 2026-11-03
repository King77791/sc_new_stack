'use client';

import { useState } from 'react';
import { CartProvider, useCart } from '@/features/cart/CartProvider';
import { CartWidgetContainer } from '@/features/cart/CartWidgetContainer';
import { resolveCartFixturePricing } from '@/features/cart/cart-pricing.fixtures';
import { ProductCard } from '@/features/product/ProductCard/ProductCard';
import type { ProductCardData } from '@/features/product/ProductCard/ProductCard.types';
import { productCardExamples } from '@/features/product/ProductCard/product-card.fixtures';
import { configurationAvailability } from '@/features/product/ProductCard/configuration-contract';
import { CartObserver, CartSnapshot } from '../cart-state/CartStateHarness';
import styles from './page.module.css';

/** Controlled product props only: no backend, registration store or Cart snapshot availability. */
export function AvailabilityHarness() {
  const [unavailable, setUnavailable] = useState<readonly string[]>(['tea-200','tea-250']);
  const original = productCardExamples[0].data;
  if (original.kind !== 'tea' || original.weight.presentation !== 'selectable') throw new Error('Expected selectable QA fixture');
  // Deliberately different reference text: initial identity must still be canonical 50, not this label.
  const product: ProductCardData = { ...original, weight: { ...original.weight, label: '250 г.',
    configurations: original.weight.configurations.map(option => ({ ...option, disabled: unavailable.includes(option.id) })),
  } };
  return <CartProvider resolvePricing={resolveCartFixturePricing}>
    <main className={styles.harness}>
      <h1>Configuration availability · frontend props QA</h1>
      <p>External controls seed canonical Cart independently; Card and Widget receive the same current product input.</p>
      <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>{original.weight.configurations.map(option =>
        <button key={option.id} data-toggle-availability={option.id} onClick={() => setUnavailable(current => current.includes(option.id)
          ? current.filter(id => id !== option.id) : [...current,option.id])}>Toggle {option.label}</button>)}</div>
      <ExternalOperations product={product} />
      <section data-card="a"><ProductCard data={product} presentation="responsive" /></section>
      <CartObserver />
      <CartSnapshot />
    </main>
    <CartWidgetContainer unavailablePriceLabel="Цена недоступна" availability={configurationAvailability([product])} />
  </CartProvider>;
}

function ExternalOperations({product}:Readonly<{product:ProductCardData}>) {
  const cart = useCart();
  if (product.kind !== 'tea' || product.weight.presentation !== 'selectable') return null;
  return <div style={{display:'flex',flexWrap:'wrap',gap:8,marginBottom:16}}>{product.weight.configurations.map(option => <div key={option.id}>
    {[['add',2],['set',1],['set',3],['remove',0]].map(([action,amount]) => <button key={`${action}-${amount}`} data-external={`${action}-${option.id}-${amount}`}
      onClick={() => {
        const configuration = {kind:'selectable' as const,id:option.id};
        const item = cart.getItem(product.slug,configuration);
        if(action==='add')void cart.addItem({productKey:product.slug,configuration,quantity:Number(amount),presentation:{slug:product.slug,title:product.title,configurationLabel:option.label}});
        else if(item)void (action==='set'?cart.setItemQuantity(item.id,Number(amount)):cart.removeItem(item.id));
      }}>External {action} {option.label} {amount}</button>)}
  </div>)}</div>;
}
