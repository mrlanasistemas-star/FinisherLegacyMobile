import { useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { TopBar } from '@/components/ui/top-bar';
import { LiveViewer } from '@/features/family/components/live-viewer';
import { useFollowingSnapshot } from '@/hooks/use-family';
import { useI18n } from '@/i18n';
import { colors, spacing } from '@/theme/tokens';

/**
 * "Siguiendo a…" — a live share addressed to me as family (the push
 * "X está compartiendo su ubicación" lands here). The server decides access
 * on every refresh; 404/410 stops polling and shows no position.
 */
export default function FollowingScreen() {
  const { t } = useI18n();
  const { uuid } = useLocalSearchParams<{ uuid: string }>();
  const shareUuid = typeof uuid === 'string' && /^[0-9a-f-]{36}$/i.test(uuid) ? uuid : null;
  const snapshot = useFollowingSnapshot(shareUuid);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}
        refreshControl={<BrandRefreshControl refreshing={snapshot.isRefetching} onRefresh={snapshot.refetch} />}>
        <TopBar title={t('Seguimiento en vivo')} />
        <LiveViewer
          data={snapshot.data}
          error={shareUuid ? snapshot.error : { status: 404 }}
          isPending={shareUuid !== null && snapshot.isPending}
          onRetry={snapshot.refetch}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
