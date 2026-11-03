import type {
  AddItemInput, CartIdentity, CartItem, ConfigurationKey, MutationResult, ResolveCartPricing, SuccessfulAdd,
  ResolveTransferTarget, TransferConfigurationInput, TransferConfigurationResult, TransferFailureReason,
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

function validIdentity(value: CartIdentity | undefined): value is CartIdentity {
  return Boolean(value && typeof value.productKey === 'string' && value.productKey.trim()
    && (value.configuration?.kind === 'fixed' || (value.configuration?.kind === 'selectable'
      && typeof value.configuration.id === 'string' && value.configuration.id.trim())));
}

/** One pure transition. Resolvers must be synchronous and pure; publication belongs to Provider. */
export function transferConfiguration(items: readonly CartItem[], input: TransferConfigurationInput,
  resolveTarget: ResolveTransferTarget | undefined, resolvePricing: ResolveCartPricing,
): Readonly<{ items: readonly CartItem[]; result: TransferConfigurationResult }> {
  const reject = (reason: TransferFailureReason) => ({ items, result: { ok: false as const, reason } });
  try {
    const expected = input?.expectedSource, target = input?.target;
    if (!validIdentity(expected) || !validIdentity(target) || expected.id !== getCartItemId(expected)
      || target.productKey !== expected.productKey) return reject('invalid-identity');
    const sourceId = expected.id, targetId = getCartItemId(target);
    // Detect affected logical duplicates as well as IDs inconsistent with their structured identity.
    const affected = (id: string) => items.filter(item => item.id === id || (validIdentity(item) && getCartItemId(item) === id));
    const sources = affected(sourceId), targets = affected(targetId);
    if (sources.length > 1 || targets.length > 1 || [...sources, ...targets].some(item =>
      !validIdentity(item) || item.id !== getCartItemId(item))) return reject('invalid-identity');
    const source = sources[0], previous = targets[0];
    if (!source) return reject('not-found');
    if (source !== expected) return reject('conflict');
    if (!validQuantity(source.quantity) || (previous && !validQuantity(previous.quantity))) return reject('invalid-quantity');
    if (sourceId === targetId) return { items, result: { ok: true, value: { outcome: 'unchanged', item: source } } };
    if (source.configuration.kind !== 'selectable' || target.configuration.kind !== 'selectable') return reject('invalid-identity');
    if (!resolveTarget) return reject('validation-unavailable');
    const definition = resolveTarget(target);
    if (!definition.ok) return reject(definition.reason);
    if (!validIdentity(definition.identity) || getCartItemId(definition.identity) !== targetId) return reject('invalid-identity');
    if (typeof definition.available !== 'boolean' || typeof definition.presentation?.slug !== 'string'
      || !definition.presentation.slug.trim() || typeof definition.presentation.title !== 'string'
      || !definition.presentation.title.trim() || typeof definition.presentation.configurationLabel !== 'string'
      || !definition.presentation.configurationLabel.trim()) return reject('validation-unavailable');
    if (!definition.available) return reject('unavailable');
    const quantity = (previous?.quantity ?? 0) + source.quantity;
    if (!validQuantity(quantity)) return reject('invalid-quantity');
    const item = quote({ id: targetId, productKey: target.productKey, configuration: { ...target.configuration },
      quantity, presentation: { ...definition.presentation } }, resolvePricing);
    if (!item) return reject('pricing-failed');
    const next = previous
      ? items.filter(current => current !== source).map(current => current === previous ? item : current)
      : items.map(current => current === source ? item : current);
    return { items: next, result: { ok: true, value: {
      outcome: previous ? 'merged' : 'transferred', source: { productKey: source.productKey, configuration: { ...source.configuration } },
      item, movedQuantity: source.quantity,
    } } };
  } catch {
    return reject('unexpected-failure');
  }
}
