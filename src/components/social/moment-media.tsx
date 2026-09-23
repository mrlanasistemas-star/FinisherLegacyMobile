import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Play } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Pressable, View, useWindowDimensions } from 'react-native';

import { colors } from '@/theme/tokens';
import type { MomentMedia } from '@/types/social';

interface MomentMediaProps {
  media: MomentMedia[];
  /** Horizontal inset of the parent — the pager is full-bleed within it. */
  width?: number;
  /** Feed: videos show a play tile and open the detail (no autoplay). Detail: inline player. */
  interactiveVideo?: boolean;
  onOpen?: () => void;
}

function aspectFor(item: MomentMedia): number {
  if (item.width && item.height) return Math.min(Math.max(item.width / item.height, 4 / 5), 16 / 9);
  return 4 / 5;
}

/**
 * Full-bleed media with swipe + dots. Only one video can ever play (the
 * one the athlete tapped) — feeds never autoplay.
 */
export function MomentMediaPager({ media, width: widthProp, interactiveVideo = false, onOpen }: MomentMediaProps) {
  const { width: screenWidth } = useWindowDimensions();
  const width = widthProp ?? screenWidth;
  const [index, setIndex] = useState(0);

  if (media.length === 0) return null;
  const aspect = aspectFor(media[0]);
  const height = Math.round(width / aspect);

  return (
    <View style={{ width, height, backgroundColor: colors.graphite }}>
      <FlatList
        data={media}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, i) => `${item.url}-${i}`}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width, height }}>
            {item.type === 'video' ? (
              interactiveVideo ? (
                <InlineVideo url={item.url} />
              ) : (
                <Pressable onPress={onOpen} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Ver video">
                  <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(10,10,12,0.6)', alignItems: 'center', justifyContent: 'center' }}>
                    <Play size={24} color={colors.white} fill={colors.white} />
                  </View>
                </Pressable>
              )
            ) : (
              <Pressable onPress={onOpen} disabled={!onOpen} style={{ flex: 1 }} accessibilityRole="imagebutton" accessibilityLabel="Foto del momento">
                <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={180} cachePolicy="memory-disk" recyclingKey={item.url} />
              </Pressable>
            )}
          </View>
        )}
      />
      {media.length > 1 ? (
        <View style={{ position: 'absolute', bottom: 10, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }} pointerEvents="none">
          {media.map((item, i) => (
            <View key={`${item.url}-dot-${i}`} style={{ width: i === index ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === index ? colors.gold : 'rgba(255,255,255,0.45)' }} />
          ))}
        </View>
      ) : null}
    </View>
  );
}

function InlineVideo({ url }: { url: string }) {
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(playing ? url : null, (instance) => {
    instance.loop = false;
    instance.play();
  });

  if (!playing) {
    return (
      <Pressable onPress={() => setPlaying(true)} style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }} accessibilityRole="button" accessibilityLabel="Reproducir video">
        <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(10,10,12,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <Play size={28} color={colors.white} fill={colors.white} />
        </View>
      </Pressable>
    );
  }

  return <VideoView player={player} style={{ flex: 1 }} contentFit="contain" nativeControls />;
}
