/**
 * One PIN step (title, hint, dots + keypad, error, continue). Used by the
 * unlock screen and by every create / change / recover / disable step.
 * The typed digits stay in this component's state only.
 */

import { Lock } from 'lucide-react-native';
import { useState, type ReactNode } from 'react';
import { View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { PinPad } from '@/components/pin/pin-pad';
import { useI18n } from '@/i18n';
import { colors, fontFamily, spacing } from '@/theme/tokens';

export const PIN_MIN = 4;
export const PIN_MAX = 6;

interface PinEntryProps {
  title: string;
  hint?: string | null;
  error?: string | null;
  submitLabel?: string;
  loading?: boolean;
  /** Seconds of lockout left — the keypad is disabled while > 0. */
  lockedSeconds?: number;
  lockedLabel?: string;
  onSubmit: (pin: string) => void | Promise<void>;
  footer?: ReactNode;
}

export function PinEntry({ title, hint, error, submitLabel, loading = false, lockedSeconds = 0, lockedLabel, onSubmit, footer }: PinEntryProps) {
  const { t } = useI18n();
  const [pin, setPin] = useState('');
  const locked = lockedSeconds > 0;

  async function submit() {
    if (pin.length < PIN_MIN || loading || locked) return;
    const value = pin;
    // Clear right away: the digits never outlive the request.
    setPin('');
    await onSubmit(value);
  }

  return (
    <View style={{ alignItems: 'center', gap: spacing.lg }}>
      <View style={{ alignItems: 'center', gap: spacing.xs }}>
        <View style={{ width: 52, height: 52, borderRadius: 26, backgroundColor: colors.goldWash, alignItems: 'center', justifyContent: 'center' }}>
          <Lock size={22} color={colors.accent} strokeWidth={2} />
        </View>
        <AppText accessibilityRole="header" align="center" style={{ fontFamily: fontFamily.heading, fontSize: 22, color: colors.foreground }}>
          {title}
        </AppText>
        {hint ? (
          <AppText variant="body" tone="muted" align="center" style={{ maxWidth: 320 }}>
            {hint}
          </AppText>
        ) : null}
      </View>

      <PinPad value={pin} onChange={setPin} maxLength={PIN_MAX} disabled={loading || locked} error={!!error && pin.length === 0} />

      <View style={{ minHeight: 22, alignItems: 'center' }} accessibilityLiveRegion="polite">
        {locked ? (
          <AppText variant="caption" tone="destructive" align="center">
            {lockedLabel}
          </AppText>
        ) : error ? (
          <AppText variant="caption" tone="destructive" align="center" style={{ maxWidth: 320 }}>
            {error}
          </AppText>
        ) : null}
      </View>

      <View style={{ width: '100%', maxWidth: 360, gap: spacing.xs }}>
        <AppButton label={submitLabel ?? t('Continuar')} size="md" loading={loading} disabled={pin.length < PIN_MIN || locked} onPress={submit} />
        {footer}
      </View>
    </View>
  );
}
