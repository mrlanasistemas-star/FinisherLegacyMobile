import { ChevronRight } from 'lucide-react-native';
import { Pressable, View, type ViewStyle } from 'react-native';

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
    <View style={[{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.sm }, style]}>
      <AppText accessibilityRole="header" style={{ fontFamily: fontFamily.semibold, fontSize: 19 }}>
        {title}
      </AppText>
      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel={`${actionLabel}: ${title}`}
          style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', opacity: pressed ? 0.6 : 1, minHeight: 44 })}>
          <AppText variant="caption" tone="gold">
            {actionLabel}
          </AppText>
          <ChevronRight size={16} color={colors.gold} />
        </Pressable>
      ) : null}
    </View>
  );
}
