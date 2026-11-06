import type { ProductInputSnapshot } from './product-input.types';

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}
/** Detach from the producer before recursively freezing a whole generation. */
export function createProductInputSnapshot(input: ProductInputSnapshot): ProductInputSnapshot {
  return deepFreeze(structuredClone(input));
}
