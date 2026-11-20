import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors } from '@/theme/tokens';

/**
 * Bone strip over the status bar for screens whose scroll content starts at
 * `paddingTop: insets.top` with no fixed header: without it the content
 * scrolls under the clock and icons (edge-to-edge Android). Render it as the
 * last child of the screen's root view.
 */
export function StatusBarScrim() {
  const insets = useSafeAreaInsets();

  return <View pointerEvents="none" style={{ position: 'absolute', top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.background }} />;
}
