/** `_minor` amounts from the API are always integer minor units (cents) — never divide/round client-side beyond this formatter. */
export function formatMoney(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}
