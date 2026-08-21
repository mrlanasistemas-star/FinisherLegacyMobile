import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ErrorState } from '@/components/error-state';
import { FormInput } from '@/components/form-input';
import { ImagePickerTile, type PickedImage } from '@/components/image-picker-tile';
import { Screen } from '@/components/screen';
import { useMedal } from '@/hooks/use-medals';
import { useUpdateMedal } from '@/hooks/use-medal-mutations';
import { manualMedalSchema, type ManualMedalFormValues } from '@/schemas/medal';
import { colors, spacing } from '@/theme/tokens';

export default function EditMedalScreen() {
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const { data: medal, isPending: loadingMedal, isError, refetch } = useMedal(uuid);
  const { mutateAsync, isPending: saving } = useUpdateMedal(uuid);
  const [frontImage, setFrontImage] = useState<PickedImage | null>(null);
  const [backImage, setBackImage] = useState<PickedImage | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ManualMedalFormValues>({
    resolver: zodResolver(manualMedalSchema),
    defaultValues: {
      event_name_manual: '',
      event_date: '',
      city: '',
      country: '',
      distance_label: '',
      official_time: '',
      pace: '',
      story: '',
      visibility: 'public',
    },
  });

  useEffect(() => {
    if (!medal) return;
    reset({
      event_name_manual: medal.event_name_manual ?? medal.title ?? '',
      event_date: medal.event_date ?? '',
      city: medal.city ?? '',
      country: medal.country ?? '',
      distance_label: medal.distance_label ?? '',
      official_time: medal.official_time ?? '',
      pace: medal.pace ?? '',
      story: medal.story ?? '',
      visibility: medal.visibility,
    });
  }, [medal, reset]);

  async function onSubmit(values: ManualMedalFormValues) {
    setFormError(null);
    try {
      await mutateAsync({
        event_name_manual: values.event_name_manual || undefined,
        event_date: values.event_date || undefined,
        city: values.city || undefined,
        country: values.country || undefined,
        distance_label: values.distance_label || undefined,
        official_time: values.official_time || undefined,
        pace: values.pace || undefined,
        story: values.story || undefined,
        visibility: values.visibility,
        front_image: frontImage,
        back_image: backImage,
      });
      router.back();
    } catch (error) {
      setFormError(error instanceof AppError ? error.message : 'No pudimos guardar los cambios.');
    }
  }

  if (loadingMedal) return <Screen />;
  if (isError || !medal) {
    return (
      <Screen>
        <ErrorState message="No pudimos cargar esta medalla." onRetry={refetch} />
      </Screen>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm }}>
          <AppText variant="subtitle">Editar medalla</AppText>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar">
            <X color={colors.foreground} size={24} />
          </Pressable>
        </View>

        <View style={{ gap: spacing.md, paddingBottom: spacing.xl }}>
          {formError ? (
            <AppText variant="caption" tone="destructive">
              {formError}
            </AppText>
          ) : null}

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <ImagePickerTile
              label="Foto frontal"
              value={frontImage}
              existingUrl={medal.front_image_url}
              onChange={setFrontImage}
              style={{ flex: 1 }}
            />
            <ImagePickerTile
              label="Foto trasera"
              value={backImage}
              existingUrl={medal.back_image_url}
              onChange={setBackImage}
              style={{ flex: 1 }}
            />
          </View>

          <Controller
            control={control}
            name="event_name_manual"
            render={({ field }) => (
              <FormInput label="Evento" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.event_name_manual?.message} />
            )}
          />
          <Controller
            control={control}
            name="event_date"
            render={({ field }) => (
              <FormInput label="Fecha (AAAA-MM-DD)" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} placeholder="2026-03-15" />
            )}
          />

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <View style={{ flex: 1 }}>
                  <FormInput label="Ciudad" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
                </View>
              )}
            />
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <View style={{ flex: 1 }}>
                  <FormInput label="País" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
                </View>
              )}
            />
          </View>

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Controller
              control={control}
              name="distance_label"
              render={({ field }) => (
                <View style={{ flex: 1 }}>
                  <FormInput label="Distancia" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
                </View>
              )}
            />
            <Controller
              control={control}
              name="official_time"
              render={({ field }) => (
                <View style={{ flex: 1 }}>
                  <FormInput label="Tiempo oficial" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
                </View>
              )}
            />
            <Controller
              control={control}
              name="pace"
              render={({ field }) => (
                <View style={{ flex: 1 }}>
                  <FormInput label="Ritmo" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
                </View>
              )}
            />
          </View>

          <Controller
            control={control}
            name="story"
            render={({ field }) => (
              <FormInput label="Historia" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} multiline numberOfLines={4} />
            )}
          />

          <Controller
            control={control}
            name="visibility"
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
      </Screen>
    </KeyboardAvoidingView>
  );
}
