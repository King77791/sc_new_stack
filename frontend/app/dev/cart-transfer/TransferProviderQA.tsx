'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import { CartProvider, useCart } from '@/features/cart/CartProvider';
import type { CartItem, CartPublicInterface, TransferConfigurationResult } from '@/features/cart/cart.types';
import { productCardExamples } from '@/features/product/ProductCard/product-card.fixtures';
import { resolveProductTransferTarget } from '@/features/cart/cart-transfer-product.adapter';

declare global { interface Window { runCartTransferTests?: () => Promise<string[]> } }

function Observer({ observe }: Readonly<{ observe: (cart: CartPublicInterface) => void }>) {
  const cart = useCart();
  useLayoutEffect(() => { observe(cart); }, [cart, observe]);
  return <pre data-transfer-items>{JSON.stringify(cart.items)}</pre>;
}

/** Public useCart consumer only: no private React internals or production test hooks. */
export function TransferProviderQA() {
  const [settings, setSettings] = useState({ generation: 0, disabled: false, disabledSource: false, priceFailure: false, validation: true });
  const cart = useRef<CartPublicInterface | null>(null);
  const snapshots = useRef<readonly (readonly CartItem[])[]>([]);
  const last = useRef<readonly CartItem[] | null>(null);
  const product = productCardExamples[0].data;
  const products = product.kind === 'tea' && product.weight.presentation === 'selectable'
    ? [{ ...product, weight: { ...product.weight, configurations: product.weight.configurations.map(option => ({ ...option,
      disabled: (settings.disabled && option.id === 'tea-100') || (settings.disabledSource && option.id === 'tea-50'),
    })) } }]
    : [];

  useEffect(() => {
    window.runCartTransferTests = async () => {
      const passed: string[] = [];
      const assert = (condition: unknown, message: string) => { if (!condition) throw Error(message); };
      const current = () => cart.current!;
      const target = (id = 'tea-100') => ({ productKey: product.slug, configuration: { kind: 'selectable' as const, id } });
      const source = () => current().getItem(product.slug, { kind: 'selectable', id: 'tea-50' })!;
      const execute = async <T,>(operation: () => Promise<T>) => {
        let result!: Promise<T>;
        flushSync(() => { result = operation(); });
        return await result;
      };
      const add = (id: string, quantity = 1) => execute(() => current().addItem({ ...target(id), quantity,
        presentation: { slug: product.slug, title: product.title, configurationLabel: 'old metadata' } }));
      const clear = () => { snapshots.current = []; };
      const configure = (patch: Partial<typeof settings>) => flushSync(() => setSettings(previous => ({ ...previous, ...patch })));
      const reset = async (withTarget = false) => {
        flushSync(() => setSettings(previous => ({ generation: previous.generation + 1, disabled: false, disabledSource: false, priceFailure: false, validation: true })));
        await add('tea-50'); if (withTarget) await add('tea-100', 2); clear();
      };
      const applied = (result: TransferConfigurationResult, outcome: 'transferred' | 'merged', quantity: number) => {
        assert(result.ok && result.value.outcome === outcome, outcome);
        if (!result.ok) return;
        assert(result.value.item === current().getItem(product.slug, { kind: 'selectable', id: 'tea-100' }), 'canonical result object');
        assert(result.value.item.quantity === quantity, 'actual target quantity');
        assert(result.value.item.presentation.title === product.title && result.value.item.presentation.configurationLabel === '100 г.', 'current target metadata');
        assert(snapshots.current.length === 1, 'exactly one observable items publication');
        assert(snapshots.current.every(items => !items.some(i => i.configuration.kind === 'selectable' && i.configuration.id === 'tea-50') && items.some(i => i.configuration.kind === 'selectable' && i.configuration.id === 'tea-100')), 'no intermediate/partial snapshot');
      };
      const reject = (result: TransferConfigurationResult, reason: string, before: readonly CartItem[]) => {
        assert(!result.ok && result.reason === reason, reason);
        assert(current().items === before && snapshots.current.length === 0, 'rejection does not publish');
      };

      await reset();
      applied(await execute(() => current().transferConfiguration({ expectedSource: source(), target: target() })), 'transferred', 1);
      passed.push('transfer: one publication, matching result, no intermediate state');
      await reset(true);
      applied(await execute(() => current().transferConfiguration({ expectedSource: source(), target: target() })), 'merged', 3);
      passed.push('merge: one publication, actual target Q and fresh target metadata');

      await reset(); configure({ priceFailure: true, validation: false }); clear();
      const unchanged = current().items;
      const noOp = await execute(() => current().transferConfiguration({ expectedSource: source(), target: target('tea-50') }));
      assert(noOp.ok && noOp.value.outcome === 'unchanged' && current().items === unchanged && snapshots.current.length === 0, 'no-op bypasses resolvers/publication');
      passed.push('unchanged: no publication or resolver');

      for (const reason of ['unavailable', 'validation-unavailable', 'pricing-failed'] as const) {
        await reset();
        const oldCommand = current().transferConfiguration, expectedSource = source();
        configure({ disabled: reason === 'unavailable', validation: reason !== 'validation-unavailable', priceFailure: reason === 'pricing-failed' }); clear();
        const before = current().items;
        reject(await execute(() => oldCommand({ expectedSource, target: target() })), reason, before);
        passed.push(`${reason}: old command uses current resolver props, zero publication`);
      }
      await reset(true); configure({ disabled: true }); clear();
      reject(await execute(() => current().transferConfiguration({ expectedSource: source(), target: target() })), 'unavailable', current().items);
      passed.push('unavailable existing target: zero publication');

      await reset(); const unavailableSource = source(); configure({ disabledSource: true }); clear();
      applied(await execute(() => current().transferConfiguration({ expectedSource: unavailableSource, target: target() })), 'transferred', 1);
      passed.push('F: current source became unavailable, available target transfer remains allowed');

      for (const q of [1, 3]) {
        await reset(); const expectedSource = source();
        await execute(() => current().setItemQuantity(expectedSource.id, q)); clear();
        reject(await execute(() => current().transferConfiguration({ expectedSource, target: target() })), 'conflict', current().items);
      }
      passed.push('A: source SET, including equal quantity, conflicts');
      for (const q of [2, 4]) {
        await reset(); const expectedSource = source(), oldCommand = current().transferConfiguration;
        await add('tea-100', 2);
        if (q === 4) await execute(() => current().setItemQuantity(current().getItem(product.slug, target().configuration)!.id, q));
        clear(); applied(await execute(() => oldCommand({ expectedSource, target: target() })), 'merged', q + 1);
      }
      passed.push('B/D: target ADD/SET after editor open is merged from latest state');

      await reset(); const removedSource = source();
      await execute(() => current().removeItem(removedSource.id)); clear();
      reject(await execute(() => current().transferConfiguration({ expectedSource: removedSource, target: target() })), 'not-found', current().items);
      await add('tea-50'); clear();
      reject(await execute(() => current().transferConfiguration({ expectedSource: removedSource, target: target() })), 'conflict', current().items);
      passed.push('C: missing source and REMOVE→ADD reject stale snapshot');

      await reset(); const expectedSource = source(), oldCommand = current().transferConfiguration;
      await add('tea-200'); clear();
      applied(await execute(() => oldCommand({ expectedSource, target: target() })), 'transferred', 1);
      clear(); reject(await execute(() => oldCommand({ expectedSource, target: target() })), 'not-found', current().items);
      passed.push('unrelated mutation allowed; duplicate invocation cannot double merge');

      await reset(); const competingSource = source();
      let first!: Promise<TransferConfigurationResult>, second!: Promise<TransferConfigurationResult>;
      flushSync(() => {
        first = current().transferConfiguration({ expectedSource: competingSource, target: target() });
        second = current().transferConfiguration({ expectedSource: competingSource, target: target('tea-200') });
      });
      assert((await first).ok && !(await second).ok && snapshots.current.length === 1, 'only first competing transfer publishes');
      clear(); assert(!(await execute(() => current().setItemQuantity(competingSource.id, 3))).ok, 'stale SET after transfer');
      assert(!(await execute(() => current().removeItem(competingSource.id))).ok && snapshots.current.length === 0, 'stale REMOVE after transfer');
      passed.push('G/H: competing transfer and stale SET/REMOVE use latest canonical state');

      await reset(); await execute(() => current().setItemQuantity(source().id, 2));
      const fixedAdd = await execute(() => current().addItem({ productKey: 'fixed', configuration: { kind: 'fixed' }, quantity: 1, presentation: { slug: 'fixed', title: 'Fixed' } }));
      assert(fixedAdd.ok && current().hasItems && current().itemCount === 2 && source().quantity === 2, 'existing commands');
      await execute(() => current().removeItem(source().id)); assert(current().itemCount === 1, 'existing REMOVE');
      passed.push('existing ADD/SET/REMOVE and selectors unaffected');
      return passed;
    };
    return () => { delete window.runCartTransferTests; };
  }, [product, settings]);

  return <main><h1>Atomic Cart transfer · Provider QA</h1>
    <CartProvider key={settings.generation} resolveTransferTarget={settings.validation ? target => resolveProductTransferTarget(products, target) : undefined}
      resolvePricing={() => { if (settings.priceFailure) throw Error('QA quote failure'); return { status: 'unavailable' }; }}>
      <Observer observe={value => {
        cart.current = value;
        if (last.current !== value.items) { snapshots.current = [...snapshots.current, value.items]; last.current = value.items; }
      }} />
    </CartProvider>
  </main>;
}
