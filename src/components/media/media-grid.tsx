import { Image } from 'expo-image';
import { Lock, Play } from 'lucide-react-native';
import { View } from 'react-native';

import { PressScale } from '@/components/motion/press-scale';
import { colors, radius, spacing } from '@/theme/tokens';
import type { AthleteEventMedia } from '@/types/models';

const COLUMNS = 3;
const GAP = spacing.xs;

export function MediaGrid({ items, onPress }: { items: AthleteEventMedia[]; onPress: (index: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: GAP }}>
      {items.map((item, index) => {
        const tileWidth = `${100 / COLUMNS}%` as const;
        return (
          <View key={item.uuid} style={{ width: tileWidth, aspectRatio: 1, padding: GAP / 2 }}>
            <PressScale onPress={() => onPress(index)} haptic style={{ flex: 1 }}>
              <View style={{ flex: 1, borderRadius: radius.sm, overflow: 'hidden', backgroundColor: colors.graphiteLight }}>
                {/* No poster/thumbnail field exists for video (confirmed —
                    backend has no thumbnail generation yet, see
                    docs/MOBILE_BACKEND_REQUIREMENTS.md), so video tiles show
                    a plain placeholder + play icon rather than trying to
                    decode a video URL as a static image. */}
                {item.type === 'image' ? (
                  <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
                ) : null}
                {item.type === 'video' ? (
                  <View
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: 'rgba(10,10,12,0.25)',
                    }}>
                    <View
                      style={{
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: 'rgba(10,10,12,0.55)',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                      <Play color={colors.white} size={14} fill={colors.white} />
                    </View>
                  </View>
                ) : null}
                {!item.is_public ? (
                  <View style={{ position: 'absolute', top: 4, right: 4 }}>
                    <Lock color={colors.white} size={12} />
                  </View>
                ) : null}
              </View>
            </PressScale>
          </View>
        );
      })}
    </View>
  );
}
