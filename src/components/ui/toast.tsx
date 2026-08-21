import { CheckCircle2, TriangleAlert } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { GlassSurface } from '@/components/brand/glass-surface';

import { useToastStore, type ToastTone } from '@/stores/toastStore';
import { colors, radius, spacing } from '@/theme/tokens';

const AUTO_DISMISS_MS = 2600;

const ICONS: Record<ToastTone, typeof CheckCircle2 | null> = {
  default: null,
  success: CheckCircle2,
  destructive: TriangleAlert,
};

const ICON_COLORS: Record<ToastTone, string> = {
  default: colors.foreground,
  success: colors.gold,
  destructive: colors.destructive,
};

/** Mounted once at the root — a single toast at a time, auto-dismissing (AGENTS.md §114). */
export function ToastHost() {
  const toast = useToastStore((state) => state.toast);
  const dismiss = useToastStore((state) => state.dismiss);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast, dismiss]);

  if (!toast) return null;

  const Icon = ICONS[toast.tone];

  return (
    <Animated.View
      entering={FadeInDown.duration(220)}
      exiting={FadeOutDown.duration(180)}
      pointerEvents="none"
      style={{ position: 'absolute', left: spacing.lg, right: spacing.lg, bottom: insets.bottom + spacing.md }}>
      <GlassSurface rounded={false} intensity={60} style={{ borderRadius: radius.lg }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingVertical: spacing.sm, paddingHorizontal: spacing.md }}>
          {Icon ? <Icon color={ICON_COLORS[toast.tone]} size={18} /> : null}
          <AppText variant="bodyStrong" style={{ flex: 1 }}>
            {toast.message}
          </AppText>
        </View>
      </GlassSurface>
    </Animated.View>
  );
}
