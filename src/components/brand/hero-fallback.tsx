import { Image } from 'expo-image';
import { View } from 'react-native';

import { GoldGlow } from './gold-glow';
import { MetricNumber } from './metric-number';

import { colors } from '@/theme/tokens';

interface HeroFallbackProps {
  metric?: string;
  showMark?: boolean;
}

/**
 * Decorative hero background for when there's no video/photo asset —
 * brand black, a soft gold glow, and a giant decorative numeral bleeding
 * off-frame (AGENTS.md §15: purely decorative, never mistaken for a real
 * stat). Used until real hero photography/video is available.
 */
export function HeroFallback({ metric = '42.195', showMark = true }: HeroFallbackProps) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.black, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
      <GoldGlow size={340} style={{ position: 'absolute', top: '10%' }} />
      <View style={{ position: 'absolute', right: -24, bottom: '8%' }}>
        <MetricNumber value={metric} decorative size={110} />
      </View>
      {showMark ? (
        <Image
          source={require('@/assets/images/brand/logo-mark-gold.png')}
          style={{ width: 96, height: 46 }}
          contentFit="contain"
        />
      ) : null}
    </View>
  );
}
