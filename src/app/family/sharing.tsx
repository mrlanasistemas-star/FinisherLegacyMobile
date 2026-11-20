import { router, useLocalSearchParams, type Href } from 'expo-router';
import { Link2, LocateFixed, MapPinOff, Share2, Users } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { Pressable, Share, View } from 'react-native';

import type { SessionSharingState, SessionShare, ShareDuration } from '@/api/family';
import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { Skeleton } from '@/components/skeleton';
import { Chip } from '@/components/ui/chip';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InlineError } from '@/components/ui/inline-error';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { LargeTitleScroll } from '@/components/ui/top-bar';
import { PersonRow } from '@/features/family/components/person-row';
import { useRevokeSessionShare, useShareTrackingSession, useSharingOverview, useStopSharingSession } from '@/hooks/use-family';
import { useI18n } from '@/i18n';
import { showToast } from '@/stores/toastStore';
import { colors, radius, spacing } from '@/theme/tokens';
import { formatDateTime } from '@/utils/dates';

/**
 * "Quién ve mi ubicación" (docs/renovacion/familia.md) — reached from
 * Familia and from the live tracking screen. For each running session:
 * who sees it right now (remove one), "Dejar de compartir ahora", and a
 * new share — whom (all / chosen family, and/or a public link) and for how
 * long. Every share also ends on its own when the session stops.
 */
export default function SharingScreen() {
  const { t } = useI18n();
  const { session: focusSession } = useLocalSearchParams<{ session?: string }>();
  const overview = useSharingOverview();

  const sessions = useMemo(() => {
    const list = overview.data?.sessions ?? [];
    // The session we came from (live tracking screen) first.
    return [...list].sort((a, b) => Number(b.session.uuid === focusSession) - Number(a.session.uuid === focusSession));
  }, [overview.data, focusSession]);

  return (
    <LargeTitleScroll
      title={t('Quién ve mi ubicación')}
      subtitle={t('Tú decides con quién compartir y por cuánto tiempo.')}
      refreshControl={<BrandRefreshControl refreshing={overview.isRefetching} onRefresh={overview.refetch} />}
      contentContainerStyle={{ gap: spacing.lg }}>
      {overview.isPending ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={140} radius={16} />
          <Skeleton height={200} radius={16} />
        </View>
      ) : overview.isError ? (
        <ErrorState message={t('No pudimos cargar lo que compartes.')} onRetry={overview.refetch} />
      ) : sessions.length === 0 ? (
        <EmptyState
          icon={MapPinOff}
          title={t('No estás compartiendo tu ubicación')}
          message={t('Nadie puede verte ahora. Cuando inicies el seguimiento en vivo de una carrera podrás compartirlo desde aquí.')}
        />
      ) : (
        sessions.map((state) => <SessionSharing key={state.session.uuid} state={state} family={overview.data!.family} />)
      )}

      <ListGroup>
        <ListRow icon={Users} label={t('Administrar mi familia')} description={t('Invitar, cambiar etiquetas o quitar personas')} onPress={() => router.push('/family' as Href)} />
      </ListGroup>
    </LargeTitleScroll>
  );
}

const DURATIONS: ShareDuration[] = ['until_stop', '2h', '6h', '24h'];

function SessionSharing({ state, family }: { state: SessionSharingState; family: NonNullable<ReturnType<typeof useSharingOverview>['data']>['family'] }) {
  const { t } = useI18n();
  const share = useShareTrackingSession();
  const stop = useStopSharingSession();
  const revoke = useRevokeSessionShare();
  const [selected, setSelected] = useState<string[]>([]);
  const [publicLink, setPublicLink] = useState(false);
  const [duration, setDuration] = useState<ShareDuration>('until_stop');
  const [error, setError] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [removing, setRemoving] = useState<SessionShare | null>(null);

  const alreadySharing = new Set(state.shares.map((s) => s.family_link_uuid).filter(Boolean));
  const allSelected = family.length > 0 && selected.length === family.length;

  function toggle(uuid: string) {
    setSelected((list) => (list.includes(uuid) ? list.filter((u) => u !== uuid) : [...list, uuid]));
  }

  async function submit() {
    setError(null);
    if (selected.length === 0 && !publicLink) {
      setError(t('Elige al menos a una persona o crea un enlace.'));
      return;
    }
    try {
      const result = await share.mutateAsync({
        sessionUuid: state.session.uuid,
        payload: { family: allSelected ? 'all' : selected.length > 0 ? 'selected' : 'none', family_link_ids: selected, public_link: publicLink, duration },
      });
      setSelected([]);
      setPublicLink(false);
      showToast(t('Ubicación compartida.'), 'success');
      if (result.link) {
        await Share.share({
          message: state.session.event_name
            ? t('Sígueme en vivo en {event}: {url}', { event: state.session.event_name, url: result.link.url })
            : t('Sígueme en vivo: {url}', { url: result.link.url }),
          url: result.link.url,
        });
      }
    } catch (e) {
      setError(e instanceof AppError ? e.message : t('No pudimos compartir tu ubicación. Intenta otra vez.'));
    }
  }

  const durationLabels: Record<ShareDuration, string> = {
    until_stop: t('Hasta que termine'),
    '2h': t('2 h'),
    '6h': t('6 h'),
    '24h': t('24 h'),
  };

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ gap: 4, paddingHorizontal: spacing.xs }}>
        <AppText variant="label" tone="gold">
          {t('EN VIVO')}
        </AppText>
        <AppText variant="title">{state.session.event_name ?? t('Seguimiento en vivo')}</AppText>
      </View>

      <ListGroup
        title={t('Lo ven ahora')}
        footer={state.shares.length > 0 ? t('Al detener tu seguimiento, todos dejan de verte automáticamente.') : undefined}>
        {state.shares.length === 0 ? (
          <ListRow icon={MapPinOff} label={t('Nadie')} description={t('Todavía no compartes esta actividad.')} />
        ) : (
          state.shares.map((item, index) => (
            <PersonRow
              key={item.uuid}
              person={item.contact}
              fallbackName={item.audience === 'link' ? t('Enlace público') : (item.label ?? t('Familiar'))}
              caption={[item.contact ? item.label : null, describeExpiry(item, t)].filter(Boolean).join(' · ')}
              trailing={
                <Pressable
                  onPress={() => setRemoving(item)}
                  accessibilityRole="button"
                  accessibilityLabel={t('Dejar de compartir con esta persona')}
                  style={{ minHeight: 44, paddingHorizontal: spacing.sm, justifyContent: 'center' }}>
                  <AppText variant="caption" tone="destructive">
                    {t('Quitar')}
                  </AppText>
                </Pressable>
              }
              divider={index < state.shares.length - 1}
            />
          ))
        )}
      </ListGroup>

      {state.shares.length > 0 ? (
        <AppButton label={t('Dejar de compartir ahora')} icon={MapPinOff} variant="destructive" onPress={() => setConfirmStop(true)} />
      ) : null}

      <View style={{ gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline }}>
        <AppText variant="bodyStrong">{t('Compartir con')}</AppText>
        {family.length === 0 ? (
          <AppText variant="caption" tone="muted">
            {t('Aún no tienes familia. Invita a alguien para compartirle tu ubicación sin enviarle enlaces.')}
          </AppText>
        ) : (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
            <Chip label={t('Toda mi familia')} icon={Users} selected={allSelected} onPress={() => setSelected(allSelected ? [] : family.map((f) => f.uuid))} />
            {family.map((person) => (
              <Chip
                key={person.uuid}
                label={alreadySharing.has(person.uuid) ? t('{name} · ya lo ve', { name: person.label ?? person.contact?.name ?? '' }) : (person.label ?? person.contact?.name ?? t('Familiar'))}
                selected={selected.includes(person.uuid)}
                onPress={() => toggle(person.uuid)}
              />
            ))}
          </View>
        )}
        <Chip label={t('Enlace público para quien no tiene cuenta')} icon={Link2} selected={publicLink} onPress={() => setPublicLink((v) => !v)} />

        <AppText variant="bodyStrong">{t('Por cuánto tiempo')}</AppText>
        <SegmentedControl options={DURATIONS.map((value) => ({ value, label: durationLabels[value] }))} value={duration} onChange={setDuration} />

        <InlineError message={error} />
        <AppButton label={t('Compartir ubicación')} icon={publicLink ? Share2 : LocateFixed} loading={share.isPending} onPress={submit} />
      </View>

      <ConfirmDialog
        visible={confirmStop}
        title={t('¿Dejar de compartir ahora?')}
        description={t('Nadie podrá ver tu ubicación, tampoco con los enlaces que enviaste. Tu seguimiento sigue grabando.')}
        confirmLabel={t('Dejar de compartir')}
        destructive
        loading={stop.isPending}
        onConfirm={async () => {
          try {
            await stop.mutateAsync(state.session.uuid);
            showToast(t('Dejaste de compartir tu ubicación.'), 'success');
            setConfirmStop(false);
          } catch {
            showToast(t('No pudimos completar la acción. Intenta otra vez.'), 'destructive');
          }
        }}
        onCancel={() => setConfirmStop(false)}
      />
      <ConfirmDialog
        visible={removing !== null}
        title={removing?.audience === 'link' ? t('¿Desactivar este enlace?') : t('¿Dejar de compartir con esta persona?')}
        description={t('Dejará de ver tu ubicación de inmediato.')}
        confirmLabel={t('Quitar')}
        destructive
        loading={revoke.isPending}
        onConfirm={async () => {
          if (!removing) return;
          try {
            await revoke.mutateAsync(removing.uuid);
            setRemoving(null);
          } catch {
            showToast(t('No pudimos completar la acción. Intenta otra vez.'), 'destructive');
          }
        }}
        onCancel={() => setRemoving(null)}
      />
    </View>
  );
}

function describeExpiry(share: SessionShare, t: ReturnType<typeof useI18n>['t']): string {
  const hoursLeft = (Date.parse(share.expires_at) - Date.now()) / 3_600_000;
  // "Hasta que termine" shares carry the long global cap as expiry.
  if (share.ends_with_session && hoursLeft > 24) return t('Hasta que termines');
  return t('Hasta {date}', { date: formatDateTime(share.expires_at) });
}
