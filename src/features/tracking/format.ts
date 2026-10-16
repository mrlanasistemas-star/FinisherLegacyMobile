/** "8.42 km" / "640 m" — runner-friendly, es-MX decimal point. */
export function formatDistance(meters: number): string {
  if (!Number.isFinite(meters) || meters < 0) return '0 m';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 100_000 ? 2 : 1)} km`;
}

/** "1:05:09" or "05:09". */
export function formatElapsed(fromIso: string, now: number): string {
  const total = Math.max(0, Math.floor((now - Date.parse(fromIso)) / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** "hace 12 s" / "hace 3 min" — for the last upload. */
export function formatAgo(iso: string | null, now: number): string {
  if (!iso) return 'aún no';
  const seconds = Math.max(0, Math.round((now - Date.parse(iso)) / 1000));
  if (seconds < 5) return 'justo ahora';
  if (seconds < 60) return `hace ${seconds} s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `hace ${minutes} min`;
  return `hace ${Math.round(minutes / 60)} h`;
}
