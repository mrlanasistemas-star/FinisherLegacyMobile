import type { LucideIcon } from 'lucide-react-native';
import { View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeIn, ZoomIn, useReducedMotion } from 'react-native-reanimated';

import { AppButton } from './app-button';
import { AppText } from './app-text';

import { colors, spacing } from '@/theme/tokens';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  message: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  /** Tighter vertical rhythm for inline sections (not full screens). */
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}

/**
 * Every empty screen says what this place is for and offers the next useful
 * step — never a bare "no data". The icon medallion springs in once.
 */
export function EmptyState({
  icon: Icon,
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  compact = false,
  style,
}: EmptyStateProps) {
  const reduceMotion = useReducedMotion();
  const size = compact ? 60 : 84;

  return (
    <View
      style={[
        { alignItems: 'center', paddingVertical: compact ? spacing.lg : spacing.xxl, paddingHorizontal: spacing.lg, gap: spacing.sm },
        style,
      ]}>
      <Animated.View
        entering={reduceMotion ? FadeIn : ZoomIn.springify().damping(14)}
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: spacing.xs,
        }}>
        <View
          style={{
            position: 'absolute',
            width: size - 14,
            height: size - 14,
            borderRadius: (size - 14) / 2,
            backgroundColor: colors.goldWash,
          }}
        />
        <Icon size={compact ? 24 : 32} color={colors.accent} strokeWidth={1.6} />
      </Animated.View>
      <AppText variant="subtitle" align="center" accessibilityRole="header">
        {title}
      </AppText>
      <AppText variant="body" tone="muted" align="center" style={{ maxWidth: 320 }}>
        {message}
      </AppText>
      {actionLabel && onAction ? (
        <AppButton label={actionLabel} onPress={onAction} size="md" fullWidth={false} style={{ marginTop: spacing.xs, minWidth: 200, alignSelf: 'center' }} />
      ) : null}
      {secondaryLabel && onSecondary ? (
        <AppButton label={secondaryLabel} onPress={onSecondary} size="md" variant="ghost" fullWidth={false} style={{ alignSelf: 'center' }} />
      ) : null}
    </View>
  );
}
