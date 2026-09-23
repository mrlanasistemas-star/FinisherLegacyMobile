import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router, useLocalSearchParams } from 'expo-router';
import { Award, ChevronDown, Flag, Globe, ImagePlus, Lock, Shirt, Trophy, Users, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { FormInput } from '@/components/form-input';
import { Avatar } from '@/components/ui/avatar';
import { Chip } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { InlineError } from '@/components/ui/inline-error';
import { ListRow } from '@/components/ui/list-row';
import { Sheet } from '@/components/ui/sheet';
import { parseDuration, VISIBILITY_LABEL } from '@/features/social/moment-state';
import { useEventMedia } from '@/hooks/use-event-media';
import { useMyGear } from '@/hooks/use-gear';
import { useMedal, useMedals } from '@/hooks/use-medals';
import { useEventParticipant, useMyEvents } from '@/hooks/use-my-events';
import { useProfile } from '@/hooks/use-profile';
import { useCreateMoment } from '@/hooks/use-social';
import { momentSchema } from '@/schemas/moment';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { MomentType, MomentVisibility } from '@/types/social';
import { prepareImageUpload, type UploadDescriptor } from '@/utils/media-file';

const MAX_PHOTOS = 4;
const MAX_CAPTION = 1000;

const TYPE_OPTIONS: { value: MomentType; label: string }[] = [
  { value: 'training', label: 'Entrenamiento' },
  { value: 'personal_record', label: 'Récord personal' },
  { value: 'memory', label: 'Recuerdo' },
  { value: 'manual', label: 'Otro' },
];

const VISIBILITY_OPTIONS: { value: MomentVisibility; label: string; description: string; icon: typeof Globe }[] = [
  { value: 'public', label: 'Todos', description: 'Cualquier atleta que vea tu perfil.', icon: Globe },
  { value: 'followers', label: 'Seguidores', description: 'Solo quienes te siguen.', icon: Users },
  { value: 'private', label: 'Solo yo', description: 'Queda guardado en tu Legacy, sin compartir.', icon: Lock },
];

/**
 * Compose a Legacy Moment. Opened empty from "+", or prefilled from a race
 * ("Compartir como Legacy Moment") / medal / upload — the athlete always
 * decides and publishes; nothing is auto-posted.
 */
export default function CreateMomentScreen() {
  const params = useLocalSearchParams<{ type?: string; participantId?: string; medalUuid?: string; gearUuid?: string; mediaUuids?: string }>();
  const profile = useProfile();
  const create = useCreateMoment();

  const [participantId, setParticipantId] = useState<number | null>(params.participantId ? Number(params.participantId) : null);
  const [medalUuid, setMedalUuid] = useState<string | null>(params.medalUuid ?? null);
  const [gearUuid, setGearUuid] = useState<string | null>(params.gearUuid ?? null);
  const [type, setType] = useState<MomentType>(
    params.participantId ? 'race_completed' : params.medalUuid ? 'medal_claimed' : params.gearUuid ? 'gear' : ((params.type as MomentType) ?? 'training'),
  );
  const [caption, setCaption] = useState('');
  const [visibility, setVisibility] = useState<MomentVisibility>('public');
  const [photos, setPhotos] = useState<UploadDescriptor[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<string[]>(params.mediaUuids ? params.mediaUuids.split(',').filter(Boolean) : []);
  const [distance, setDistance] = useState('');
  const [duration, setDuration] = useState('');
  const [title, setTitle] = useState('');
  const [sheet, setSheet] = useState<'visibility' | 'race' | 'medal' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [durationError, setDurationError] = useState<string | null>(null);

  const participant = useEventParticipant(participantId);
  const eventMedia = useEventMedia(participantId);
  const medal = useMedal(medalUuid ?? '');
  const myEvents = useMyEvents();
  const medals = useMedals();
  const myGear = useMyGear();
  const linkedGear = gearUuid ? (myGear.data ?? []).find((g) => g.uuid === gearUuid) : undefined;

  const linkedRace = participant.data?.participant ?? null;
  const showMetrics = type === 'training' || type === 'personal_record';
  const profilePrivate = profile.data?.profile?.profile_visibility === 'private';
  const mediaCount = photos.length + selectedMedia.length;
  const VisibilityIcon = VISIBILITY_OPTIONS.find((o) => o.value === visibility)?.icon ?? Globe;

  const canPublish = useMemo(
    () =>
      !create.isPending &&
      (caption.trim().length > 0 || participantId !== null || medalUuid !== null || gearUuid !== null || mediaCount > 0 || (showMetrics && (distance || duration || title))),
    [caption, create.isPending, distance, duration, gearUuid, mediaCount, medalUuid, participantId, showMetrics, title],
  );

  async function pickPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast('Necesitamos acceso a tus fotos para agregarlas.', 'default');
      return;
    }
    const remaining = MAX_PHOTOS - mediaCount;
    if (remaining <= 0) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 1,
    });
    if (result.canceled) return;
    const prepared = await Promise.all(result.assets.slice(0, remaining).map((asset) => prepareImageUpload(asset, 'momento')));
    setPhotos((current) => [...current, ...prepared].slice(0, MAX_PHOTOS));
  }

  function toggleEventMedia(uuid: string) {
    setSelectedMedia((current) => {
      if (current.includes(uuid)) return current.filter((u) => u !== uuid);
      if (mediaCount >= MAX_PHOTOS) return current;
      return [...current, uuid];
    });
  }

  async function publish() {
    setError(null);
    setDurationError(null);

    const check = momentSchema.safeParse({
      caption,
      visibility,
      photosCount: mediaCount,
      metrics: showMetrics ? { title: title || undefined, distance: distance.trim() || undefined, duration: duration.trim() || undefined } : undefined,
    });
    if (!check.success) {
      const issue = check.error.issues[0];
      if (issue.path.includes('duration')) setDurationError(issue.message);
      else setError(issue.message);
      return;
    }

    const durationSeconds = showMetrics && duration.trim() ? (parseDuration(duration) ?? undefined) : undefined;
    const distanceKm = showMetrics && distance.trim() ? Number(distance.replace(',', '.')) : undefined;

    try {
      const moment = await create.mutateAsync({
        type,
        caption: caption.trim() || undefined,
        visibility,
        event_participant_id: participantId ?? undefined,
        medal_uuid: medalUuid ?? undefined,
        gear_uuid: gearUuid ?? undefined,
        event_media_uuids: selectedMedia.length > 0 ? selectedMedia : undefined,
        photos: photos.length > 0 ? photos : undefined,
        metrics: showMetrics
          ? {
              title: title.trim() || undefined,
              distance_km: distanceKm,
              duration_seconds: durationSeconds,
              is_personal_record: type === 'personal_record' || undefined,
            }
          : undefined,
      });
      showToast(visibility === 'private' ? 'Guardado en tu Legacy.' : 'Publicado. Ya es parte de tu Legacy.', 'success');
      router.replace(`/moments/${moment.uuid}`);
    } catch (caught) {
      setError(caught instanceof AppError ? (caught.fieldErrors ? Object.values(caught.fieldErrors)[0]?.[0] ?? caught.message : caught.message) : 'No pudimos publicar tu momento. Intenta otra vez.');
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.sm, minHeight: 52 }}>
        <IconButton icon={X} label="Cancelar" onPress={() => router.back()} />
        <AppText style={{ flex: 1, textAlign: 'center', fontFamily: fontFamily.semibold, fontSize: 16 }} accessibilityRole="header">
          Nuevo momento
        </AppText>
        <AppButton label={visibility === 'private' ? 'Guardar' : 'Publicar'} size="sm" fullWidth={false} onPress={publish} disabled={!canPublish} loading={create.isPending} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.xs }}>
            <Avatar uri={profile.data?.profile?.profile_photo_url} name={profile.data?.athlete.full_name} size={40} />
            <View style={{ flex: 1 }}>
              <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }} numberOfLines={1}>
                {profile.data?.athlete.full_name ?? ''}
              </AppText>
              <Pressable
                onPress={() => setSheet('visibility')}
                accessibilityRole="button"
                accessibilityLabel={`Visible para: ${VISIBILITY_LABEL[visibility]}. Cambiar`}
                style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', minHeight: 32 }}>
                <VisibilityIcon size={13} color={colors.gold} />
                <AppText variant="caption" tone="gold">
                  {VISIBILITY_LABEL[visibility]}
                </AppText>
                <ChevronDown size={14} color={colors.gold} />
              </Pressable>
            </View>
          </View>

          {profilePrivate && visibility !== 'private' ? (
            <AppText variant="caption" tone="muted">
              Tu perfil es privado: por ahora solo tú verás este momento.
            </AppText>
          ) : null}

          <TextInput
            value={caption}
            onChangeText={setCaption}
            placeholder={type === 'race_completed' ? '¿Cómo te fue? Cuéntalo…' : '¿Qué quieres recordar de hoy?'}
            placeholderTextColor={colors.subtle}
            multiline
            maxLength={MAX_CAPTION}
            selectionColor={colors.gold}
            accessibilityLabel="Texto del momento"
            style={{ minHeight: 96, color: colors.foreground, fontFamily: fontFamily.regular, fontSize: 18, lineHeight: 25, textAlignVertical: 'top' }}
          />

          {linkedRace || participantId ? (
            <LinkedCard
              icon={Trophy}
              title={linkedRace?.event ?? 'Tu carrera'}
              subtitle={[linkedRace?.race, participant.data?.result?.official_time].filter(Boolean).join(' · ') || 'Cargando…'}
              onRemove={() => {
                setParticipantId(null);
                setSelectedMedia([]);
                if (type === 'race_completed') setType('training');
              }}
            />
          ) : null}

          {medalUuid ? (
            <LinkedCard
              icon={Award}
              title={medal.data?.title ?? medal.data?.event_name ?? 'Tu medalla'}
              subtitle={medal.data?.distance_label ?? 'Medalla'}
              onRemove={() => {
                setMedalUuid(null);
                if (type === 'medal_claimed') setType('memory');
              }}
            />
          ) : null}

          {gearUuid ? (
            <LinkedCard
              icon={Shirt}
              title={linkedGear?.product_name ?? 'Tu gear'}
              subtitle={linkedGear?.variant_name ?? 'Nuevo en mi equipo'}
              onRemove={() => {
                setGearUuid(null);
                if (type === 'gear') setType('memory');
              }}
            />
          ) : null}

          {participantId === null && medalUuid === null && gearUuid === null ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {TYPE_OPTIONS.map((option) => (
                <Chip key={option.value} label={option.label} selected={type === option.value} onPress={() => setType(option.value)} />
              ))}
            </View>
          ) : null}

          {showMetrics ? (
            <View style={{ gap: spacing.sm }}>
              <FormInput label="Título (opcional)" placeholder="Fondo del domingo" value={title} onChangeText={setTitle} maxLength={80} />
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <FormInput
                  containerStyle={{ flex: 1 }}
                  label="Distancia"
                  kind="decimal"
                  placeholder="10.0"
                  value={distance}
                  onChangeText={setDistance}
                  trailing={<AppText variant="caption" tone="muted">km</AppText>}
                />
                <FormInput
                  containerStyle={{ flex: 1 }}
                  label="Tiempo"
                  kind="text"
                  keyboardType="numbers-and-punctuation"
                  placeholder="52:14"
                  value={duration}
                  onChangeText={(value) => {
                    setDuration(value);
                    setDurationError(null);
                  }}
                  error={durationError ?? undefined}
                />
              </View>
              <AppText variant="caption" style={{ color: colors.subtle }}>
                El ritmo se calcula solo.
              </AppText>
            </View>
          ) : null}

          {participantId !== null && (eventMedia.data?.length ?? 0) > 0 ? (
            <View style={{ gap: spacing.xs }}>
              <AppText variant="caption" tone="muted">
                Fotos de esta carrera
              </AppText>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
                {eventMedia.data
                  ?.filter((m) => m.type === 'image')
                  .map((media) => {
                    const selected = selectedMedia.includes(media.uuid);
                    return (
                      <Pressable
                        key={media.uuid}
                        onPress={() => toggleEventMedia(media.uuid)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked: selected }}
                        accessibilityLabel="Foto de la carrera"
                        style={{ width: 84, height: 84, borderRadius: 12, overflow: 'hidden', borderWidth: 2, borderColor: selected ? colors.gold : 'transparent' }}>
                        <Image source={{ uri: media.url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                      </Pressable>
                    );
                  })}
              </ScrollView>
            </View>
          ) : null}

          {photos.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.xs }}>
              {photos.map((photo, index) => (
                <View key={photo.uri} style={{ width: 96, height: 96, borderRadius: 12, overflow: 'hidden' }}>
                  <Image source={{ uri: photo.uri }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
                  <IconButton
                    icon={X}
                    label="Quitar foto"
                    filled
                    size={16}
                    onPress={() => setPhotos((current) => current.filter((_, i) => i !== index))}
                    style={{ position: 'absolute', top: -4, right: -4 }}
                  />
                </View>
              ))}
            </ScrollView>
          ) : null}

          <View style={{ borderTopWidth: 1, borderTopColor: colors.hairline }}>
            <ListRow
              icon={ImagePlus}
              label="Agregar fotos"
              description={`${mediaCount}/${MAX_PHOTOS}`}
              onPress={mediaCount < MAX_PHOTOS ? pickPhotos : undefined}
            />
            {participantId === null ? <ListRow icon={Flag} label="Vincular una carrera" onPress={() => setSheet('race')} /> : null}
            {medalUuid === null ? <ListRow icon={Award} label="Vincular una medalla" onPress={() => setSheet('medal')} divider={false} /> : null}
          </View>

          <InlineError message={error} />
        </ScrollView>
      </KeyboardAvoidingView>

      {sheet === 'visibility' ? (
        <Sheet visible onClose={() => setSheet(null)}>
          <AppText variant="subtitle" style={{ marginBottom: spacing.xs }}>
            ¿Quién puede verlo?
          </AppText>
          {VISIBILITY_OPTIONS.map((option, index) => (
            <ListRow
              key={option.value}
              icon={option.icon}
              label={option.label}
              description={option.description}
              divider={index < VISIBILITY_OPTIONS.length - 1}
              onPress={() => {
                setVisibility(option.value);
                setSheet(null);
              }}
              trailing={visibility === option.value ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: colors.gold }} /> : <View />}
            />
          ))}
        </Sheet>
      ) : null}

      {sheet === 'race' ? (
        <Sheet visible onClose={() => setSheet(null)}>
          <AppText variant="subtitle" style={{ marginBottom: spacing.xs }}>
            Vincular una carrera
          </AppText>
          {(myEvents.data?.pages[0]?.rows ?? []).length === 0 ? (
            <AppText variant="body" tone="muted" style={{ paddingVertical: spacing.md }}>
              Aún no tienes carreras registradas.
            </AppText>
          ) : (
            <ScrollView style={{ maxHeight: 360 }}>
              {(myEvents.data?.pages[0]?.rows ?? []).map((row) => (
                <ListRow
                  key={row.id}
                  icon={Trophy}
                  label={row.event ?? 'Carrera'}
                  description={[row.race, row.result?.official_time].filter(Boolean).join(' · ')}
                  onPress={() => {
                    setParticipantId(row.id);
                    setType('race_completed');
                    setSheet(null);
                  }}
                />
              ))}
            </ScrollView>
          )}
        </Sheet>
      ) : null}

      {sheet === 'medal' ? (
        <Sheet visible onClose={() => setSheet(null)}>
          <AppText variant="subtitle" style={{ marginBottom: spacing.xs }}>
            Vincular una medalla
          </AppText>
          {(medals.data?.pages[0]?.data ?? []).length === 0 ? (
            <AppText variant="body" tone="muted" style={{ paddingVertical: spacing.md }}>
              Aún no tienes medallas en tu Legacy.
            </AppText>
          ) : (
            <ScrollView style={{ maxHeight: 360 }}>
              {(medals.data?.pages[0]?.data ?? []).map((item) => (
                <ListRow
                  key={item.id}
                  icon={Award}
                  label={item.title ?? item.event_name ?? 'Medalla'}
                  description={item.distance_label}
                  onPress={() => {
                    setMedalUuid(item.id);
                    if (participantId === null) setType('medal_claimed');
                    setSheet(null);
                  }}
                />
              ))}
            </ScrollView>
          )}
        </Sheet>
      ) : null}
    </SafeAreaView>
  );
}

function LinkedCard({ icon: Icon, title, subtitle, onRemove }: { icon: typeof Trophy; title: string; subtitle: string; onRemove: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.sm, borderRadius: 14, backgroundColor: colors.graphite }}>
      <View style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: colors.goldWash, alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={20} color={colors.gold} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }} numberOfLines={1}>
          {title}
        </AppText>
        <AppText variant="caption" tone="muted" numberOfLines={1}>
          {subtitle}
        </AppText>
      </View>
      <IconButton icon={X} label="Quitar vínculo" onPress={onRemove} size={18} color={colors.subtle} />
    </View>
  );
}
