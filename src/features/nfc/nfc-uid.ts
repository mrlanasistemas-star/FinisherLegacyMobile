/** Chip UID as upper-case hex without separators, or null when unknown. Pure. */
export function normalizeUid(id: unknown): string | null {
  if (Array.isArray(id)) {
    const hex = id
      .filter((b): b is number => typeof b === 'number')
      .map((b) => (b & 0xff).toString(16).padStart(2, '0'))
      .join('');
    return hex.length >= 8 ? hex.toUpperCase() : null;
  }
  if (typeof id !== 'string') return null;
  const hex = id.replace(/[^0-9a-f]/gi, '').toUpperCase();
  return hex.length >= 8 ? hex : null;
}

/** Two UIDs refer to different chips — only decidable when both are known. */
export function uidsDiffer(a: string | null, b: string | null): boolean {
  return a !== null && b !== null && a !== b;
}
