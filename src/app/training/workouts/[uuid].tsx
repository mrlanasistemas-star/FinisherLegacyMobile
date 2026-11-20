/**
 * Detalle de un entrenamiento guardado (the server's copy): numbers, route,
 * notes (editable), whether it was live or registered by hand, and the two
 * explicit actions — share as a Legacy Moment (private by default) and
 * delete from the history.
 */
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Share2, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ErrorState } from '@/components/error-state';
import { FormInput } from '@/components/form-input';
import { Skeleton } from '@/components/skeleton';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconButton } from '@/components/ui/icon-button';
import { TopBar } from '@/components/ui/top-bar';
import { StatusBarScrim } from '@/components/ui/status-bar-scrim';
import { workoutDateLabel } from '@/features/training/workout/format';
import { RouteShape } from '@/features/training/workout/components/route-shape';
import { ShareMomentSheet } from '@/features/training/workout/components/share-moment-sheet';
import { WorkoutStats } from '@/features/training/workout/components/workout-stats';
import { useDeleteWorkout, useUpdateWorkout, useWorkout } from '@/features/training/workout/use-workouts';
import { useI18n } from '@/i18n';
import { showToast } from '@/stores/toastStore';
import { colors, radius, spacing } from '@/theme/tokens';

export default function WorkoutDetailScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const query = useWorkout(uuid ?? null);
  const update = useUpdateWorkout(uuid ?? '');
  const remove = useDeleteWorkout();
  // null = untouched, so the field shows the server's notes.
  const [draft, setDraft] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const w = query.data;

  const notes = draft ?? w?.notes ?? '';
  const setNotes = setDraft;

  const body = (() => {
    if (query.isPending) return <Skeleton height={220} radius={radius.lg} />;
    if (query.isError || !w) return <ErrorState error={query.error} onRetry={() => query.refetch()} message={t('No pudimos cargar este entrenamiento.')} />;
    const metric = w.sport?.metric ?? 'pace';
    return (
      <>
        <View style={{ gap: spacing.xs }}>
          <View style={{ flexDirection: 'row', gap: spacing.xs, flexWrap: 'wrap' }}>
            <Badge label={w.source === 'manual' ? t('Registrado manualmente') : t('En vivo')} variant={w.source === 'manual' ? 'neutral' : 'gold'} />
            {w.auto_closed ? <Badge label={t('Cerrado automáticamente')} /> : null}
          </View>
          <AppText variant="caption" tone="muted">
            {workoutDateLabel(w.started_at)}
          </AppText>
          {w.auto_closed ? (
            <AppText variant="caption" tone="subtle">
              {t('Quedó abierto mucho tiempo y lo cerramos con los últimos datos que recibimos.')}
            </AppText>
          ) : null}
        </View>

        <WorkoutStats
          metric={metric}
          usesGps={w.uses_gps}
          manual={w.source === 'manual'}
          durationS={w.duration_s}
          movingS={w.moving_s}
          distanceM={w.distance_m}
          paceSecondsPerKm={w.avg_pace_s_per_km}
          speedMps={w.avg_speed_mps}
          elevationGainM={w.elevation_gain_m}
          best5kS={w.best_5k_s}
          best10kS={w.best_10k_s}
        />

        {w.route_polyline ? <RouteShape polyline={w.route_polyline} label={t('Tu recorrido')} /> : null}

        <View style={{ gap: spacing.xs }}>
          <FormInput label={t('Notas')} value={notes} onChangeText={setNotes} multiline maxLength={1000} placeholder={t('Cómo te sentiste, clima, ruta…')} />
          {notes !== (w.notes ?? '') ? (
            <AppButton
              label={t('Guardar notas')}
              size="sm"
              variant="secondary"
              loading={update.isPending}
              onPress={() =>
                update.mutate(
                  { notes: notes.trim() || null },
                  { onSuccess: () => showToast(t('Cambios guardados'), 'success'), onError: (e) => showToast(e.message, 'destructive') },
                )
              }
            />
          ) : null}
        </View>

        {w.moment ? (
          <AppButton label={t('Ver mi momento')} variant="secondary" onPress={() => router.push(`/moments/${w.moment!.uuid}` as Href)} />
        ) : (
          <AppButton label={t('Compartir como Legacy Moment')} variant="secondary" icon={Share2} onPress={() => setShareOpen(true)} />
        )}
      </>
    );
  })();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.xxl, gap: spacing.lg }}>
        <TopBar title={w?.sport?.name ?? t('Entrenamiento')} right={w ? <IconButton icon={Trash2} label={t('Eliminar entrenamiento')} onPress={() => setConfirmDelete(true)} /> : undefined} />
        {body}
      </ScrollView>
      <StatusBarScrim />

      {uuid ? <ShareMomentSheet uuid={uuid} visible={shareOpen} onClose={() => setShareOpen(false)} /> : null}

      <ConfirmDialog
        visible={confirmDelete}
        title={t('¿Eliminar este entrenamiento?')}
        description={t('Se quita de tu historial y de tu progreso. Si lo compartiste como momento, ese momento se queda hasta que lo borres.')}
        confirmLabel={t('Eliminar')}
        destructive
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() =>
          uuid &&
          remove.mutate(uuid, {
            onSuccess: () => {
              setConfirmDelete(false);
              showToast(t('Entrenamiento eliminado'));
              router.back();
            },
            onError: (e) => {
              setConfirmDelete(false);
              showToast(e.message, 'destructive');
            },
          })
        }
      />
    </View>
  );
}
