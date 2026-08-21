/**
 * Thin logging layer. In production this stays silent for anything that
 * could leak sensitive data (tokens, request bodies) — swap the `error`
 * implementation for a crash-reporting SDK later without touching callers.
 */
export const logger = {
  debug: (...args: unknown[]) => {
    if (__DEV__) console.log('[FL]', ...args);
  },
  warn: (...args: unknown[]) => {
    if (__DEV__) console.warn('[FL]', ...args);
  },
  error: (...args: unknown[]) => {
    if (__DEV__) console.error('[FL]', ...args);
  },
};
