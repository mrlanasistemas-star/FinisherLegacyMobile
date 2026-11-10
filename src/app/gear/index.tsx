import { router, type Href } from 'expo-router';
import { ChevronLeft, KeyRound, Nfc, Shirt } from 'lucide-react-native';
import { View } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { GearCard } from '@/components/gear-card';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { StaggerItem } from '@/components/motion/reveal';
import { ScrollHeader, useScrollY } from '@/components/motion/scroll-header';
import { Skeleton } from '@/components/skeleton';
import { IconButton } from '@/components/ui/icon-button';
import { useMyGear } from '@/hooks/use-gear';
import { useI18n } from '@/i18n';
import { colors, spacing } from '@/theme/tokens';

const NAV_HEIGHT = 52;
const ACTIVATE_HREF = '/activate' as Href;

/** Mi equipo — every Finisher piece connected to your story. New pieces join by an NFC tap. */
export default function GearScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { scrollY, onScroll } = useScrollY();
  const { data, isPending, isError, error, refetch, isRefetching } = useMyGear();
  const gear = data ?? [];
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/legacy'));

  const header = (
    <View style={{ paddingBottom: spacing.md, gap: spacing.md }}>
      <View style={{ gap: 2 }}>
        <AppText variant="display" accessibilityRole="header">
          {t('Mi equipo')}
        </AppText>
        <AppText variant="body" tone="muted">
          {t('Tus piezas Finisher Legacy, conectadas a tu historia.')}
        </AppText>
      </View>
      {gear.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm }}>
          <AppButton label={t('Activar con NFC')} icon={Nfc} size="md" onPress={() => router.push(ACTIVATE_HREF)} style={{ flex: 1 }} />
          <AppButton label={t('Código impreso')} icon={KeyRound} size="md" variant="secondary" onPress={() => router.push('/gear/claim')} style={{ flex: 1 }} />
        </View>
      ) : null}
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Animated.FlatList
        onScroll={onScroll}
        scrollEventThrottle={16}
        data={isPending || isError ? [] : gear}
        keyExtractor={(item) => item.uuid}
        ListHeaderComponent={header}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg, paddingTop: insets.top + NAV_HEIGHT, paddingBottom: insets.bottom + spacing.xl, flexGrow: 1 }}
        refreshControl={<BrandRefreshControl refreshing={isRefetching} onRefresh={refetch} progressViewOffset={insets.top + NAV_HEIGHT} />}
        renderItem={({ item, index }) => (
          <StaggerItem index={index}>
            <GearCard gear={item} onPress={() => router.push(`/gear/${item.uuid}`)} />
          </StaggerItem>
        )}
        ListEmptyComponent={
          isPending ? (
            <View style={{ gap: spacing.sm }}>
              <Skeleton height={80} radius={16} />
              <Skeleton height={80} radius={16} />
            </View>
          ) : isError ? (
            <ErrorState error={error} message={t('No pudimos cargar tu equipo.')} onRetry={refetch} />
          ) : (
            <EmptyState
              icon={Shirt}
              title={t('Conecta tu primera pieza')}
              message={t('Acerca tu teléfono a la etiqueta NFC de tu Tag, prenda o accesorio Finisher Legacy y aparecerá aquí.')}
              actionLabel={t('Activar con NFC')}
              onAction={() => router.push(ACTIVATE_HREF)}
              secondaryLabel={t('Tengo un código impreso')}
              onSecondary={() => router.push('/gear/claim')}
            />
          )
        }
      />

      <ScrollHeader scrollY={scrollY} title={t('Mi equipo')} threshold={60} left={<IconButton icon={ChevronLeft} label={t('Volver')} onPress={goBack} size={26} />} />
    </View>
  );
}
