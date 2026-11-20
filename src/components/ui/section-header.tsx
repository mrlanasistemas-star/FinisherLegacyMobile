import { ChevronRight } from 'lucide-react-native';
import { View, type ViewStyle } from 'react-native';

import { PressableScale } from '@/components/motion/pressable-scale';
import { AppText } from '@/components/app-text';
import { colors, fontFamily, spacing } from '@/theme/tokens';

interface SectionHeaderProps {
  title: string;
  actionLabel?: string;
  onAction?: () => void;
  style?: ViewStyle;
}

/** Editorial section title with an optional "Ver todo" — no box around the section. */
export function SectionHeader({ title, actionLabel, onAction, style }: SectionHeaderProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }, style]}>
      {/* flex:1 gives the title every pixel the action doesn't use — long English titles wrap instead of clipping. */}
      <AppText accessibilityRole="header" style={{ flex: 1, fontFamily: fontFamily.heading, fontSize: 20, letterSpacing: -0.2 }}>
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <PressableScale
          dim
          scaleTo={0.98}
          onPress={onAction}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}: ${title}`}
          style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44, flexShrink: 0 }}>
          <AppText variant="caption" tone="gold">
            {actionLabel}
          </AppText>
          <ChevronRight size={16} color={colors.accent} />
        </PressableScale>
      ) : null}
    </View>
  );
}
