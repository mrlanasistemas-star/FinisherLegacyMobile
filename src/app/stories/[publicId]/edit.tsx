/**
 * Editor of a story's race data and text: one grouped iOS-style form
 * (react-hook-form + zod), "Guardar" as a text action in the header and a
 * guard against losing changes (header back, Android back and the swipe
 * gesture all ask first). Only what changed is sent (`PATCH
 * /me/stories/{id}`); fields the event published officially are read-only
 * and never sent. Backend validation errors land on their own row.
 *
 * Keyboard: Android edge-to-edge does not resize the window, so the form
 * shrinks by the keyboard height and scrolls the focused field into view.
 */

import { zodResolver } from '@hookform/resolvers/zod';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Controller, useForm, type FieldErrors } from 'react-hook-form';
import { BackHandler, Keyboard, Platform, ScrollView, View, type TextInput } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InlineError } from '@/components/ui/inline-error';
import { HeaderTextButton, TopBar } from '@/components/ui/top-bar';
import { FormArea, FormGroup, FormRow } from '@/features/stories/components/form-row';
import { buildPatch, isOfficial, maskDate, serverFieldErrors, storyFormSchema, toFormValues, type StoryFormValues } from '@/features/stories/story-form';
import { useEditableStory, useUpdateStory } from '@/features/stories/use-stories';
import { useKeyboardInset, useRevealFocusedInput } from '@/hooks/use-keyboard-inset';
import { useI18n } from '@/i18n';
import type { EditableStory, StoryTextField } from '@/schemas/story';
import { showToast } from '@/stores/toastStore';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/legacy');
}

interface EditFormProps {
  story: EditableStory;
  publicId: string;
}

function EditForm({ story, publicId }: EditFormProps) {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const update = useUpdateStory(publicId);
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const scrollRef = useRef<ScrollView>(null);
  const onScroll = useRevealFocusedInput(scrollRef);
  const keyboard = useKeyboardInset();
  const restingBottom = insets.bottom + spacing.xl;
  const spacerStyle = useAnimatedStyle(() => ({ height: Math.max(0, keyboard.value) }));

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    formState: { isDirty, errors },
  } = useForm<StoryFormValues>({
    resolver: zodResolver(storyFormSchema),
    defaultValues: toFormValues(story),
    mode: 'onBlur',
  });

  const saving = update.isPending;
  const official = (field: StoryTextField) => isOfficial(story, field);

  function requestLeave() {
    if (saving) return;
    if (isDirty) {
      Keyboard.dismiss();
      setConfirmLeave(true);
    } else {
      leave();
    }
  }

  // Android hardware / gesture back asks before dropping changes.
  useEffect(() => {
    if (!isDirty) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      Keyboard.dismiss();
      setConfirmLeave(true);
      return true;
    });
    return () => subscription.remove();
  }, [isDirty]);

  function onValid(values: StoryFormValues) {
    setBanner(null);
    const patch = buildPatch(story, values);
    if (Object.keys(patch).length === 0) {
      leave();
      return;
    }
    Keyboard.dismiss();
    update.mutate(patch, {
      onSuccess: (saved) => {
        reset(toFormValues(saved));
        haptics.success();
        showToast(t('Guardamos tu recuerdo.'), 'success');
        // `reset` clears the dirty flag on the next render; leaving now is safe because the guard reads state, not the form.
        leave();
      },
      onError: (caught) => {
        haptics.error();
        const error = caught instanceof AppError ? caught : null;
        const fields = serverFieldErrors(error?.fieldErrors);
        const names = Object.keys(fields) as StoryTextField[];
        names.forEach((name) => setError(name, { type: 'server', message: fields[name] }));
        if (names[0]) setFocus(names[0]);
        setBanner(
          names.length > 0
            ? t('Revisa los campos marcados.')
            : error?.kind === 'not_found'
              ? t('Todavía no podemos guardar cambios desde la app. Intenta más tarde.')
              : (error?.message ?? t('No pudimos guardar. Intenta de nuevo.')),
        );
        scrollRef.current?.scrollTo({ y: 0, animated: true });
      },
    });
  }

  function onInvalid(invalid: FieldErrors<StoryFormValues>) {
    haptics.warning();
    setBanner(t('Revisa los campos marcados.'));
    const first = Object.keys(invalid)[0] as StoryTextField | undefined;
    if (first) setFocus(first);
  }

  /** Built on press (not during render): the handlers touch the scroll ref. */
  function save() {
    void handleSubmit(onValid, onInvalid)();
  }

  function row(name: StoryTextField, label: string, props: Partial<React.ComponentProps<typeof FormRow>> = {}, next?: StoryTextField) {
    return (
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <FormRow
            ref={field.ref as React.Ref<TextInput>}
            label={label}
            value={field.value}
            onChangeText={(text) => field.onChange(name === 'race_date' ? maskDate(text) : text)}
            onBlur={field.onBlur}
            error={errors[name]?.message}
            official={official(name)}
            editable={!saving}
            onSubmitEditing={next ? () => setFocus(next) : undefined}
            submitBehavior={next ? 'submit' : 'blurAndSubmit'}
            {...props}
          />
        )}
      />
    );
  }

  function area(name: 'dedication' | 'body', label: string, placeholder: string, maxLength: number, minHeight: number) {
    return (
      <Controller
        control={control}
        name={name}
        render={({ field }) => (
          <FormArea
            ref={field.ref as React.Ref<TextInput>}
            label={label}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            error={errors[name]?.message}
            official={official(name)}
            editable={!saving}
            placeholder={placeholder}
            maxLength={maxLength}
            minHeight={minHeight}
          />
        )}
      />
    );
  }

  const anyOfficial = Object.keys(story.official).length > 0;

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      {/* The swipe-back gesture cannot ask, so it is off while there are changes. */}
      <Stack.Screen options={{ gestureEnabled: !isDirty && !saving }} />

      <View style={{ paddingLeft: Math.max(insets.left, spacing.md), paddingRight: Math.max(insets.right, spacing.md), borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
        <TopBar title={t('Editar recuerdo')} onBack={requestLeave} right={<HeaderTextButton label={t('Guardar')} onPress={save} disabled={!isDirty} loading={saving} />} />
      </View>

      <ScrollView
        ref={scrollRef}
        onScroll={onScroll}
        scrollEventThrottle={16}
        style={{ flex: 1 }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ alignItems: 'center', paddingTop: spacing.lg, paddingBottom: restingBottom }}>
        <View style={{ width: '100%', maxWidth: 640, paddingLeft: Math.max(insets.left, spacing.md), paddingRight: Math.max(insets.right, spacing.md), gap: spacing.lg }}>
          <InlineError message={banner} />

          <FormGroup title={t('Recuerdo')} footer={t('Es el nombre que verán quienes abran tu recuerdo.')}>
            {row('title', t('Título'), { placeholder: t('Mi primer maratón'), autoCapitalize: 'sentences', maxLength: 120, last: true }, 'event_name')}
          </FormGroup>

          <FormGroup title={t('Carrera')}>
            {row('event_name', t('Evento'), { placeholder: t('Nombre del evento'), autoCapitalize: 'words', maxLength: 160 }, 'race_date')}
            {row('race_date', t('Fecha'), { placeholder: t('DD/MM/AAAA'), keyboardType: 'number-pad', maxLength: 10 }, 'location')}
            {row('location', t('Lugar'), { placeholder: t('Ciudad, estado'), autoCapitalize: 'words', maxLength: 160 }, 'distance')}
            {row('distance', t('Distancia'), { placeholder: '21K', autoCapitalize: 'characters', maxLength: 60, last: true }, 'athlete_display_name')}
          </FormGroup>

          <FormGroup title={t('Mi resultado')} footer={anyOfficial ? t('Los datos marcados como Oficial vienen del resultado publicado por el evento y no se pueden cambiar.') : undefined}>
            {row('athlete_display_name', t('Nombre'), { placeholder: t('Como quieres aparecer'), autoCapitalize: 'words', autoComplete: 'name', maxLength: 80 }, 'bib_number')}
            {row('bib_number', t('Dorsal'), { placeholder: '1234', autoCapitalize: 'characters', autoCorrect: false, maxLength: 12 }, 'result_time')}
            {row('result_time', t('Tiempo'), { placeholder: 'h:mm:ss', keyboardType: 'numbers-and-punctuation', autoCorrect: false, maxLength: 8 }, 'pace')}
            {row('pace', t('Ritmo'), { placeholder: '5:30 /km', autoCorrect: false, maxLength: 20 }, 'result_position')}
            {row('result_position', t('Posición general'), { placeholder: '412', autoCorrect: false, maxLength: 60 }, 'category')}
            {row('category', t('Categoría'), { placeholder: t('Libre varonil'), autoCapitalize: 'sentences', maxLength: 40 }, 'category_position')}
            {row('category_position', t('Pos. en categoría'), { placeholder: '31', autoCorrect: false, maxLength: 20 }, 'gender_position')}
            {row('gender_position', t('Pos. por rama'), { placeholder: '88', autoCorrect: false, maxLength: 20, last: true })}
          </FormGroup>

          <FormGroup title={t('Dedicatoria')}>{area('dedication', t('Dedicatoria'), t('A quién le dedicas esta meta…'), 600, 72)}</FormGroup>

          <FormGroup title={t('Mi historia')} footer={t('Cuéntalo con tus palabras. Puedes volver a editarlo cuando quieras.')}>
            {area('body', t('Mi historia'), t('Cómo llegaste a la salida, qué pasó en el camino, qué sentiste al cruzar la meta…'), 8000, 180)}
          </FormGroup>
        </View>
      </ScrollView>

      {/* Edge-to-edge: the window does not resize, so the form makes room for the keyboard itself. */}
      <Animated.View style={spacerStyle} />

      <ConfirmDialog
        visible={confirmLeave}
        title={t('¿Descartar los cambios?')}
        description={t('Lo que escribiste en esta pantalla no se guardará.')}
        confirmLabel={t('Descartar')}
        onConfirm={() => {
          setConfirmLeave(false);
          reset(toFormValues(story));
          leave();
        }}
        onCancel={() => setConfirmLeave(false)}
      />
    </View>
  );
}

export default function EditStoryScreen() {
  const { t } = useI18n();
  const { publicId = '' } = useLocalSearchParams<{ publicId?: string }>();
  const insets = useSafeAreaInsets();
  const story = useEditableStory(publicId);

  if (story.data) return <EditForm key={story.data.public_id} story={story.data} publicId={publicId} />;

  const missing = story.error instanceof AppError && story.error.kind === 'not_found';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ paddingHorizontal: spacing.md }}>
        <TopBar title={t('Editar recuerdo')} onBack={leave} />
      </View>
      {story.isError ? (
        <ErrorState
          error={story.error}
          title={missing ? t('Aún no disponible') : undefined}
          message={missing ? t('Todavía no podemos editar este recuerdo desde la app. Mientras tanto puedes hacerlo en finisherlegacy.com.') : t('No pudimos cargar tu recuerdo.')}
          onRetry={missing ? undefined : story.refetch}
          onBack={leave}
        />
      ) : (
        <View style={{ padding: spacing.md, gap: spacing.lg }}>
          <Skeleton height={54} radius={radius.lg} />
          <Skeleton height={210} radius={radius.lg} />
          <Skeleton height={320} radius={radius.lg} />
        </View>
      )}
    </View>
  );
}
