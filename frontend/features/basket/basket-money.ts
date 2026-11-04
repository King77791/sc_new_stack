import type { IssueCode, Money } from './basket-pricing.types';

export function moneyIssue(value: unknown, unit = false): IssueCode | undefined {
  if (!value || typeof value !== 'object') return 'invalid-pricing-data';
  const money = value as Record<string, unknown>;
  if (money.currency !== 'RUB') return 'incompatible-currency';
  if (typeof money.minor !== 'number' || !Number.isSafeInteger(money.minor)
    || money.minor < (unit ? 1 : 0)) return 'invalid-pricing-data';
}

/** Undefined is overflow, never a zero fallback. Operands are validated at the input boundary. */
export function checkedMinor(value: bigint): number | undefined {
  if (value < BigInt(0) || value > BigInt(Number.MAX_SAFE_INTEGER)) return undefined;
  return Number(value);
}

export function rub(minor: number): Money { return { currency: 'RUB', minor }; }

export function formatBasketMoney(value: Money): string {
  if (moneyIssue(value)) throw new RangeError('Invalid RUB money');
  const minor = BigInt(value.minor), hundred = BigInt(100);
  const whole = (minor / hundred).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const cents = minor % hundred;
  return `${whole}${cents ? `,${cents.toString().padStart(2, '0')}` : ''} ₽`;
}
