import { router, useLocalSearchParams } from 'expo-router';
import { MapPin } from 'lucide-react-native';
import { useEffect } from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { EmptyState } from '@/components/empty-state';
import { Skeleton } from '@/components/skeleton';
import { TopBar } from '@/components/ui/top-bar';
import { TrackingConsentFlow } from '@/features/tracking/components/tracking-consent-flow';
import { TrackingLivePanel } from '@/features/tracking/components/tracking-live-panel';
import { loadTrackingRecord, useTrackingStore } from '@/features/tracking/tracking-storage';
import { useEventParticipant } from '@/hooks/use-my-events';
import { colors, spacing } from '@/theme/tokens';
import { useI18n } from '@/i18n';

/**
 * Live tracking for one participation: consent → permissions → live
 * panel. Opening this screen never starts GPS by itself.
 */
export default function TrackingScreen() {
  const { t } = useI18n();
  const { participantId: param } = useLocalSearchParams<{ participantId: string }>();
  const parsed = Number(param);
  const participantId = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  const participant = useEventParticipant(participantId);
  const { record, hydrated } = useTrackingStore();

  useEffect(() => {
    loadTrackingRecord().catch(() => {});
  }, []);

  const eventName = participant.data?.participant.event ?? null;

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar title={t('Seguimiento en vivo')} />
      </View>

      {participantId === null ? (
        <EmptyState icon={MapPin} title={t('No encontramos esta carrera')} message={t('Vuelve a Mis eventos e inténtalo desde ahí.')} actionLabel={t('Ir a Mis eventos')} onAction={() => router.replace('/my-events')} />
      ) : !hydrated ? (
        <View style={{ padding: spacing.lg, gap: spacing.md }}>
          <Skeleton height={28} width="60%" />
          <Skeleton height={120} radius={16} />
        </View>
      ) : record && record.participantId === participantId ? (
        <TrackingLivePanel record={record} eventName={eventName} onStopped={() => router.back()} />
      ) : record ? (
        <View style={{ flex: 1 }}>
          <EmptyState
            icon={MapPin}
            title={t('Ya tienes un seguimiento activo')}
            message={t('Solo puede haber uno a la vez. Ábrelo para detenerlo antes de iniciar otro.')}
          />
          <View style={{ padding: spacing.lg }}>
            <AppButton label={t('Ver seguimiento activo')} onPress={() => router.replace(`/tracking/${record.participantId}`)} />
          </View>
        </View>
      ) : (
        <TrackingConsentFlow participantId={participantId} eventName={eventName} onStarted={() => {}} />
      )}
    </SafeAreaView>
  );
}
