import { getRegionalLocale } from '@/i18n';

/** Currencies written with "$". Any other one shows only its code. */
const DOLLAR_SIGN = new Set(['MXN', 'USD', 'CAD', 'ARS', 'CLP', 'COP']);

/**
 * `_minor` amounts from the API are always integer minor units (cents) — never divide/round client-side beyond this formatter.
 *
 * Always "$1,200.00 MXN": the digits follow the app language, the currency is whatever the API says and its ISO code always
 * follows the amount — "$" alone reads as US dollars in English, and `Intl` would write "MX$" there.
 */
export function formatMoney(amountMinor: number, currency: string): string {
  const code = currency.toUpperCase();
  const amount = Math.abs(amountMinor) / 100;
  const sign = amountMinor < 0 ? '-' : '';
  const symbol = DOLLAR_SIGN.has(code) ? '$' : '';

  try {
    const digits = new Intl.NumberFormat(getRegionalLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(amount);

    return `${sign}${symbol}${digits} ${code}`;
  } catch {
    return `${sign}${symbol}${amount.toFixed(2)} ${code}`;
  }
}
