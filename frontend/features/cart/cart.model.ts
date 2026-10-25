import type {
  AddItemInput, CartIdentity, CartItem, ConfigurationKey, MutationResult, ResolveCartPricing, SuccessfulAdd,
} from './cart.types';

/** Structured serialization distinguishes delimiters, fixed and selectable keys. */
export function getCartItemId({ productKey, configuration }: CartIdentity): string {
  return JSON.stringify([productKey, configuration.kind === 'fixed' ? ['fixed'] : ['selectable', configuration.id]]);
}

export function getItem(items: readonly CartItem[], productKey: string, configuration: ConfigurationKey) {
  const id = getCartItemId({ productKey, configuration });
  return items.find(item => item.id === id);
}

export function getQuantity(items: readonly CartItem[], productKey: string, configuration: ConfigurationKey) {
  return getItem(items, productKey, configuration)?.quantity ?? 0;
}

type Transition<T> = Readonly<{ items: readonly CartItem[]; result: MutationResult<T> }>;

function failure<T>(items: readonly CartItem[], reason: Extract<MutationResult<T>, { ok: false }>['reason']): Transition<T> {
  return { items, result: { ok: false, reason } };
}

function validQuantity(quantity: number) {
  return Number.isSafeInteger(quantity) && quantity > 0;
}

function quote(item: Omit<CartItem, 'pricing'>, resolvePricing: ResolveCartPricing): CartItem | undefined {
  try {
    const pricing = resolvePricing(item);
    return { ...item, pricing: { ...pricing } };
  } catch {
    return undefined;
  }
}

/** Pure transition; the caller supplies a pure, explicit quote resolver. */
export function addItem(items: readonly CartItem[], input: AddItemInput, resolvePricing: ResolveCartPricing): Transition<SuccessfulAdd> {
  if (!validQuantity(input.quantity)) return failure(items, 'invalid-quantity');
  if (!input.productKey.trim() || (input.configuration.kind === 'selectable' && !input.configuration.id.trim())) {
    return failure(items, 'invalid-identity');
  }
  const id = getCartItemId(input);
  const previous = items.find(item => item.id === id);
  const quantity = (previous?.quantity ?? 0) + input.quantity;
  if (!validQuantity(quantity)) return failure(items, 'invalid-quantity');
  const item = quote({
    id, productKey: input.productKey, configuration: { ...input.configuration }, quantity,
    presentation: { ...input.presentation },
  }, resolvePricing);
  if (!item) return failure(items, 'pricing-failed');
  return {
    items: previous ? items.map(current => current.id === id ? item : current) : [...items, item],
    result: { ok: true, value: { item, addedQuantity: input.quantity } },
  };
}

export function setItemQuantity(items: readonly CartItem[], itemId: string, quantity: number, resolvePricing: ResolveCartPricing): Transition<CartItem> {
  if (!validQuantity(quantity)) return failure(items, 'invalid-quantity');
  const previous = items.find(item => item.id === itemId);
  if (!previous) return failure(items, 'not-found');
  const item = quote({
    id: previous.id, productKey: previous.productKey, configuration: previous.configuration,
    presentation: previous.presentation, quantity,
  }, resolvePricing);
  if (!item) return failure(items, 'pricing-failed');
  return {
    items: items.map(current => current.id === itemId ? item : current),
    result: { ok: true, value: item },
  };
}

/** Unknown IDs fail without changing state; REMOVE always removes the whole line. */
export function removeItem(items: readonly CartItem[], itemId: string): Transition<{ itemId: string }> {
  if (!items.some(item => item.id === itemId)) return failure(items, 'not-found');
  return { items: items.filter(item => item.id !== itemId), result: { ok: true, value: { itemId } } };
}
