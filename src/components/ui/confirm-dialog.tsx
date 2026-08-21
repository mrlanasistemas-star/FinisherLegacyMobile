import { useEffect } from 'react';
import { Modal, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';

import { colors, radius, spacing } from '@/theme/tokens';

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  destructive?: boolean;
  loading?: boolean;
}

/**
 * Branded confirmation for consequential actions (delete medal, logout,
 * delete account) — always states the action, the consequence, and gives
 * an equally prominent way out (AGENTS.md §113).
 */
export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  destructive = true,
  loading = false,
}: ConfirmDialogProps) {
  const scale = useSharedValue(0.94);
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      scale.value = withSpring(1, { damping: 20, stiffness: 260 });
      opacity.value = withTiming(1, { duration: 160 });
    } else {
      scale.value = 0.94;
      opacity.value = 0;
    }
  }, [visible, scale, opacity]);

  const panelStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }], opacity: opacity.value }));

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel} statusBarTranslucent>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,10,12,0.7)', padding: spacing.lg }}>
        <Animated.View
          style={[
            {
              width: '100%',
              maxWidth: 360,
              backgroundColor: colors.graphite,
              borderRadius: radius.xl,
              borderWidth: 1,
              borderColor: colors.border,
              padding: spacing.lg,
              gap: spacing.md,
            },
            panelStyle,
          ]}>
          <View>
            <AppText variant="subtitle">{title}</AppText>
            <AppText variant="body" tone="muted" style={{ marginTop: spacing.xs }}>
              {description}
            </AppText>
          </View>
          <View style={{ gap: spacing.sm }}>
            <AppButton label={confirmLabel} variant={destructive ? 'destructive' : 'primary'} onPress={onConfirm} loading={loading} />
            <AppButton label="Cancelar" variant="ghost" onPress={onCancel} disabled={loading} />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}
