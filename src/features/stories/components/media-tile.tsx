/**
 * One square of a story gallery. Shows a real media item (photo, or a
 * video's poster with a play glyph and its length) with its server state
 * ("Procesando…", failed), or — in the editor — a file that is still on
 * its way up: the local file as an optimistic thumbnail under a progress
 * ring-less bar, with the queue state spelled out.
 */

import { Image } from 'expo-image';
import { CircleAlert, Clock, Play, ShoppingBag } from 'lucide-react-native';
import { ActivityIndicator, View } from 'react-native';

import { AppText } from '@/components/app-text';
import type { StoryMedia } from '@/schemas/story';
import { colors, fontFamily, radius } from '@/theme/tokens';

import { formatDuration } from '../quota';
import type { UploadItem } from '../upload-queue';

const scrim = 'rgba(11,11,12,0.46)';

function Pill({ children }: { children: string }) {
  return (
    <View style={{ paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6, backgroundColor: 'rgba(11,11,12,0.6)' }}>
      <AppText maxFontSizeMultiplier={1.2} style={{ fontFamily: fontFamily.semibold, fontSize: 10.5, color: colors.onDark, fontVariant: ['tabular-nums'] }}>
        {children}
      </AppText>
    </View>
  );
}

function Frame({ size, children, label }: { size: number; children: React.ReactNode; label: string }) {
  return (
    <View
      accessible
      accessibilityRole="image"
      accessibilityLabel={label}
      style={{ width: size, height: size, borderRadius: radius.md, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.surfaceMuted }}>
      {children}
    </View>
  );
}

const fill = { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 } as const;

interface MediaTileProps {
  item: StoryMedia;
  size: number;
  /** Position in the gallery, for screen readers. */
  position?: number;
  /** The local file this item was uploaded from, shown until the server has its own thumbnail. */
  previewUri?: string;
}

export function MediaTile({ item, size, position, previewUri }: MediaTileProps) {
  const isVideo = item.role === 'video';
  const uri = (isVideo ? (item.poster_url ?? item.thumb_url) : (item.thumb_url ?? item.url)) ?? previewUri ?? null;
  const what = isVideo ? 'Video' : 'Foto';
  const state = item.status === 'processing' ? ', procesando' : item.status === 'failed' ? ', no se pudo procesar' : '';

  return (
    <Frame size={size} label={`${what}${position ? ` ${position}` : ''}${state}`}>
      {uri ? <Image source={{ uri }} style={fill} contentFit="cover" transition={180} recyclingKey={item.uuid} accessibilityIgnoresInvertColors /> : null}

      {item.status === 'processing' ? (
        <View style={[fill, { backgroundColor: scrim, alignItems: 'center', justifyContent: 'center', gap: 4 }]}>
          <ActivityIndicator color={colors.onDark} size="small" />
          <AppText maxFontSizeMultiplier={1.2} style={{ fontFamily: fontFamily.semibold, fontSize: 11, color: colors.onDark }}>
            Procesando…
          </AppText>
        </View>
      ) : item.status === 'failed' ? (
        <View style={[fill, { backgroundColor: scrim, alignItems: 'center', justifyContent: 'center', gap: 4, padding: 4 }]}>
          <CircleAlert color={colors.onDark} size={18} />
          <AppText align="center" maxFontSizeMultiplier={1.2} style={{ fontFamily: fontFamily.semibold, fontSize: 11, color: colors.onDark }}>
            No se pudo procesar
          </AppText>
        </View>
      ) : isVideo ? (
        <View style={[fill, { alignItems: 'center', justifyContent: 'center' }]} pointerEvents="none">
          <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: 'rgba(11,11,12,0.55)', alignItems: 'center', justifyContent: 'center', paddingLeft: 2 }}>
            <Play size={15} color={colors.onDark} fill={colors.onDark} />
          </View>
        </View>
      ) : null}

      {isVideo && item.duration_seconds && item.status === 'ready' ? (
        <View style={{ position: 'absolute', right: 5, bottom: 5 }}>
          <Pill>{formatDuration(item.duration_seconds)}</Pill>
        </View>
      ) : null}

      {item.source === 'purchased' ? (
        <View
          accessibilityLabel="Foto comprada"
          style={{ position: 'absolute', left: 5, top: 5, width: 20, height: 20, borderRadius: 10, backgroundColor: 'rgba(11,11,12,0.6)', alignItems: 'center', justifyContent: 'center' }}>
          <ShoppingBag size={11} color={colors.goldSoft} strokeWidth={2.2} />
        </View>
      ) : null}
    </Frame>
  );
}

const UPLOAD_LABEL: Record<UploadItem['status'], string> = {
  queued: 'En espera',
  preparing: 'Preparando…',
  uploading: 'Subiendo',
  done: 'Listo',
  failed: 'No se subió',
  blocked: 'Sin espacio',
};

/** A file still in the upload queue, drawn in the gallery where it will land. */
export function UploadTile({ item, size }: { item: UploadItem; size: number }) {
  const trouble = item.status === 'failed' || item.status === 'blocked';
  const label = item.status === 'uploading' ? `${item.progress}%` : UPLOAD_LABEL[item.status];

  return (
    <Frame size={size} label={`${item.role === 'video' ? 'Video' : 'Foto'}: ${UPLOAD_LABEL[item.status]}${item.status === 'uploading' ? ` ${item.progress} por ciento` : ''}`}>
      {/* expo-image renders a frame for local videos too, so both kinds get a real thumbnail. */}
      <Image source={{ uri: item.localUri }} style={fill} contentFit="cover" accessibilityIgnoresInvertColors />
      <View style={[fill, { backgroundColor: scrim, alignItems: 'center', justifyContent: 'center', gap: 3, padding: 4 }]}>
        {trouble ? <CircleAlert color={colors.onDark} size={18} /> : item.status === 'queued' ? <Clock color={colors.onDark} size={16} /> : item.status === 'preparing' ? <ActivityIndicator color={colors.onDark} size="small" /> : null}
        <AppText
          align="center"
          maxFontSizeMultiplier={1.2}
          style={{ fontFamily: item.status === 'uploading' ? fontFamily.bold : fontFamily.semibold, fontSize: item.status === 'uploading' ? 15 : 11, color: colors.onDark, fontVariant: ['tabular-nums'] }}>
          {label}
        </AppText>
      </View>
      {item.status === 'uploading' ? (
        <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 3, backgroundColor: 'rgba(248,247,243,0.28)' }}>
          <View style={{ width: `${item.progress}%`, height: '100%', backgroundColor: colors.gold }} />
        </View>
      ) : null}
    </Frame>
  );
}
