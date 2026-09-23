import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, CircleCheck, ImagePlus, Share2, Video } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { InlineError } from '@/components/ui/inline-error';
import { Sheet } from '@/components/ui/sheet';
import { SheetActionRow } from '@/components/ui/sheet-action-row';
import { useUploadEventMedia } from '@/hooks/use-event-media';
import { showToast } from '@/stores/toastStore';
import { colors, radius, spacing } from '@/theme/tokens';
import type { MediaEntitlement } from '@/types/models';
import { prepareImageUpload, prepareVideoUpload, type UploadDescriptor } from '@/utils/media-file';
import { ensureOnline } from '@/utils/network';

interface PickedAsset extends UploadDescriptor {
  kind: 'image' | 'video';
  width: number;
  height: number;
}

interface MediaUploadSheetProps {
  visible: boolean;
  onClose: () => void;
  participantId: number | null;
  /** Limits, max bytes and allowed MIME types — straight from the backend. */
  entitlement: MediaEntitlement | undefined;
  onLimitReached: () => void;
}

function megabytes(bytes: number): string {
  return `${Math.round(bytes / (1024 * 1024))} MB`;
}

export function MediaUploadSheet({ visible, onClose, participantId, entitlement, onLimitReached }: MediaUploadSheetProps) {
  const [asset, setAsset] = useState<PickedAsset | null>(null);
  const [uploadedUuid, setUploadedUuid] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const upload = useUploadEventMedia(participantId);

  function reset() {
    setAsset(null);
    setUploadedUuid(null);
    setProgress(0);
    setError(null);
  }

  function close() {
    reset();
    onClose();
  }

  async function pick(source: 'camera' | 'library-image' | 'library-video') {
    setError(null);
    const isVideo = source === 'library-video';
    const bucket = isVideo ? entitlement?.videos : entitlement?.images;

    if (bucket && bucket.remaining <= 0) {
      close();
      onLimitReached();
      return;
    }

    const permission = source === 'camera' ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Necesitamos tu permiso para continuar.');
      return;
    }

    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 1 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: isVideo ? ['videos'] : ['images'], quality: 1 });

    if (result.canceled || !result.assets[0]) return;
    const picked = result.assets[0];

    if (!isVideo) {
      const prepared = await prepareImageUpload(picked, 'recuerdo');
      setAsset({ ...prepared, kind: 'image', width: picked.width, height: picked.height });
      return;
    }

    const prepared = prepareVideoUpload(picked, 'recuerdo');
    if (bucket && bucket.allowed_mimes.length > 0 && !bucket.allowed_mimes.includes(prepared.type)) {
      setError('Ese formato de video no es compatible. Usa MP4 o MOV.');
      return;
    }
    if (bucket && picked.fileSize && picked.fileSize > bucket.max_bytes) {
      setError(`Este video pesa más de ${megabytes(bucket.max_bytes)}. Elige uno más corto o recórtalo.`);
      return;
    }
    setAsset({ ...prepared, kind: 'video', width: picked.width, height: picked.height });
  }

  async function confirmUpload() {
    if (!asset) return;
    setError(null);
    setProgress(0);
    try {
      await ensureOnline();
      const media = await upload.mutateAsync({ file: { uri: asset.uri, name: asset.name, type: asset.type }, isPublic: true, onProgress: setProgress });
      setUploadedUuid(media.uuid);
      showToast(asset.kind === 'image' ? 'Ese momento ya forma parte de tu Legacy.' : 'Ahora puedes volver a vivir esa meta.', 'success');
    } catch (caught) {
      if (caught instanceof AppError && caught.code === 'MEDIA_LIMIT_REACHED') {
        close();
        onLimitReached();
        return;
      }
      if (caught instanceof AppError && caught.code === 'MEDIA_TOO_LARGE') {
        setError('El archivo es demasiado grande. Elige uno más ligero.');
        return;
      }
      setError(caught instanceof AppError ? caught.message : 'No pudimos subir tu archivo. Intenta otra vez.');
    }
  }

  return (
    <Sheet visible={visible} onClose={close}>
      {uploadedUuid ? (
        <View style={{ paddingBottom: spacing.lg, gap: spacing.md, alignItems: 'center' }}>
          <CircleCheck size={40} color={colors.gold} />
          <AppText variant="subtitle" align="center">
            Guardado en tu Legacy
          </AppText>
          <AppText variant="body" tone="muted" align="center">
            ¿Quieres compartirlo con tu comunidad?
          </AppText>
          <AppButton
            label="Compartir como Legacy Moment"
            icon={Share2}
            onPress={() => {
              const target = `/moments/create?type=race_completed&participantId=${participantId}&mediaUuids=${uploadedUuid}` as const;
              close();
              router.push(target);
            }}
          />
          <AppButton label="Ahora no" variant="ghost" onPress={close} />
        </View>
      ) : !asset ? (
        <View style={{ paddingBottom: spacing.sm }}>
          <AppText variant="subtitle" style={{ marginBottom: spacing.xs }}>
            Agregar recuerdo
          </AppText>
          {entitlement ? (
            <AppText variant="caption" tone="muted" style={{ marginBottom: spacing.xs }}>
              Fotos {entitlement.images.used}/{entitlement.images.limit} · Videos {entitlement.videos.used}/{entitlement.videos.limit}
            </AppText>
          ) : null}
          <SheetActionRow icon={Camera} label="Tomar foto" onPress={() => pick('camera')} />
          <SheetActionRow icon={ImagePlus} label="Elegir foto" onPress={() => pick('library-image')} />
          <SheetActionRow icon={Video} label="Elegir video" onPress={() => pick('library-video')} />
          <InlineError message={error} />
        </View>
      ) : (
        <View style={{ paddingBottom: spacing.lg, gap: spacing.md }}>
          <AppText variant="subtitle">Confirmar recuerdo</AppText>

          {asset.kind === 'image' ? (
            <Image
              source={{ uri: asset.uri }}
              style={{ width: '100%', aspectRatio: asset.width && asset.height ? asset.width / asset.height : 1, maxHeight: 360, borderRadius: radius.md, backgroundColor: colors.graphiteLight }}
              contentFit="cover"
            />
          ) : (
            <View style={{ width: '100%', height: 180, borderRadius: radius.md, backgroundColor: colors.graphiteLight, alignItems: 'center', justifyContent: 'center' }}>
              <Video color={colors.gold} size={32} />
              <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
                Video listo para subir
              </AppText>
            </View>
          )}

          {upload.isPending ? (
            <View style={{ gap: spacing.xxs }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.graphiteLight, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${progress}%`, backgroundColor: colors.gold }} />
              </View>
              <AppText variant="caption" tone="muted">
                Subiendo… {progress}%
              </AppText>
            </View>
          ) : null}

          <InlineError message={error} onRetry={error && !upload.isPending ? confirmUpload : undefined} />

          <View style={{ gap: spacing.sm }}>
            <AppButton label="Subir" onPress={confirmUpload} loading={upload.isPending} />
            <AppButton label="Elegir otro" variant="ghost" onPress={reset} disabled={upload.isPending} />
          </View>
        </View>
      )}
    </Sheet>
  );
}
