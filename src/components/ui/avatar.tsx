import { Image } from 'expo-image';
import { View, type ViewStyle } from 'react-native';

import { AppText } from '@/components/app-text';
import { colors, fontFamily } from '@/theme/tokens';

interface AvatarProps {
  uri: string | null | undefined;
  name?: string | null;
  size?: number;
  /** Gold ring — own profile / hero contexts only. */
  ring?: boolean;
  style?: ViewStyle;
}

function initials(name: string | null | undefined): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? '').slice(0, 2);
  return letters.toUpperCase() || 'FL';
}

/** Circular photo with an initials fallback — never an empty grey disc. */
export function Avatar({ uri, name, size = 40, ring = false, style }: AvatarProps) {
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          overflow: 'hidden',
          backgroundColor: colors.graphiteLight,
          alignItems: 'center',
          justifyContent: 'center',
          borderWidth: ring ? 2 : 0,
          borderColor: colors.gold,
        },
        style,
      ]}>
      {uri ? (
        <Image source={{ uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} cachePolicy="memory-disk" />
      ) : (
        <AppText style={{ fontFamily: fontFamily.semibold, fontSize: Math.max(11, size * 0.36), color: colors.goldSoft }}>
          {initials(name)}
        </AppText>
      )}
    </View>
  );
}
