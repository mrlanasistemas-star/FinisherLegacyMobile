import { View, type ViewStyle } from 'react-native';

import { colors } from '@/theme/tokens';

interface SeparatorProps {
  style?: ViewStyle;
  inset?: number;
}

/** A subtle 1px line to structure sections without reaching for another Card (AGENTS.md §139). */
export function Separator({ style, inset = 0 }: SeparatorProps) {
  return <View style={[{ height: 1, backgroundColor: colors.border, marginLeft: inset }, style]} />;
}
