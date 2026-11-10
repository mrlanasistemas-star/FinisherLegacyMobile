import { zodResolver } from '@hookform/resolvers/zod';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, Pressable, View } from 'react-native';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ErrorState } from '@/components/error-state';
import { TopBar } from '@/components/ui/top-bar';
import { FormInput } from '@/components/form-input';
import { ImagePickerTile, type PickedImage } from '@/components/image-picker-tile';
import { Screen } from '@/components/screen';
import { InlineError } from '@/components/ui/inline-error';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useMedal } from '@/hooks/use-medals';
import { useUpdateMedal } from '@/hooks/use-medal-mutations';
import { useI18n } from '@/i18n';
import { manualMedalSchema, type ManualMedalFormValues } from '@/schemas/medal';
import { showToast } from '@/stores/toastStore';
import { colors, spacing } from '@/theme/tokens';

export default function EditMedalScreen() {
  const { t } = useI18n();
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
      showToast(t('Medalla actualizada.'), 'success');
    } catch (error) {
      setFormError(error instanceof AppError ? error.message : t('No pudimos guardar los cambios.'));
    }
  }

  if (loadingMedal) return <Screen />;
  if (isError || !medal) {
    return (
      <Screen>
        <TopBar title={t('Editar medalla')} />
        <ErrorState message={t('No pudimos cargar esta medalla.')} onRetry={refetch} onBack={() => (router.canGoBack() ? router.back() : router.replace('/'))} />
      </Screen>
    );
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
            {t('Editar medalla')}
          </AppText>
          <View style={{ minWidth: 80 }} />
        </View>

        <View style={{ gap: spacing.md, paddingBottom: spacing.xl }}>
          <InlineError message={formError} />

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <ImagePickerTile
              label={t('Foto frontal')}
              value={frontImage}
              existingUrl={medal.front_image_url}
              onChange={setFrontImage}
              style={{ flex: 1 }}
            />
            <ImagePickerTile
              label={t('Foto trasera')}
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
              <FormInput label={t('Evento')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} error={errors.event_name_manual?.message} />
            )}
          />
          <Controller
            control={control}
            name="event_date"
            render={({ field }) => (
              <FormInput label={t('Fecha (AAAA-MM-DD)')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} placeholder="2026-03-15" />
            )}
          />

          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <Controller
              control={control}
              name="city"
              render={({ field }) => (
                <View style={{ flex: 1 }}>
                  <FormInput label={t('Ciudad')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
                </View>
              )}
            />
            <Controller
              control={control}
              name="country"
              render={({ field }) => (
                <View style={{ flex: 1 }}>
                  <FormInput label={t('País')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
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
                  <FormInput label={t('Distancia')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
                </View>
              )}
            />
            <Controller
              control={control}
              name="official_time"
              render={({ field }) => (
                <View style={{ flex: 1 }}>
                  <FormInput label={t('Tiempo oficial')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
                </View>
              )}
            />
            <Controller
              control={control}
              name="pace"
              render={({ field }) => (
                <View style={{ flex: 1 }}>
                  <FormInput label={t('Ritmo')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} />
                </View>
              )}
            />
          </View>

          <Controller
            control={control}
            name="story"
            render={({ field }) => (
              <FormInput label={t('Historia')} value={field.value} onChangeText={field.onChange} onBlur={field.onBlur} multiline numberOfLines={4} />
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

          <AppButton label={t('Guardar cambios')} onPress={handleSubmit(onSubmit)} loading={saving} />
        </View>
      </Screen>
    </KeyboardAvoidingView>
  );
}
