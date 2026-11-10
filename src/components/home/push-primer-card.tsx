import { BellRing, X } from 'lucide-react-native';
import { View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { IconButton } from '@/components/ui/icon-button';
import { usePushPermission } from '@/hooks/use-push';
import { showToast } from '@/stores/toastStore';
import { useUiStore } from '@/stores/uiStore';
import { colors, radius, spacing } from '@/theme/tokens';

/**
 * Contextual permission ask — explains the value first, and only the
 * button triggers the system dialog. Never shown at launch-time as a
 * modal, never again once dismissed, hidden where push can't work.
 */
export function PushPrimerCard({ message = 'Entérate cuando tu gente te apoye, cuando cambie tu pedido o salgan tus resultados.' }: { message?: string }) {
  const { available, permission, pending, enable } = usePushPermission();
  const dismissed = useUiStore((s) => s.pushPrimerDismissed);
  const dismiss = useUiStore((s) => s.setPushPrimerDismissed);

  if (!available || dismissed || permission !== 'undetermined') return null;

  async function handleEnable() {
    const result = await enable();
    if (result.ok) {
      showToast('Listo. Te avisaremos de lo importante.', 'success');
      dismiss(true);
    } else if (result.reason === 'denied') {
      dismiss(true);
    } else {
      showToast(result.message, 'destructive');
    }
  }

  return (
    <Animated.View
      entering={FadeIn.duration(240)}
      exiting={FadeOut.duration(160)}
      style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.goldWash, alignItems: 'center', justifyContent: 'center' }}>
        <BellRing size={20} color={colors.accent} />
      </View>
      <View style={{ flex: 1, gap: spacing.xs }}>
        <AppText variant="bodyStrong">Activa los avisos</AppText>
        <AppText variant="caption" tone="muted">
          {message}
        </AppText>
        <AppButton label="Activar avisos" size="sm" fullWidth={false} onPress={handleEnable} loading={pending} style={{ alignSelf: 'flex-start', marginTop: spacing.xxs }} />
      </View>
      <IconButton icon={X} label="Ahora no" onPress={() => dismiss(true)} size={18} color={colors.subtle} style={{ marginTop: -8, marginRight: -8 }} />
    </Animated.View>
  );
}
