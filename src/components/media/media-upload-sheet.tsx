import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Camera, ImagePlus, Video } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { EVENT_MEDIA_LIMITS } from '@/api/eventMedia';
import { AppError } from '@/api/errors';
import { useUploadEventMedia } from '@/hooks/use-event-media';
import { Sheet } from '@/components/ui/sheet';
import { SheetActionRow } from '@/components/ui/sheet-action-row';
import { colors, radius, spacing } from '@/theme/tokens';
import { compressImage } from '@/utils/image-compress';
import { showToast } from '@/stores/toastStore';

interface PickedAsset {
  kind: 'image' | 'video';
  uri: string;
  name: string;
  type: string;
  width: number;
  height: number;
  fileSize: number | null;
}

interface MediaUploadSheetProps {
  visible: boolean;
  onClose: () => void;
  participantId: number | null;
  remainingImages: number;
  remainingVideos: number;
  onLimitReached: () => void;
}

const SUCCESS_MESSAGE: Record<'image' | 'video', string> = {
  image: 'Ese momento ya forma parte de tu Legacy.',
  video: 'Ahora puedes volver a vivir esa meta.',
};

export function MediaUploadSheet({
  visible,
  onClose,
  participantId,
  remainingImages,
  remainingVideos,
  onLimitReached,
}: MediaUploadSheetProps) {
  const [asset, setAsset] = useState<PickedAsset | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const upload = useUploadEventMedia(participantId);

  function reset() {
    setAsset(null);
    setProgress(0);
    setError(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function pick(source: 'camera' | 'library-image' | 'library-video') {
    setError(null);

    if (source !== 'library-video' && remainingImages <= 0) {
      close();
      onLimitReached();
      return;
    }
    if (source === 'library-video' && remainingVideos <= 0) {
      close();
      onLimitReached();
      return;
    }

    const permission =
      source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Necesitamos tu permiso para continuar.');
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({
            mediaTypes: source === 'library-video' ? ['videos'] : ['images'],
            quality: 1,
          });

    if (result.canceled || !result.assets[0]) return;

    const picked = result.assets[0];
    const kind: 'image' | 'video' = source === 'library-video' ? 'video' : 'image';

    if (kind === 'image') {
      if (picked.fileSize && picked.fileSize > EVENT_MEDIA_LIMITS.maxImageBytes * 3) {
        // Only warn before compression on truly oversized originals — most
        // camera photos compress well under the limit anyway.
        setError('Esta imagen es muy pesada. Intenta con otra.');
        return;
      }
      const compressed = await compressImage(picked.uri, picked.width, picked.height);
      setAsset({
        kind,
        uri: compressed.uri,
        name: picked.fileName ?? `event-photo-${Date.now()}.jpg`,
        type: 'image/jpeg',
        width: compressed.width,
        height: compressed.height,
        fileSize: picked.fileSize ?? null,
      });
      return;
    }

    if (picked.fileSize && picked.fileSize > EVENT_MEDIA_LIMITS.maxVideoBytes) {
      setError('Este video supera el límite de 100 MB. Elige uno más ligero.');
      return;
    }

    setAsset({
      kind,
      uri: picked.uri,
      name: picked.fileName ?? `event-video-${Date.now()}.mp4`,
      type: picked.mimeType ?? 'video/mp4',
      width: picked.width,
      height: picked.height,
      fileSize: picked.fileSize ?? null,
    });
  }

  async function confirmUpload() {
    if (!asset) return;
    setError(null);
    setProgress(0);

    try {
      await upload.mutateAsync({
        file: { uri: asset.uri, name: asset.name, type: asset.type },
        isPublic: true,
        onProgress: setProgress,
      });
      showToast(SUCCESS_MESSAGE[asset.kind], 'success');
      close();
    } catch (caught) {
      if (caught instanceof AppError && caught.code === 'MEDIA_LIMIT_REACHED') {
        close();
        onLimitReached();
        return;
      }
      setError(caught instanceof AppError ? caught.message : 'No pudimos subir tu archivo.');
    }
  }

  return (
    <Sheet visible={visible} onClose={close}>
      {!asset ? (
        <View style={{ paddingBottom: spacing.sm }}>
          <AppText variant="subtitle" style={{ marginBottom: spacing.xs }}>
            Agregar recuerdo
          </AppText>
          <SheetActionRow icon={Camera} label="Tomar foto" onPress={() => pick('camera')} />
          <SheetActionRow icon={ImagePlus} label="Elegir foto" onPress={() => pick('library-image')} />
          <SheetActionRow icon={Video} label="Elegir video" onPress={() => pick('library-video')} />
          {error ? (
            <AppText variant="caption" tone="destructive" style={{ marginTop: spacing.xs }}>
              {error}
            </AppText>
          ) : null}
        </View>
      ) : (
        <View style={{ paddingBottom: spacing.lg, gap: spacing.md }}>
          <AppText variant="subtitle">Confirmar recuerdo</AppText>

          {asset.kind === 'image' ? (
            <Image
              source={{ uri: asset.uri }}
              style={{ width: '100%', aspectRatio: asset.width / asset.height, borderRadius: radius.md, backgroundColor: colors.graphiteLight }}
              contentFit="cover"
            />
          ) : (
            <View
              style={{
                width: '100%',
                height: 180,
                borderRadius: radius.md,
                backgroundColor: colors.graphiteLight,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <Video color={colors.gold} size={32} />
              <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
                Video listo para subir
              </AppText>
            </View>
          )}

          {upload.isPending ? (
            <View style={{ gap: spacing.xxs }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.graphiteLight, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${progress}%`, backgroundColor: colors.gold }} />
              </View>
              <AppText variant="caption" tone="muted">
                Subiendo… {progress}%
              </AppText>
            </View>
          ) : null}

          {error ? (
            <AppText variant="caption" tone="destructive">
              {error}
            </AppText>
          ) : null}

          <View style={{ gap: spacing.sm }}>
            <AppButton label="Subir" onPress={confirmUpload} loading={upload.isPending} />
            <AppButton label="Elegir otro" variant="ghost" onPress={reset} disabled={upload.isPending} />
          </View>
        </View>
      )}
    </Sheet>
  );
}
