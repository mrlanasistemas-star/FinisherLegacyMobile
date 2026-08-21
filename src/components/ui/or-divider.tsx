import { View } from 'react-native';

import { AppText } from '@/components/app-text';

import { colors, spacing } from '@/theme/tokens';

/** "o continúa con" / "o con tu correo" — shared instead of the same three-View block copied per auth screen. */
export function OrDivider({ label }: { label: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <View style={{ flex: 1, height: 1, backgroundColor: colors.border }} />
    </View>
  );
}
