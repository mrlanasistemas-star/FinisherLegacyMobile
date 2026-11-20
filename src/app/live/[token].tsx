import { useLocalSearchParams } from 'expo-router';
import { ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { TopBar } from '@/components/ui/top-bar';
import { LiveViewer } from '@/features/family/components/live-viewer';
import { usePublicLiveSnapshot } from '@/hooks/use-family';
import { useI18n } from '@/i18n';
import { colors, spacing } from '@/theme/tokens';

/**
 * A public share link (`https://finisherlegacy.com/live/{token}` or
 * `finisherlegacy://live/{token}`) opened with the app installed — same
 * data as the web page, no account needed.
 */
export default function PublicLiveScreen() {
  const { t } = useI18n();
  const { token: param } = useLocalSearchParams<{ token: string }>();
  const token = typeof param === 'string' && /^[A-Za-z0-9]{20,128}$/.test(param) ? param : null;
  const snapshot = usePublicLiveSnapshot(token);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.lg }}
        refreshControl={<BrandRefreshControl refreshing={snapshot.isRefetching} onRefresh={snapshot.refetch} />}>
        <TopBar title={t('Seguimiento en vivo')} />
        <LiveViewer data={snapshot.data} error={token ? snapshot.error : { status: 404 }} isPending={token !== null && snapshot.isPending} onRetry={snapshot.refetch} />
      </ScrollView>
    </SafeAreaView>
  );
}
