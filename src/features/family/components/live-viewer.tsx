import { Crosshair, MapPinOff } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import type { LiveSnapshot } from '@/api/family';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { formatAgo, formatDistance } from '@/features/tracking/format';
import { useNow } from '@/features/tracking/use-live-tracking';
import { useI18n } from '@/i18n';
import { colors, radius, spacing } from '@/theme/tokens';

import { LiveMap } from './live-map';

/** Matches the server's `tracking.paused_after_seconds`. */
const PAUSED_AFTER_MS = 180_000;

export type ViewerStatus = 'waiting' | 'active' | 'paused' | 'stopped';

/** Server status, plus "paused" locally once no fix arrived for 3 min. */
export function effectiveStatus(snapshot: LiveSnapshot, now: number): ViewerStatus {
  if (snapshot.status === 'active' && snapshot.last_point && now - Date.parse(snapshot.last_point.recorded_at) > PAUSED_AFTER_MS) {
    return 'paused';
  }
  return snapshot.status;
}

export function StatusBadge({ status }: { status: ViewerStatus }) {
  const { t } = useI18n();
  switch (status) {
    case 'active':
      return <Badge label={t('En curso')} variant="success" />;
    case 'paused':
      return <Badge label={t('Pausado')} variant="warning" />;
    case 'stopped':
      return <Badge label={t('Finalizado')} variant="neutral" />;
    default:
      return <Badge label={t('Aún no comienza')} variant="neutral" />;
  }
}

interface LiveViewerProps {
  data: LiveSnapshot | undefined;
  error: unknown;
  isPending: boolean;
  onRetry: () => void;
}

/**
 * What a family member (or anyone with a link) sees: who, status, last
 * update ("hace 2 min"), distance and the map. When the share is gone the
 * server answers 404/410 and this shows no position at all — the map is
 * only ever drawn for a running session.
 */
export function LiveViewer({ data, error, isPending, onRetry }: LiveViewerProps) {
  const { t } = useI18n();
  const now = useNow(15_000);
  const [recenter, setRecenter] = useState(0);
  const status = (error as { status?: number } | null)?.status;

  if (isPending) {
    return (
      <View style={{ gap: spacing.md }}>
        <Skeleton height={64} radius={16} />
        <Skeleton height={320} radius={16} />
      </View>
    );
  }

  if (status === 410) {
    return (
      <EmptyState
        icon={MapPinOff}
        title={t('El seguimiento terminó')}
        message={t('La actividad finalizó o se acabó el tiempo que eligió para compartir. Por privacidad ya no mostramos su ubicación.')}
      />
    );
  }

  if (status === 404 || status === 403) {
    return (
      <EmptyState
        icon={MapPinOff}
        title={t('Este seguimiento ya no está disponible')}
        message={t('Puede que haya dejado de compartirlo contigo. Te avisaremos cuando vuelva a compartir su ubicación.')}
      />
    );
  }

  if (error || !data) {
    return <ErrorState message={t('No pudimos cargar el seguimiento.')} onRetry={onRetry} />;
  }

  const live = effectiveStatus(data, now);
  const running = live === 'active' || live === 'paused';
  const title = [data.event.name, data.event.race].filter(Boolean).join(' · ');

  return (
    <View style={{ gap: spacing.lg }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Avatar uri={data.athlete.avatar_url} name={data.athlete.display_name} size={56} ring />
        <View style={{ flex: 1, gap: 4 }}>
          {title ? (
            <AppText variant="label" tone="gold" numberOfLines={1}>
              {title}
            </AppText>
          ) : null}
          <AppText variant="title" numberOfLines={2} accessibilityRole="header">
            {data.athlete.display_name}
          </AppText>
        </View>
        <StatusBadge status={live} />
      </View>

      {running ? (
        <View style={{ gap: spacing.sm }}>
          <LiveMap path={data.path} current={data.last_point} recenterKey={recenter} />
          {data.last_point ? (
            <AppButton label={t('Centrar en su posición')} icon={Crosshair} variant="secondary" size="sm" fullWidth={false} onPress={() => setRecenter((n) => n + 1)} />
          ) : null}
        </View>
      ) : (
        <View style={{ padding: spacing.lg, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline, gap: spacing.xs }}>
          <AppText variant="bodyStrong">{live === 'stopped' ? t('Terminó su actividad') : t('Aún no comienza')}</AppText>
          <AppText variant="caption" tone="muted">
            {live === 'stopped'
              ? t('Por privacidad ya no mostramos su ubicación.')
              : t('Cuando inicie el seguimiento desde su teléfono, aquí verás su avance en tiempo real.')}
          </AppText>
        </View>
      )}

      <View style={{ flexDirection: 'row', gap: spacing.md }}>
        <Metric label={t('Recorrido||distancia recorrida hasta ahora')} value={formatDistance(data.distance_m)} />
        <Metric label={t('Última actualización')} value={running ? formatAgo(data.last_point?.recorded_at ?? null, now) : '—'} />
      </View>

      {live === 'paused' ? (
        <AppText variant="caption" tone="muted">
          {t('Pausó su actividad o está en una zona sin señal.')}
        </AppText>
      ) : null}
    </View>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ flex: 1, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline, gap: 4 }}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <AppText variant="title">{value}</AppText>
    </View>
  );
}
