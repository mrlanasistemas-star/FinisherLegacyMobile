/**
 * What a PIN-protected item looks like while locked: no image, no text —
 * a lock, one line and "Desbloquear". `LockBadge` marks protected items
 * in lists (locked or currently unlocked).
 */

import { Lock } from 'lucide-react-native';
import { useEffect } from 'react';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { openContentUnlock } from '@/features/content-pin/use-content-pin';
import { useI18n } from '@/i18n';
import { useIsContentUnlocked } from '@/stores/contentPinStore';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';

interface ContentLockedProps {
  title?: string;
  message?: string;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function ContentLocked({ title, message, compact = false, style }: ContentLockedProps) {
  const { t } = useI18n();

  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          gap: compact ? spacing.xs : spacing.sm,
          padding: compact ? spacing.md : spacing.xl,
          borderRadius: radius.xl,
          borderCurve: 'continuous',
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.hairline,
        },
        style,
      ]}>
      <View style={{ width: compact ? 40 : 56, height: compact ? 40 : 56, borderRadius: 28, backgroundColor: colors.goldWash, alignItems: 'center', justifyContent: 'center' }}>
        <Lock size={compact ? 18 : 24} color={colors.accent} strokeWidth={2} />
      </View>
      <AppText align="center" style={{ fontFamily: fontFamily.heading, fontSize: compact ? 16 : 20, color: colors.foreground }}>
        {title ?? t('Contenido protegido')}
      </AppText>
      <AppText variant="body" tone="muted" align="center" style={{ maxWidth: 320 }}>
        {message ?? t('Escribe tu NIP para verlo. Nadie más puede abrirlo.')}
      </AppText>
      <AppButton label={t('Desbloquear')} size="sm" onPress={openContentUnlock} />
    </View>
  );
}

/**
 * Full-screen body for a sub-screen whose data came back 423 CONTENT_LOCKED:
 * the gate centered under the screen's own top bar. After "Desbloquear" the
 * grant invalidates every query (stores/contentPinStore.ts) and `onUnlocked`
 * refetches this screen's data explicitly, so it reopens with the content.
 */
export function ContentLockedBody({ title, message, onUnlocked }: { title?: string; message?: string; onUnlocked?: () => unknown }) {
  const insets = useSafeAreaInsets();
  const unlocked = useIsContentUnlocked();

  useEffect(() => {
    if (unlocked && onUnlocked) void onUnlocked();
  }, [unlocked, onUnlocked]);

  return (
    <View style={{ flex: 1, justifyContent: 'center', paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xl }}>
      <ContentLocked title={title} message={message} />
    </View>
  );
}

export function LockBadge({ onDark = false }: { onDark?: boolean }) {
  const { t } = useI18n();
  return (
    <View
      accessible
      accessibilityLabel={t('Protegido con NIP')}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: radius.pill,
        backgroundColor: onDark ? 'rgba(11,11,12,0.55)' : colors.goldWash,
      }}>
      <Lock size={11} color={onDark ? colors.goldSoft : colors.accent} strokeWidth={2.4} />
      <AppText maxFontSizeMultiplier={1.2} style={{ fontFamily: fontFamily.semibold, fontSize: 11, color: onDark ? colors.goldSoft : colors.accent }}>
        {t('NIP')}
      </AppText>
    </View>
  );
}
