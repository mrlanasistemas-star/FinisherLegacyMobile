import type { Translate } from '@/i18n';
import type { NfcResolution, NfcTargetType } from '@/types/nfc';

/**
 * Where a claimed tag lands inside the app (pure, unit-tested). `null`
 * means there is no native screen for it (or it needs a session the
 * viewer doesn't have) — the NFC screen then shows the reveal card with a
 * "Ver en la web" fallback instead of navigating.
 */
export function nfcInAppHref(resolution: NfcResolution, authenticated: boolean): string | null {
  const target = resolution.target;
  if (resolution.status !== 'claimed' || !target || !authenticated) return null;

  if (target.type === 'event' && target.event_slug) return `/events/${target.event_slug}`;
  if (target.type === 'product' && resolution.owned_by_me) return '/gear';
  if ((target.type === 'profile' || target.type === 'legacy_plate' || target.type === 'product') && target.profile_username) {
    return `/athlete/${target.profile_username}`;
  }
  return null;
}

/** Human label for the kind of thing the athlete just tapped — never "tag", "asset" or "UID". */
export function nfcTargetLabel(type: NfcTargetType, t: Translate): string {
  switch (type) {
    case 'legacy_plate':
      return 'Legacy Plate'; // product name: never translated
    case 'product':
      return t('Producto conectado');
    case 'profile':
      return t('Perfil de atleta');
    case 'event':
      return t('Evento');
  }
}
