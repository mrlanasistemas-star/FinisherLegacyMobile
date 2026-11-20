/**
 * Registrar actividad pasada — manual entry of a workout the athlete already
 * did (no timer, no GPS). Always labeled "Manual" in the history and never
 * counted for records. Goes through the offline outbox, so it can be saved
 * without signal and is sent when the connection returns.
 */
import * as Network from 'expo-network';
import { router } from 'expo-router';
import { ChevronLeft, ChevronRight, PenLine } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { ErrorState } from '@/components/error-state';
import { FormInput } from '@/components/form-input';
import { Skeleton } from '@/components/skeleton';
import { Chip } from '@/components/ui/chip';
import { IconButton } from '@/components/ui/icon-button';
import { TopBar } from '@/components/ui/top-bar';
import { StatusBarScrim } from '@/components/ui/status-bar-scrim';
import { bootstrapWorkouts } from '@/features/training/workout/workout-controller';
import { enqueue } from '@/features/training/workout/workout-outbox';
import { useWorkoutSports } from '@/features/training/workout/use-workouts';
import { getLocale, useI18n } from '@/i18n';
import { showToast } from '@/stores/toastStore';
import { colors, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';
import { uuidv4 } from '@/utils/uuid';

const MAX_DAYS_BACK = 365;

/** "12,5" or "12.5" → meters; null when empty; NaN when invalid. */
function parseKm(value: string): number | null {
  const clean = value.trim().replace(',', '.');
  if (!clean) return null;
  const km = Number(clean);
  return Number.isFinite(km) && km >= 0 ? Math.round(km * 1000) : Number.NaN;
}

export default function LogPastActivityScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const sports = useWorkoutSports();
  const [sportId, setSportId] = useState<number | null>(null);
  const [daysBack, setDaysBack] = useState(0);
  const [time, setTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:00`;
  });
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [km, setKm] = useState('');
  const [notes, setNotes] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const list = sports.data ?? [];
  const sport = list.find((s) => s.id === sportId) ?? null;
  const day = new Date();
  day.setDate(day.getDate() - daysBack);
  const dayLabel = daysBack === 0 ? t('Hoy') : daysBack === 1 ? t('Ayer') : day.toLocaleDateString(getLocale(), { weekday: 'short', day: 'numeric', month: 'short' });

  const save = async () => {
    const next: Record<string, string> = {};
    if (!sport) next.sport = t('Elige una actividad.');
    const match = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
    const h = match ? Number(match[1]) : -1;
    const m = match ? Number(match[2]) : -1;
    if (!match || h > 23 || m > 59) next.time = t('Escribe la hora como 07:30.');
    const durationS = (Number(hours || 0) * 60 + Number(minutes || 0)) * 60;
    if (!Number.isFinite(durationS) || durationS < 60) next.duration = t('La duración mínima es de 1 minuto.');
    if (durationS > 48 * 3600) next.duration = t('La duración es demasiado larga.');
    const distanceM = parseKm(km);
    if (distanceM !== null && (Number.isNaN(distanceM) || distanceM > 1_000_000)) next.km = t('Escribe la distancia en kilómetros, por ejemplo 10.5');

    const startedAt = new Date(day);
    startedAt.setHours(h, m, 0, 0);
    if (!next.time && startedAt.getTime() > Date.now()) next.time = t('La fecha no puede estar en el futuro.');
    setErrors(next);
    if (Object.keys(next).length > 0 || !sport) return;

    setSaving(true);
    const clientUuid = uuidv4();
    await enqueue({
      kind: 'manual',
      clientUuid,
      body: {
        source: 'manual',
        sport_id: sport.id,
        client_uuid: clientUuid,
        started_at: startedAt.toISOString(),
        duration_s: durationS,
        distance_m: distanceM,
        notes: notes.trim() || null,
      },
      summary: { sportName: sport.name, sportSlug: sport.slug, source: 'manual', startedAt: startedAt.toISOString(), durationS, distanceM },
    });
    const net = await Network.getNetworkStateAsync().catch(() => null);
    setSaving(false);
    haptics.success();
    showToast(net?.isConnected === false ? t('Actividad guardada en tu teléfono. Se enviará al volver la señal.') : t('Actividad registrada'), 'success');
    router.back();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ paddingTop: insets.top, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + 140, gap: spacing.lg }}>
        <TopBar title={t('Registrar actividad pasada')} large />
        <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start', marginTop: -spacing.md }}>
          <PenLine size={16} color={colors.muted} style={{ marginTop: 3 }} />
          <AppText variant="body" tone="muted" style={{ flex: 1 }}>
            {t('Para algo que ya hiciste sin la app. Queda marcado como «Manual» y no cuenta para tus récords.')}
          </AppText>
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="eyebrow" tone="subtle">
            {t('Actividad')}
          </AppText>
          {sports.isPending ? (
            <Skeleton height={44} radius={radius.pill} />
          ) : sports.isError ? (
            <ErrorState error={sports.error} onRetry={() => sports.refetch()} message={t('No pudimos cargar las actividades.')} />
          ) : (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {list.map((item) => (
                <Chip key={item.id} label={item.name} selected={item.id === sportId} onPress={() => setSportId(item.id)} />
              ))}
            </View>
          )}
          {errors.sport ? (
            <AppText variant="caption" tone="destructive">
              {errors.sport}
            </AppText>
          ) : null}
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="eyebrow" tone="subtle">
            {t('Cuándo')}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <IconButton icon={ChevronLeft} label={t('Día anterior')} onPress={() => setDaysBack((d) => Math.min(MAX_DAYS_BACK, d + 1))} />
            <AppText variant="bodyStrong" style={{ flex: 1, textAlign: 'center' }} accessibilityLiveRegion="polite">
              {dayLabel}
            </AppText>
            <IconButton icon={ChevronRight} label={t('Día siguiente')} onPress={() => setDaysBack((d) => Math.max(0, d - 1))} disabled={daysBack === 0} />
          </View>
          <FormInput label={t('Hora de inicio')} value={time} onChangeText={setTime} kind="number" placeholder="07:30" error={errors.time} keyboardType="numbers-and-punctuation" />
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="eyebrow" tone="subtle">
            {t('Duración')}
          </AppText>
          <View style={{ flexDirection: 'row', gap: spacing.sm }}>
            <FormInput label={t('Horas')} value={hours} onChangeText={setHours} kind="number" containerStyle={{ flex: 1 }} />
            <FormInput label={t('Minutos')} value={minutes} onChangeText={setMinutes} kind="number" containerStyle={{ flex: 1 }} />
          </View>
          {errors.duration ? (
            <AppText variant="caption" tone="destructive">
              {errors.duration}
            </AppText>
          ) : null}
        </View>

        <FormInput label={t('Distancia en km (opcional)')} value={km} onChangeText={setKm} kind="decimal" placeholder="10.5" error={errors.km} hint={t('Déjala vacía si no la sabes.')} />
        <FormInput label={t('Notas (opcional)')} value={notes} onChangeText={setNotes} multiline maxLength={1000} />
      </ScrollView>
      <StatusBarScrim />

      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: spacing.lg, paddingTop: spacing.sm, paddingBottom: insets.bottom + spacing.md, backgroundColor: colors.background, borderTopWidth: 1, borderTopColor: colors.hairline }}>
        <AppButton label={t('Guardar actividad')} onPress={() => void bootstrapWorkouts().then(save)} loading={saving} />
      </View>
    </View>
  );
}
