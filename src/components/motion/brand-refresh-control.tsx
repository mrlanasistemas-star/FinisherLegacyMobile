import { RefreshControl, type RefreshControlProps } from 'react-native';

import { colors } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

/**
 * Pull-to-refresh in brand colors (gold spinner on a white puck on Android,
 * deep-gold spinner on iOS) with a selection tick when the pull commits.
 * Drop-in for RefreshControl — forwards every prop, including the
 * children/style ScrollView injects on Android.
 */
export function BrandRefreshControl({ onRefresh, ...props }: RefreshControlProps) {
  return (
    <RefreshControl
      tintColor={colors.accent}
      colors={[colors.accent, colors.gold]}
      progressBackgroundColor={colors.card}
      {...props}
      onRefresh={
        onRefresh
          ? () => {
              haptics.selection();
              onRefresh();
            }
          : undefined
      }
    />
  );
}
