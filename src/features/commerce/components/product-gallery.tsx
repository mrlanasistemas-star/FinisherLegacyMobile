import { Image } from 'expo-image';
import { useVideoPlayer, VideoView } from 'expo-video';
import { Box, Maximize2, Play, ShoppingBag, X } from 'lucide-react-native';
import { useState } from 'react';
import { FlatList, Modal, Pressable, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppText } from '@/components/app-text';
import { IconButton } from '@/components/ui/icon-button';
import { useI18n } from '@/i18n';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { ProductGalleryItem } from '@/types/models';

import { Product3DViewer } from './product-3d-viewer';
import { ZoomableProductImage } from './zoomable-product-image';

interface ProductGalleryProps {
  items: ProductGalleryItem[];
  productName: string;
  width: number;
  height: number;
  webUrl: string;
}

/**
 * Hero media: swipe between photos, video and the 3D model. Photos open a
 * full-screen pinch-zoom viewer; video plays only on tap (no autoplay
 * data cost); the 3D model loads only when asked for.
 */
export function ProductGallery({ items, productName, width, height, webUrl }: ProductGalleryProps) {
  const { t } = useI18n();
  const [index, setIndex] = useState(0);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [model, setModel] = useState<ProductGalleryItem | null>(null);
  const images = items.filter((item) => item.type === 'image');

  if (items.length === 0) {
    return (
      <View style={{ width, height, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceMuted }}>
        <ShoppingBag size={48} color={colors.accent} strokeWidth={1.4} />
      </View>
    );
  }

  return (
    <View style={{ width, height, backgroundColor: colors.surfaceMuted }}>
      <FlatList
        data={items}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(item, i) => `${item.type}-${item.url}-${i}`}
        onMomentumScrollEnd={(event) => setIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
        renderItem={({ item }) => (
          <View style={{ width, height }}>
            {item.type === 'video' ? (
              <GalleryVideo item={item} />
            ) : item.type === 'model_3d' ? (
              <ModelTile item={item} onOpen={() => setModel(item)} />
            ) : (
              <Pressable
                onPress={() => setViewerIndex(Math.max(0, images.indexOf(item)))}
                accessibilityRole="imagebutton"
                accessibilityLabel={t('{name}. Toca para ver en pantalla completa', { name: item.alt_text ?? productName })}
                style={{ flex: 1 }}>
                <Image source={{ uri: item.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} cachePolicy="memory-disk" />
              </Pressable>
            )}
          </View>
        )}
      />

      {items.length > 1 ? (
        <View style={{ position: 'absolute', bottom: 14, left: 0, right: 0, flexDirection: 'row', justifyContent: 'center', gap: 6 }} pointerEvents="none">
          {items.map((item, i) => (
            <View
              key={`${item.url}-dot-${i}`}
              style={{ width: i === index ? 18 : 6, height: 6, borderRadius: 3, backgroundColor: i === index ? colors.gold : 'rgba(255,255,255,0.5)' }}
            />
          ))}
        </View>
      ) : null}

      {items.some((item) => item.type === 'model_3d') && items[index]?.type !== 'model_3d' ? (
        <Pressable
          onPress={() => setModel(items.find((item) => item.type === 'model_3d') ?? null)}
          accessibilityRole="button"
          accessibilityLabel={t('Ver producto en 3D')}
          style={{ position: 'absolute', right: spacing.md, bottom: 36, minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, borderRadius: 22, backgroundColor: 'rgba(11,11,12,0.72)', borderWidth: 1, borderColor: 'rgba(201,174,139,0.5)' }}>
          <Box size={16} color={colors.goldSoft} />
          <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: colors.onDark }}>3D</AppText>
        </Pressable>
      ) : null}

      {viewerIndex !== null ? <ImageViewer key={viewerIndex} images={images} startIndex={viewerIndex} onClose={() => setViewerIndex(null)} productName={productName} /> : null}

      {model ? (
        <Product3DViewer visible onClose={() => setModel(null)} modelUrl={model.url} posterUrl={model.poster_url} productName={productName} webUrl={webUrl} />
      ) : null}
    </View>
  );
}

function ModelTile({ item, onOpen }: { item: ProductGalleryItem; onOpen: () => void }) {
  const { t } = useI18n();
  return (
    <Pressable onPress={onOpen} accessibilityRole="button" accessibilityLabel={t('Ver producto en 3D')} style={{ flex: 1 }}>
      {item.poster_url ? <Image source={{ uri: item.poster_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: spacing.sm }}>
        <View style={{ width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(11,11,12,0.66)', borderWidth: 1, borderColor: colors.goldDim }}>
          <Box size={30} color={colors.goldSoft} />
        </View>
        <AppText style={{ fontFamily: fontFamily.semibold, color: colors.foreground }}>{t('Ver en 3D')}</AppText>
      </View>
    </Pressable>
  );
}

function GalleryVideo({ item }: { item: ProductGalleryItem }) {
  const { t } = useI18n();
  const [playing, setPlaying] = useState(false);
  const player = useVideoPlayer(playing ? item.url : null, (instance) => {
    instance.loop = true;
    instance.play();
  });

  if (!playing) {
    return (
      <Pressable onPress={() => setPlaying(true)} style={{ width: '100%', height: '100%' }} accessibilityRole="button" accessibilityLabel={t('Reproducir video del producto')}>
        {item.poster_url ? <Image source={{ uri: item.poster_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" /> : null}
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(11,11,12,0.6)', alignItems: 'center', justifyContent: 'center' }}>
            <Play color={colors.white} size={26} fill={colors.white} />
          </View>
        </View>
      </Pressable>
    );
  }

  return <VideoView player={player} style={{ width: '100%', height: '100%' }} contentFit="cover" nativeControls />;
}

function ImageViewer({ images, startIndex, onClose, productName }: { images: ProductGalleryItem[]; startIndex: number; onClose: () => void; productName: string }) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [current, setCurrent] = useState(startIndex);
  const [zoomed, setZoomed] = useState(false);

  return (
    <Modal visible animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      {/* Modals render outside the app root on Android — gestures need their own root. */}
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }} onLayout={(event) => setSize(event.nativeEvent.layout)}>
        {size.width > 0 ? (
          <FlatList
            data={images}
            horizontal
            pagingEnabled
            scrollEnabled={!zoomed}
            initialScrollIndex={startIndex}
            getItemLayout={(_, i) => ({ length: size.width, offset: size.width * i, index: i })}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, i) => `${item.url}-${i}`}
            onMomentumScrollEnd={(event) => {
              setCurrent(Math.round(event.nativeEvent.contentOffset.x / size.width));
              setZoomed(false);
            }}
            renderItem={({ item, index }) => (
              <ZoomableProductImage
                url={item.url}
                alt={item.alt_text ?? productName}
                width={size.width}
                height={size.height}
                active={index === current}
                onZoomChange={setZoomed}
              />
            )}
          />
        ) : null}

        <View style={{ position: 'absolute', top: insets.top + spacing.xs, left: spacing.sm, right: spacing.lg, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <IconButton icon={X} label={t('Cerrar')} onPress={onClose} filled />
          {images.length > 1 ? (
            <AppText variant="caption" tone="muted">
              {current + 1} / {images.length}
            </AppText>
          ) : (
            <Maximize2 size={16} color={colors.subtle} />
          )}
        </View>
      </GestureHandlerRootView>
    </Modal>
  );
}
