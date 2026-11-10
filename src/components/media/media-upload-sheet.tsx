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
import { useI18n } from '@/i18n';

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
  const { t } = useI18n();
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
      setError(t('Necesitamos tu permiso para continuar.'));
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
      setError(t('Ese formato de video no es compatible. Usa MP4 o MOV.'));
      return;
    }
    if (bucket && picked.fileSize && picked.fileSize > bucket.max_bytes) {
      setError(t('Este video pesa más de {size}. Elige uno más corto o recórtalo.', { size: megabytes(bucket.max_bytes) }));
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
      showToast(asset.kind === 'image' ? t('Ese momento ya forma parte de tu Legacy.') : t('Ahora puedes volver a vivir esa meta.'), 'success');
    } catch (caught) {
      if (caught instanceof AppError && caught.code === 'MEDIA_LIMIT_REACHED') {
        close();
        onLimitReached();
        return;
      }
      if (caught instanceof AppError && caught.code === 'MEDIA_TOO_LARGE') {
        setError(t('El archivo es demasiado grande. Elige uno más ligero.'));
        return;
      }
      setError(caught instanceof AppError ? caught.message : t('No pudimos subir tu archivo. Intenta otra vez.'));
    }
  }

  return (
    <Sheet visible={visible} onClose={close}>
      {uploadedUuid ? (
        <View style={{ paddingBottom: spacing.lg, gap: spacing.md, alignItems: 'center' }}>
          <CircleCheck size={40} color={colors.accent} />
          <AppText variant="subtitle" align="center">
            {t('Guardado en tu Legacy')}
          </AppText>
          <AppText variant="body" tone="muted" align="center">
            {t('¿Quieres compartirlo con tu comunidad?')}
          </AppText>
          <AppButton
            label={t('Compartir como Legacy Moment')}
            icon={Share2}
            onPress={() => {
              const target = `/moments/create?type=race_completed&participantId=${participantId}&mediaUuids=${uploadedUuid}` as const;
              close();
              router.push(target);
            }}
          />
          <AppButton label={t('Ahora no')} variant="ghost" onPress={close} />
        </View>
      ) : !asset ? (
        <View style={{ paddingBottom: spacing.sm }}>
          <AppText variant="subtitle" style={{ marginBottom: spacing.xs }}>
            {t('Agregar recuerdo')}
          </AppText>
          {entitlement ? (
            <AppText variant="caption" tone="muted" style={{ marginBottom: spacing.xs }}>
              {t('Fotos {imagesUsed}/{imagesLimit} · Videos {videosUsed}/{videosLimit}', {
                imagesUsed: entitlement.images.used,
                imagesLimit: entitlement.images.limit,
                videosUsed: entitlement.videos.used,
                videosLimit: entitlement.videos.limit,
              })}
            </AppText>
          ) : null}
          <SheetActionRow icon={Camera} label={t('Tomar foto')} onPress={() => pick('camera')} />
          <SheetActionRow icon={ImagePlus} label={t('Elegir foto')} onPress={() => pick('library-image')} />
          <SheetActionRow icon={Video} label={t('Elegir video')} onPress={() => pick('library-video')} />
          <InlineError message={error} />
        </View>
      ) : (
        <View style={{ paddingBottom: spacing.lg, gap: spacing.md }}>
          <AppText variant="subtitle">{t('Confirmar recuerdo')}</AppText>

          {asset.kind === 'image' ? (
            <Image
              source={{ uri: asset.uri }}
              style={{ width: '100%', aspectRatio: asset.width && asset.height ? asset.width / asset.height : 1, maxHeight: 360, borderRadius: radius.md, backgroundColor: colors.surfaceMuted }}
              contentFit="cover"
            />
          ) : (
            <View style={{ width: '100%', height: 180, borderRadius: radius.md, backgroundColor: colors.surfaceMuted, alignItems: 'center', justifyContent: 'center' }}>
              <Video color={colors.accent} size={32} />
              <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xs }}>
                {t('Video listo para subir')}
              </AppText>
            </View>
          )}

          {upload.isPending ? (
            <View style={{ gap: spacing.xxs }} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: progress }}>
              <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }}>
                <View style={{ height: '100%', width: `${progress}%`, backgroundColor: colors.gold }} />
              </View>
              <AppText variant="caption" tone="muted">
                {t('Subiendo… {progress}%', { progress })}
              </AppText>
            </View>
          ) : null}

          <InlineError message={error} onRetry={error && !upload.isPending ? confirmUpload : undefined} />

          <View style={{ gap: spacing.sm }}>
            <AppButton label={t('Subir')} onPress={confirmUpload} loading={upload.isPending} />
            <AppButton label={t('Elegir otro')} variant="ghost" onPress={reset} disabled={upload.isPending} />
          </View>
        </View>
      )}
    </Sheet>
  );
}
