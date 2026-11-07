import type { CartIdentity, CartItem, CartPublicInterface } from '../../cart/cart.types';
import type { ProductInputViews } from '../../product-input/product-input.types';
import { projectProductInputBasket } from '../../product-input/product-input.basket';
import { productInputTransferTarget } from '../../product-input/product-input.transfer';
import { getCartItemId } from '../../cart/cart.model';

export type BasketInteractionState = Readonly<{ pending: readonly string[]; errors: Readonly<Record<string, string>> }>;
type Result = Readonly<{ ok: true; outcome: 'quantity' | 'removed' | 'transfer'; itemId: string }>
  | Readonly<{ ok: false; reason: string }>;
export const initialBasketInteractionState: BasketInteractionState = { pending: [], errors: {} };
export function basketMutationMessage(reason: string) {
  if (reason === 'conflict') return 'Позиция изменилась. Закройте выбор фасовки и откройте его заново.';
  if (reason === 'not-found') return 'Позиция уже удалена. Обновите выбор товара.';
  if (reason === 'unavailable' || reason === 'validation-unavailable') return 'Эта фасовка сейчас недоступна. Выберите другую.';
  if (reason === 'invalid-quantity') return 'Не удалось изменить количество: достигнут допустимый предел.';
  return 'Не удалось изменить корзину. Попробуйте ещё раз.';
}

/** Only transient interaction locks/errors live here. Canonical items/Q are always read through public Cart. */
export function createBasketInteractions(getCart: () => CartPublicInterface, getInputs: () => ProductInputViews,
  changed: (state: BasketInteractionState) => void) {
  const locks = new Map<string, symbol>();
  let errors: Record<string, string> = {}, active = true, generation = 0;
  const emit = () => { if (active) changed({ pending: [...locks.keys()], errors: { ...errors } }); };
  const fail = (id: string, reason: string): Result => {
    if (active) { errors = { ...errors, [id]: basketMutationMessage(reason) }; emit(); }
    return { ok: false, reason };
  };
  const current = (identity: CartIdentity) => getCart().getItem(identity.productKey, identity.configuration);
  const line = (item: CartItem) => projectProductInputBasket([item], getInputs()).groups[0]?.lines[0];
  const run = async (ids: readonly string[], work: () => Promise<Result>): Promise<Result> => {
    if (!active) return { ok: false, reason: 'cancelled' };
    if (ids.some(id => locks.has(id))) return { ok: false, reason: 'busy' };
    const token = Symbol(), started = generation;
    ids.forEach(id => { locks.set(id, token); delete errors[id]; }); emit();
    try {
      const result = await work();
      if (!active || started !== generation) return { ok: false, reason: 'cancelled' };
      if (!result.ok) return fail(ids[0], result.reason);
      return result;
    } catch { return active && started === generation ? fail(ids[0], 'unexpected-failure') : { ok: false, reason: 'cancelled' }; }
    finally { ids.forEach(id => { if (locks.get(id) === token) locks.delete(id); }); emit(); }
  };
  return {
    connect() { active = true; },
    disconnect() { active = false; generation += 1; locks.clear(); errors = {}; },
    isPending(id: string) { return locks.has(id); },
    clearError(id: string) { delete errors[id]; emit(); },
    targets(source: CartItem) {
      const group = projectProductInputBasket([source], getInputs()).groups[0];
      if (!group?.lines[0]?.canTransfer) return [];
      const resolve = productInputTransferTarget(getInputs());
      return group.product.definitions.filter(d => d.configuration.kind === 'selectable').map(d => {
        const identity = { productKey: source.productKey, configuration: d.configuration }, result = resolve(identity);
        return { identity, label: d.label ?? '', available: result.ok && result.available,
          current: getCartItemId(identity) === source.id };
      });
    },
    quantity(identity: CartIdentity, delta: 1 | -1): Promise<Result> {
      const actual = current(identity), id = getCartItemId(identity);
      if (!actual) return Promise.resolve(fail(id, 'not-found'));
      if (!Number.isSafeInteger(actual.quantity) || actual.quantity <= 0 || (delta > 0 && actual.quantity === Number.MAX_SAFE_INTEGER)) return Promise.resolve(fail(id, 'invalid-quantity'));
      if (delta > 0 && !line(actual)?.canIncrease) return Promise.resolve(fail(id, 'unavailable'));
      return run([id], async () => {
        // No await before the public command; actual came from the current Cart getter, not rendered Q.
        if (delta < 0 && actual.quantity === 1) {
          const result = await getCart().removeItem(id);
          return result.ok ? { ok: true, outcome: 'removed', itemId: id } : result;
        }
        const result = await getCart().setItemQuantity(id, actual.quantity + delta);
        return result.ok ? { ok: true, outcome: 'quantity', itemId: id } : result;
      });
    },
    remove(identity: CartIdentity): Promise<Result> {
      const actual = current(identity), id = getCartItemId(identity);
      if (!actual) return Promise.resolve(fail(id, 'not-found'));
      return run([id], async () => {
        const result = await getCart().removeItem(id);
        return result.ok ? { ok: true, outcome: 'removed', itemId: id } : result;
      });
    },
    transfer(expectedSource: CartItem, target: CartIdentity): Promise<Result> {
      const id = expectedSource.id;
      const actual = current(expectedSource);
      if (!actual) return Promise.resolve(fail(id, 'not-found'));
      if (actual !== expectedSource) return Promise.resolve(fail(id, 'conflict'));
      const validation = productInputTransferTarget(getInputs())(target);
      if (!validation.ok) return Promise.resolve(fail(id, validation.reason));
      if (!validation.available) return Promise.resolve(fail(id, 'unavailable'));
      const targetId = getCartItemId(target);
      if (id === targetId || expectedSource.productKey !== target.productKey) return Promise.resolve(fail(id, 'invalid-identity'));
      return run([id, targetId], async () => {
        const result = await getCart().transferConfiguration({ expectedSource, target });
        return result.ok ? { ok: true, outcome: 'transfer', itemId: result.value.item.id } : result;
      });
    },
  };
}
export type BasketInteractions = ReturnType<typeof createBasketInteractions>;
