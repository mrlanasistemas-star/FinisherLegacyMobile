/**
 * Live tracking is offered from the day before the race onwards (or when
 * the date is unknown). Past races never show "Iniciar seguimiento" — an
 * already-running session is reachable from its own card regardless.
 */
export function canOfferLiveTracking(eventDate: string | null | undefined, now: Date = new Date()): boolean {
  if (!eventDate) return true;
  const date = Date.parse(eventDate.length === 10 ? `${eventDate}T23:59:59` : eventDate);
  if (!Number.isFinite(date)) return true;
  const DAY = 86_400_000;
  // Until the end of the race day + 1 day (multi-day / late finishes).
  return now.getTime() <= date + DAY;
}
