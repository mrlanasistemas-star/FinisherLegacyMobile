import { zodResolver } from '@hookform/resolvers/zod';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { FormInput } from '@/components/form-input';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { useProfile } from '@/hooks/use-profile';
import { useUpdateProfile } from '@/hooks/use-update-profile';
import { profileSchema, type ProfileFormValues } from '@/schemas/profile';
import { colors, radius, spacing } from '@/theme/tokens';

type PickedImage = { uri: string; name: string; type: string } | null;

export default function AccountSettingsScreen() {
  const { data: profile, isPending } = useProfile();
  const { mutateAsync, isPending: saving } = useUpdateProfile();
  const [formError, setFormError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState<PickedImage>(null);
  const [coverPhoto, setCoverPhoto] = useState<PickedImage>(null);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
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

  async function pickImage(setter: (image: PickedImage) => void) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.85,
      allowsEditing: true,
    });
    if (result.canceled || !result.assets[0]) return;

    const asset = result.assets[0];
    setter({
      uri: asset.uri,
      name: asset.fileName ?? `photo-${Date.now()}.jpg`,
      type: asset.mimeType ?? 'image/jpeg',
    });
  }

  async function onSubmit(values: ProfileFormValues) {
    setFormError(null);
    setSuccess(false);
    try {
      await mutateAsync({
        username: values.username,
        bio: values.bio || null,
        city: values.city || null,
        state: values.state || null,
        country: values.country || null,
        profile_visibility: values.profile_visibility,
        profile_photo: profilePhoto,
        cover_photo: coverPhoto,
      });
      setSuccess(true);
    } catch (error) {
      if (error instanceof AppError) {
        if (error.fieldErrors) {
          for (const [field, messages] of Object.entries(error.fieldErrors)) {
            if (field in { username: 1, bio: 1, city: 1, state: 1, country: 1, profile_visibility: 1 }) {
              setError(field as keyof ProfileFormValues, { message: messages[0] });
            }
          }
        }
        setFormError(error.message);
      } else {
        setFormError('Algo salió mal. Intenta nuevamente.');
      }
    }
  }

  if (isPending) {
    return (
      <Screen>
        <ScreenHeader title="Cuenta" />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll>
        <ScreenHeader title="Cuenta" />

        <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
          {formError ? (
            <AppText variant="caption" tone="destructive">
              {formError}
            </AppText>
          ) : null}
          {success ? (
            <AppText variant="caption" tone="gold">
              Tu Legacy Profile fue actualizado.
            </AppText>
          ) : null}

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Pressable
              onPress={() => pickImage(setProfilePhoto)}
              style={{
                flex: 1,
                aspectRatio: 1,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.graphite,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <AppText variant="caption" tone="muted" align="center">
                {profilePhoto ? 'Foto seleccionada' : 'Foto de perfil'}
              </AppText>
            </Pressable>
            <Pressable
              onPress={() => pickImage(setCoverPhoto)}
              style={{
                flex: 2,
                aspectRatio: 2,
                borderRadius: radius.md,
                borderWidth: 1,
                borderColor: colors.border,
                backgroundColor: colors.graphite,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
              <AppText variant="caption" tone="muted" align="center">
                {coverPhoto ? 'Portada seleccionada' : 'Foto de portada'}
              </AppText>
            </Pressable>
          </View>

          <Controller
            control={control}
            name="username"
            render={({ field }) => (
              <FormInput
                label="Nombre de usuario"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.username?.message}
                autoCapitalize="none"
              />
            )}
          />
          <Controller
            control={control}
            name="bio"
            render={({ field }) => (
              <FormInput
                label="Biografía"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.bio?.message}
                multiline
                numberOfLines={3}
              />
            )}
          />
          <Controller
            control={control}
            name="city"
            render={({ field }) => (
              <FormInput label="Ciudad" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.city?.message} />
            )}
          />
          <Controller
            control={control}
            name="state"
            render={({ field }) => (
              <FormInput label="Estado" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.state?.message} />
            )}
          />
          <Controller
            control={control}
            name="country"
            render={({ field }) => (
              <FormInput label="País" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.country?.message} />
            )}
          />

          <Controller
            control={control}
            name="profile_visibility"
            render={({ field }) => (
              <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                <AppButton
                  label="Público"
                  variant={field.value === 'public' ? 'primary' : 'secondary'}
                  fullWidth={false}
                  onPress={() => field.onChange('public')}
                  style={{ flex: 1 }}
                />
                <AppButton
                  label="Privado"
                  variant={field.value === 'private' ? 'primary' : 'secondary'}
                  fullWidth={false}
                  onPress={() => field.onChange('private')}
                  style={{ flex: 1 }}
                />
              </View>
            )}
          />

          <AppButton label="Guardar cambios" onPress={handleSubmit(onSubmit)} loading={saving} />
        </View>

        <Card style={{ marginTop: spacing.xl, marginBottom: spacing.xl }}>
          <AppText variant="bodyStrong">Eliminar cuenta</AppText>
          <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xxs }}>
            Por ahora, para eliminar tu cuenta escríbenos a hola@finisherlegacy.com y la eliminaremos por ti.
          </AppText>
        </Card>
      </Screen>
    </KeyboardAvoidingView>
  );
}
