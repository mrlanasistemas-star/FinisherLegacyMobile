import type { ReactNode } from 'react';
import { View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';

import { spacing } from '@/theme/tokens';

interface SectionTitleProps {
  eyebrow?: string;
  title: string;
  trailing?: ReactNode;
  style?: ViewStyle;
}

/** Editorial section header — small gold eyebrow + a large title, used to break sections instead of another Card. */
export function SectionTitle({ eyebrow, title, trailing, style }: SectionTitleProps) {
  return (
    <View style={[{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }, style]}>
      <View style={{ flex: 1 }}>
        {eyebrow ? (
          <AppText variant="label" tone="gold" style={{ marginBottom: spacing.xxs }}>
            {eyebrow.toUpperCase()}
          </AppText>
        ) : null}
        <AppText variant="title">{title}</AppText>
      </View>
      {trailing}
    </View>
  );
}
