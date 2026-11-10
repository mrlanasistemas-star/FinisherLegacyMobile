import { getRegionalLocale } from '@/i18n';

/** `_minor` amounts from the API are always integer minor units (cents) — never divide/round client-side beyond this formatter. */
/** Numbers follow the app language; the currency is whatever the API says (MXN). */
export function formatMoney(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat(getRegionalLocale(), { style: 'currency', currency }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}
