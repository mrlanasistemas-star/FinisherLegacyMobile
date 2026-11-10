import { zodResolver } from '@hookform/resolvers/zod';
import { router } from 'expo-router';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { FormInput } from '@/components/form-input';
import { ImagePickerTile, type PickedImage } from '@/components/image-picker-tile';
import { Screen } from '@/components/screen';
import { InlineError } from '@/components/ui/inline-error';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useCreateMedal } from '@/hooks/use-medal-mutations';
import { useI18n } from '@/i18n';
import { manualMedalSchema, type ManualMedalFormValues } from '@/schemas/medal';
import { colors, spacing } from '@/theme/tokens';

export default function CreateMedalScreen() {
  const { t } = useI18n();
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
      setFormError(t('Agrega una foto frontal de tu medalla.'));
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
      setFormError(error instanceof AppError ? error.message : t('No pudimos guardar tu medalla.'));
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <Screen scroll edges={['top', 'left', 'right', 'bottom']}>
        <View style={{ flexDirection: 'row', alignItems: 'center', minHeight: 52 }}>
          <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel={t('Cancelar')} style={{ minWidth: 80, minHeight: 44, justifyContent: 'center' }}>
            <AppText variant="body" tone="accent">
              {t('Cancelar')}
            </AppText>
          </Pressable>
          <AppText variant="bodyStrong" align="center" style={{ flex: 1 }} accessibilityRole="header">
            {t('Nueva medalla')}
          </AppText>
          <View style={{ minWidth: 80 }} />
        </View>

        <View style={{ gap: spacing.md, paddingBottom: spacing.xl }}>
          <InlineError message={formError} />

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <ImagePickerTile label={t('Foto frontal')} value={frontImage} onChange={setFrontImage} style={{ flex: 1 }} />
            <ImagePickerTile label={t('Foto trasera')} value={backImage} onChange={setBackImage} style={{ flex: 1 }} />
          </View>

          <Controller
            control={control}
            name="event_name_manual"
            render={({ field }) => (
              <FormInput
                label={t('Evento')}
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
                label={t('Fecha (AAAA-MM-DD)')}
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
                  <FormInput label={t('Ciudad')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.city?.message} />
                </View>
              )}
            />
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <View style={{ flex: 1 }}>
                  <FormInput label={t('País')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.country?.message} />
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
                  <FormInput label={t('Distancia')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} placeholder="21K" />
                </View>
              )}
            />
            <Controller
              control={control}
              name="official_time"
              render={({ field }) => (
                <View style={{ flex: 1 }}>
                  <FormInput label={t('Tiempo oficial')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} placeholder="1:45:30" />
                </View>
              )}
            />
            <Controller
              control={control}
              name="pace"
              render={({ field }) => (
                <View style={{ flex: 1 }}>
                  <FormInput label={t('Ritmo')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} placeholder="5:00/km" />
                </View>
              )}
            />
          </View>

          <Controller
            control={control}
            name="story"
            render={({ field }) => (
              <FormInput
                label={t('Historia')}
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
              <View style={{ gap: spacing.xs }}>
                <AppText variant="caption" tone="muted">
                  {t('¿Quién puede verla?')}
                </AppText>
                <SegmentedControl
                  options={[
                    { value: 'public', label: t('Pública') },
                    { value: 'private', label: t('Solo yo') },
                  ]}
                  value={field.value ?? 'public'}
                  onChange={field.onChange}
                />
              </View>
            )}
          />

          <AppButton label={t('Guardar medalla')} onPress={handleSubmit(onSubmit)} loading={isPending} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
