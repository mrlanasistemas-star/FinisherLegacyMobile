import { zodResolver } from '@hookform/resolvers/zod';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Camera, ImagePlus, MapPin, Trash2 } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import type { UploadFile } from '@/api/profile';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { FormInput } from '@/components/form-input';
import { Skeleton } from '@/components/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { InlineError } from '@/components/ui/inline-error';
import { ListRow } from '@/components/ui/list-row';
import { Sheet } from '@/components/ui/sheet';
import { SheetActionRow } from '@/components/ui/sheet-action-row';
import { TopBar } from '@/components/ui/top-bar';
import { useProfile } from '@/hooks/use-profile';
import { useUpdateProfile } from '@/hooks/use-update-profile';
import { profileSchema, type ProfileFormValues } from '@/schemas/profile';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import { prepareImageUpload } from '@/utils/media-file';

type ImageSlot = 'avatar' | 'cover';
/** `undefined` = unchanged, `null` = remove, file = replace. */
type ImageChange = UploadFile | null | undefined;

const BIO_MAX = 500;

export default function EditProfileScreen() {
  const { data, isPending } = useProfile();
  const user = useAuthStore((s) => s.user);
  const update = useUpdateProfile();
  const profile = data?.profile ?? null;

  const [avatar, setAvatar] = useState<ImageChange>(undefined);
  const [cover, setCover] = useState<ImageChange>(undefined);
  const [imageSheet, setImageSheet] = useState<ImageSlot | null>(null);
  const [locationOpen, setLocationOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    setError,

    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { username: '', bio: '', city: '', state: '', country: '', profile_visibility: 'public' },
  });

  useEffect(() => {
    if (!profile) return;
    reset({
      username: profile.username ?? '',
      bio: profile.bio ?? '',
      city: profile.city ?? '',
      state: profile.state ?? '',
      country: profile.country ?? '',
      profile_visibility: profile.profile_visibility,
    });
  }, [profile, reset]);

  const [city, state, country, bio] = useWatch({ control, name: ['city', 'state', 'country', 'bio'] });
  const locationLabel = [city, state, country].filter(Boolean).join(', ');
  const hasChanges = isDirty || avatar !== undefined || cover !== undefined;

  const avatarPreview = avatar === undefined ? profile?.profile_photo_url : avatar?.uri;
  const coverPreview = cover === undefined ? profile?.cover_photo_url : cover?.uri;

  async function pick(slot: ImageSlot) {
    setImageSheet(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      showToast('Necesitamos acceso a tus fotos para cambiar la imagen.', 'default');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: slot === 'avatar' ? [1, 1] : [16, 9],
      quality: 1,
    });
    if (result.canceled || !result.assets[0]) return;
    const prepared = await prepareImageUpload(result.assets[0], slot === 'avatar' ? 'avatar' : 'portada');
    if (slot === 'avatar') setAvatar(prepared);
    else setCover(prepared);
  }

  function remove(slot: ImageSlot) {
    setImageSheet(null);
    if (slot === 'avatar') setAvatar(null);
    else setCover(null);
  }

  async function onSubmit(values: ProfileFormValues) {
    setFormError(null);
    try {
      await update.mutateAsync({
        username: values.username,
        bio: values.bio || null,
        city: values.city || null,
        state: values.state || null,
        country: values.country || null,
        profile_visibility: values.profile_visibility,
        profile_photo: avatar ?? undefined,
        cover_photo: cover ?? undefined,
        remove_profile_photo: avatar === null,
        remove_cover_photo: cover === null,
      });
      setAvatar(undefined);
      setCover(undefined);
      showToast('Listo. Tu perfil está actualizado.', 'success');
      router.back();
    } catch (error) {
      if (error instanceof AppError && error.fieldErrors) {
        for (const [field, messages] of Object.entries(error.fieldErrors)) {
          if (['username', 'bio', 'city', 'state', 'country', 'profile_visibility'].includes(field)) {
            setError(field as keyof ProfileFormValues, { message: messages[0] });
          }
        }
        const imageError = error.fieldErrors.profile_photo?.[0] ?? error.fieldErrors.cover_photo?.[0];
        setFormError(imageError ?? 'Revisa los campos marcados.');
      } else {
        setFormError(error instanceof AppError ? error.message : 'No pudimos guardar tu perfil. Intenta otra vez.');
      }
    }
  }

  if (isPending) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.black }}>
        <View style={{ paddingHorizontal: spacing.lg }}>
          <TopBar title="Editar perfil" />
        </View>
        <Skeleton height={160} radius={0} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar
          title="Editar perfil"
          right={<AppButton label="Guardar" size="sm" fullWidth={false} onPress={handleSubmit(onSubmit)} loading={update.isPending} disabled={!hasChanges} />}
        />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingBottom: spacing.xxl }}>
          {/* Cover */}
          <Pressable onPress={() => setImageSheet('cover')} accessibilityRole="button" accessibilityLabel="Cambiar foto de portada" style={{ height: 160, backgroundColor: colors.graphite }}>
            {coverPreview ? (
              <Image source={{ uri: coverPreview }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={150} />
            ) : (
              <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                <ImagePlus size={24} color={colors.muted} />
                <AppText variant="caption" tone="muted">
                  Agregar portada
                </AppText>
              </View>
            )}
            <View style={{ position: 'absolute', right: spacing.md, bottom: spacing.sm, width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(10,10,12,0.65)', alignItems: 'center', justifyContent: 'center' }}>
              <Camera size={16} color={colors.white} />
            </View>
          </Pressable>

          {/* Avatar overlapping the cover */}
          <View style={{ paddingHorizontal: spacing.lg, marginTop: -48, flexDirection: 'row', alignItems: 'flex-end', gap: spacing.md }}>
            <Pressable onPress={() => setImageSheet('avatar')} accessibilityRole="button" accessibilityLabel="Cambiar foto de perfil">
              <Avatar uri={avatarPreview} name={user?.name} size={96} style={{ borderWidth: 4, borderColor: colors.black }} />
              <View style={{ position: 'absolute', right: 2, bottom: 2, width: 30, height: 30, borderRadius: 15, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.black }}>
                <Camera size={14} color={colors.black} />
              </View>
            </Pressable>
            <Pressable onPress={() => setImageSheet('avatar')} accessibilityRole="button" style={{ paddingBottom: spacing.sm, minHeight: 44, justifyContent: 'flex-end' }}>
              <AppText variant="bodyStrong" tone="gold">
                Cambiar foto
              </AppText>
            </Pressable>
          </View>

          <View style={{ paddingHorizontal: spacing.lg, gap: spacing.md, marginTop: spacing.lg }}>
            <InlineError message={formError} />

            <Controller
              control={control}
              name="username"
              render={({ field }) => (
                <FormInput
                  label="Nombre de usuario"
                  kind="username"
                  value={field.value}
                  onChangeText={(value) => field.onChange(value.replace(/\s/g, '').toLowerCase())}
                  onBlur={field.onBlur}
                  error={errors.username?.message}
                  hint={field.value ? `finisherlegacy.com/@${field.value}` : 'Letras, números, punto y guion bajo.'}
                  maxLength={30}
                  trailing={null}
                />
              )}
            />

            <Controller
              control={control}
              name="bio"
              render={({ field }) => (
                <FormInput
                  label="Bio"
                  placeholder="Maratonista, 3 medallas de Boston en la mira…"
                  value={field.value}
                  onChangeText={field.onChange}
                  onBlur={field.onBlur}
                  error={errors.bio?.message}
                  multiline
                  maxLength={BIO_MAX}
                  hint={`${(bio ?? '').length}/${BIO_MAX}`}
                />
              )}
            />

            <View style={{ borderTopWidth: 1, borderTopColor: colors.hairline }}>
              <ListRow icon={MapPin} label="Ubicación" value={locationLabel || 'Agregar'} onPress={() => setLocationOpen(true)} />
              <Controller
                control={control}
                name="profile_visibility"
                render={({ field }) => {
                  const isPrivate = field.value === 'private';
                  return (
                    <ListRow
                      label="Perfil privado"
                      description={
                        isPrivate
                          ? 'Solo tú ves tu perfil, tus momentos y tus medallas.'
                          : 'Otros atletas pueden ver tus logros públicos y seguirte.'
                      }
                      divider={false}
                      trailing={
                        <Switch
                          value={isPrivate}
                          onValueChange={(value) => field.onChange(value ? 'private' : 'public')}
                          trackColor={{ false: colors.graphiteLight, true: colors.gold }}
                          thumbColor={colors.white}
                          ios_backgroundColor={colors.graphiteLight}
                          accessibilityLabel="Perfil privado"
                        />
                      }
                    />
                  );
                }}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {imageSheet ? (
        <Sheet visible onClose={() => setImageSheet(null)}>
          <AppText variant="subtitle" style={{ marginBottom: spacing.xs }}>
            {imageSheet === 'avatar' ? 'Foto de perfil' : 'Foto de portada'}
          </AppText>
          <SheetActionRow icon={ImagePlus} label="Elegir de mis fotos" onPress={() => pick(imageSheet)} />
          {(imageSheet === 'avatar' ? avatarPreview : coverPreview) ? (
            <SheetActionRow icon={Trash2} label="Quitar foto" destructive onPress={() => remove(imageSheet)} />
          ) : null}
        </Sheet>
      ) : null}

      {locationOpen ? (
        <Sheet visible onClose={() => setLocationOpen(false)}>
          <View style={{ gap: spacing.md, paddingBottom: spacing.sm }}>
            <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 18 }}>Ubicación</AppText>
            <Controller
              control={control}
              name="city"
              render={({ field }) => <FormInput label="Ciudad" kind="name" placeholder="Cuernavaca" value={field.value} onChangeText={field.onChange} error={errors.city?.message} returnKeyType="next" />}
            />
            <Controller
              control={control}
              name="state"
              render={({ field }) => <FormInput label="Estado" kind="name" placeholder="Morelos" value={field.value} onChangeText={field.onChange} error={errors.state?.message} returnKeyType="next" />}
            />
            <Controller
              control={control}
              name="country"
              render={({ field }) => <FormInput label="País" kind="name" placeholder="México" value={field.value} onChangeText={field.onChange} error={errors.country?.message} returnKeyType="done" />}
            />
            <AppButton label="Listo" size="md" onPress={() => setLocationOpen(false)} />
          </View>
        </Sheet>
      ) : null}
    </SafeAreaView>
  );
}
