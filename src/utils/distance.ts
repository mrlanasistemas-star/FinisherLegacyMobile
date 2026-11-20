import { getRegionalLocale } from '@/i18n';

/**
 * Decimal distances come from the API as "5.000" — read in English as five
 * thousand. Shows "5" / "21.097" in the regional format, never zero-padded.
 */
export function formatDistanceValue(value: string | number | null | undefined): string {
  if (value == null) return '';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return new Intl.NumberFormat(getRegionalLocale(), { maximumFractionDigits: 3 }).format(amount);
}
