import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, Share2, User } from 'lucide-react-native';
import { Pressable, Share, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { GoldGlow } from '@/components/brand/gold-glow';
import { MetricNumber } from '@/components/brand/metric-number';
import { ErrorState } from '@/components/error-state';
import { Reveal } from '@/components/motion/reveal';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { usePublicAthlete } from '@/hooks/use-public-athlete';
import { colors, radius, spacing } from '@/theme/tokens';

export default function PublicAthleteScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { data, isPending, isError, refetch } = usePublicAthlete(username);

  return (
    <Screen scroll edges={['top', 'left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver">
          <ChevronLeft color={colors.foreground} size={26} />
        </Pressable>
        <Pressable
          onPress={() => Share.share({ message: `https://finisherlegacy.com/@${username}` })}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Compartir perfil">
          <Share2 color={colors.foreground} size={20} />
        </Pressable>
      </View>

      {isPending ? (
        <View style={{ gap: spacing.md, alignItems: 'center' }}>
          <Skeleton width={88} height={88} radius={44} />
          <Skeleton width={140} height={20} />
        </View>
      ) : isError || !data ? (
        <ErrorState message="No pudimos cargar este perfil." onRetry={refetch} />
      ) : (
        <Reveal style={{ gap: spacing.lg }}>
          <View style={{ alignItems: 'center', gap: spacing.xs, position: 'relative' }}>
            <GoldGlow size={200} style={{ position: 'absolute', top: -20 }} />
            <View
              style={{
                width: 88,
                height: 88,
                borderRadius: 44,
                backgroundColor: colors.graphite,
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: colors.gold,
              }}>
              {data.profile.photo_url ? (
                <Image source={{ uri: data.profile.photo_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
              ) : (
                <User color={colors.muted} size={32} />
              )}
            </View>
            <AppText variant="title">{data.profile.name}</AppText>
            <AppText variant="body" tone="muted">
              @{data.profile.username}
            </AppText>
            {data.profile.bio ? (
              <AppText variant="body" align="center" style={{ marginTop: spacing.xs }}>
                {data.profile.bio}
              </AppText>
            ) : null}
            {(data.profile.city || data.profile.country) && (
              <AppText variant="caption" tone="muted">
                {[data.profile.city, data.profile.country].filter(Boolean).join(', ')}
              </AppText>
            )}
          </View>

          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: spacing.xxl }}>
            <MetricNumber value={data.stats.medals} label="Medallas" size={40} tone="gold" />
            <MetricNumber value={data.stats.events} label="Eventos" size={40} />
          </View>

          {data.medals.length > 0 ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
              {data.medals.map((medal) => (
                <View key={medal.id} style={{ width: '47%' }}>
                  <PublicMedalTile title={medal.title} thumbnailUrl={medal.thumbnail_url} />
                </View>
              ))}
            </View>
          ) : (
            <AppText variant="body" tone="muted" align="center">
              Aún no hay medallas públicas.
            </AppText>
          )}
        </Reveal>
      )}
    </Screen>
  );
}

function PublicMedalTile({ title, thumbnailUrl }: { title: string | null; thumbnailUrl: string | null }) {
  return (
    <View style={{ aspectRatio: 1, backgroundColor: colors.graphite, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: colors.border }}>
      {thumbnailUrl ? (
        <Image source={{ uri: thumbnailUrl }} style={{ width: '80%', height: '80%' }} contentFit="contain" />
      ) : (
        <AppText variant="caption" tone="muted" align="center">
          {title}
        </AppText>
      )}
    </View>
  );
}
