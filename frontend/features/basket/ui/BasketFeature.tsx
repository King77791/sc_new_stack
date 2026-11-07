'use client';

import { useEffect, useRef, useState } from 'react';
import { useCart } from '../../cart/CartProvider';
import type { CartIdentity, CartItem } from '../../cart/cart.types';
import { applicationProductInputs } from '../../product-input/product-input.application';
import { projectProductInputBasket } from '../../product-input/product-input.basket';
import { captureFocusOwnership } from '../../../lib/focus-ownership';
import { basketFocusTarget, toBasketView } from '../adapters/basket-ui.adapter';
import { createBasketInteractions, initialBasketInteractionState } from '../model/basket-interactions';
import { reconcileBasketGroupOrder } from '../model/basket-group-order';
import { BasketTransferEditor, BasketView } from './BasketView';

type Editor = Readonly<{ source: CartItem; generation: number }>;
type FocusRequest = { lease: ReturnType<typeof captureFocusOwnership>; frame?: number };

/** Application consumer: canonical Cart + Gate 9B-1 snapshot -> Gate 8B projection -> UI only. */
export function BasketFeature() {
  const cart = useCart(), latestCart = useRef(cart);
  latestCart.current = cart;
  const [interaction, setInteraction] = useState(initialBasketInteractionState);
  const [interactions] = useState(() => createBasketInteractions(() => latestCart.current,
    () => applicationProductInputs.views, setInteraction));
  const [editor, setEditor] = useState<Editor | null>(null);
  const [groupOrder, setGroupOrder] = useState<readonly string[]>([]);
  const editorGeneration = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null), host = useRef<HTMLDivElement>(null);
  const focusRequests = useRef(new Set<FocusRequest>());
  useEffect(() => {
    interactions.connect();
    const requests = focusRequests.current;
    return () => {
      interactions.disconnect();
      requests.forEach(request => { request.lease.dispose(); if (request.frame !== undefined) cancelAnimationFrame(request.frame); });
      requests.clear();
    };
  }, [interactions]);
  useEffect(() => {
    // External removal closes stale editor UI without claiming focus ownership.
    if (editor && !cart.getItem(editor.source.productKey, editor.source.configuration)) setEditor(null);
  }, [cart, editor]);

  const projected = toBasketView(projectProductInputBasket(cart.items, applicationProductInputs.views));
  const nextOrder = reconcileBasketGroupOrder(groupOrder, projected.groups.map(group => group.productKey));
  // Adjust this component's keys before commit, rather than reordering in an effect after paint.
  // React retries this render; discarded concurrent renders cannot mutate shared history.
  if (nextOrder !== groupOrder) setGroupOrder(nextOrder);
  const groups = new Map(projected.groups.map(group => [group.productKey, group]));
  const view = { ...projected, groups: nextOrder.map(key => groups.get(key)!) };
  const order = view.groups.flatMap(group => group.configurations.map(line => line.item.id));
  const capture = (origin: HTMLElement): FocusRequest => {
    const request = { lease: captureFocusOwnership(origin) }; focusRequests.current.add(request); return request;
  };
  const discard = (request: FocusRequest) => { request.lease.dispose(); focusRequests.current.delete(request); };
  const restore = (request: FocusRequest, id?: string, action = 'decrease', removed?: string) => {
    request.frame = requestAnimationFrame(() => {
      focusRequests.current.delete(request);
      if (!request.lease.release()) return;
      const rows = Array.from(host.current?.querySelectorAll<HTMLElement>('[data-row-id]') ?? []);
      const remaining = rows.map(row => row.dataset.rowId!);
      const targetId = removed ? basketFocusTarget(order, removed, remaining) : id;
      const row = rows.find(row => row.dataset.rowId === targetId);
      const target = row?.querySelector<HTMLButtonElement>(`button[data-action="${action}"]:not(:disabled)`)
        ?? row?.querySelector<HTMLButtonElement>('button:not(:disabled)') ?? heading.current;
      if (target?.isConnected && target.getClientRects().length) target.focus({ preventScroll: true });
    });
  };
  const action = async (identity: CartIdentity, intent: 'increase' | 'decrease' | 'remove', origin: HTMLButtonElement) => {
    const request = capture(origin);
    const result = intent === 'remove' ? await interactions.remove(identity)
      : await interactions.quantity(identity, intent === 'increase' ? 1 : -1);
    if (!result.ok && ['busy', 'cancelled'].includes(result.reason)) { discard(request); return; }
    if (result.ok && result.outcome === 'removed') {
      setEditor(current => current?.source.id === result.itemId ? null : current);
      restore(request, undefined, 'decrease', result.itemId);
    } else restore(request, origin.closest<HTMLElement>('[data-row-id]')?.dataset.rowId, intent);
  };
  const open = (item: CartItem) => {
    const actual = cart.getItem(item.productKey, item.configuration);
    if (!actual || interactions.isPending(actual.id) || !interactions.targets(actual).length) return;
    interactions.clearError(actual.id); setEditor({ source: actual, generation: ++editorGeneration.current });
  };
  const cancel = (opened: Editor, origin: HTMLElement) => {
    const request = capture(origin); setEditor(current => current === opened ? null : current);
    restore(request, opened.source.id, 'edit');
  };
  const transfer = async (opened: Editor, target: CartIdentity, origin: HTMLButtonElement) => {
    const request = capture(origin);
    const result = await interactions.transfer(opened.source, target);
    if (result.ok) {
      setEditor(current => current === opened ? null : current); restore(request, result.itemId);
    } else if (['busy', 'cancelled'].includes(result.reason)) discard(request);
    else {
      // Keep the editor and its explicit conflict/error visible. Do not silently replace source.
      request.frame = requestAnimationFrame(() => {
        focusRequests.current.delete(request);
        if (!request.lease.release()) return;
        const fallback = Array.from(host.current?.querySelectorAll<HTMLElement>('[data-row-id]') ?? [])
          .find(row => row.dataset.rowId === opened.source.id)?.querySelector<HTMLButtonElement>('button[data-action="edit"]:not(:disabled)');
        const target = origin.isConnected && !origin.disabled ? origin : fallback;
        target?.focus({ preventScroll: true });
      });
    }
  };
  return <div ref={host}><BasketView view={view} interaction={interaction} headingRef={heading}
    onAction={action} onEdit={open} editor={editor ? { sourceId: editor.source.id,
      content: <BasketTransferEditor key={`${editor.source.id}:${editor.generation}`} source={editor.source} interactions={interactions}
        pending={interaction.pending.includes(editor.source.id)}
        stale={cart.getItem(editor.source.productKey, editor.source.configuration) !== editor.source}
        error={interaction.errors[editor.source.id]}
        onCancel={origin => cancel(editor, origin)} onConfirm={(target, origin) => transfer(editor, target, origin)} /> } : undefined} /></div>;
}
