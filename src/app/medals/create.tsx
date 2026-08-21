import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { X } from 'lucide-react-native';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { FormInput } from '@/components/form-input';
import { ImagePickerTile, type PickedImage } from '@/components/image-picker-tile';
import { Screen } from '@/components/screen';
import { useCreateMedal } from '@/hooks/use-medal-mutations';
import { manualMedalSchema, type ManualMedalFormValues } from '@/schemas/medal';
import { colors, spacing } from '@/theme/tokens';

export default function CreateMedalScreen() {
  const { mutateAsync, isPending } = useCreateMedal();
  const [frontImage, setFrontImage] = useState<PickedImage | null>(null);
  const [backImage, setBackImage] = useState<PickedImage | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
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

  async function onSubmit(values: ManualMedalFormValues) {
    setFormError(null);
    if (!frontImage) {
      setFormError('Agrega una foto frontal de tu medalla.');
      return;
    }
    try {
      const medal = await mutateAsync({
        origin: 'manual',
        event_name_manual: values.event_name_manual,
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
      router.replace(`/medals/${medal.id}`);
    } catch (error) {
      setFormError(error instanceof AppError ? error.message : 'No pudimos guardar tu medalla.');
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Screen scroll>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm }}>
          <AppText variant="subtitle">Nueva medalla</AppText>
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
            <ImagePickerTile label="Foto frontal" value={frontImage} onChange={setFrontImage} style={{ flex: 1 }} />
            <ImagePickerTile label="Foto trasera" value={backImage} onChange={setBackImage} style={{ flex: 1 }} />
          </View>

          <Controller
            control={control}
            name="event_name_manual"
            render={({ field }) => (
              <FormInput
                label="Evento"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.event_name_manual?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="event_date"
            render={({ field }) => (
              <FormInput
                label="Fecha (AAAA-MM-DD)"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.event_date?.message}
                placeholder="2026-03-15"
              />
            )}
          />

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <View style={{ flex: 1 }}>
                  <FormInput label="Ciudad" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.city?.message} />
                </View>
              )}
            />
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <View style={{ flex: 1 }}>
                  <FormInput label="País" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.country?.message} />
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
                  <FormInput label="Distancia" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} placeholder="21K" />
                </View>
              )}
            />
            <Controller
              control={control}
              name="official_time"
              render={({ field }) => (
                <View style={{ flex: 1 }}>
                  <FormInput label="Tiempo oficial" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} placeholder="1:45:30" />
                </View>
              )}
            />
            <Controller
              control={control}
              name="pace"
              render={({ field }) => (
                <View style={{ flex: 1 }}>
                  <FormInput label="Ritmo" value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} placeholder="5:00/km" />
                </View>
              )}
            />
          </View>

          <Controller
            control={control}
            name="story"
            render={({ field }) => (
              <FormInput
                label="Historia"
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                error={errors.story?.message}
                multiline
                numberOfLines={4}
              />
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

          <AppButton label="Guardar medalla" onPress={handleSubmit(onSubmit)} loading={isPending} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
