import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { Award, BookHeart, ChevronLeft, Ban, Flag, MapPin, MoreHorizontal, Pencil, Settings, Share2, Shirt, Trophy, UserRoundPlus } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, Share, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { GearIconBadge } from '@/components/brand/gear-icon-badge';
import { LegacyIdTag } from '@/components/brand/legacy-id-tag';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/skeleton';
import { FollowButton } from '@/components/social/follow-button';
import { MomentCard } from '@/components/social/moment-card';
import { RaceRow } from '@/components/social/race-row';
import { ReportSheet } from '@/components/social/report-sheet';
import { Avatar } from '@/components/ui/avatar';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconButton } from '@/components/ui/icon-button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { Sheet } from '@/components/ui/sheet';
import { SheetActionRow } from '@/components/ui/sheet-action-row';
import { StatStrip } from '@/components/ui/stat-strip';
import { useMyGear } from '@/hooks/use-gear';
import { useMedals } from '@/hooks/use-medals';
import { useMyEvents } from '@/hooks/use-my-events';
import { useProfile } from '@/hooks/use-profile';
import { useAthlete, useAthleteMoments, useBlock } from '@/hooks/use-social';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { LegacyMoment } from '@/types/social';

type Section = 'moments' | 'races' | 'medals' | 'gear';

const COVER_HEIGHT = 190;
const AVATAR_SIZE = 92;

interface ProfileViewProps {
  username: string | null;
  own: boolean;
}

/**
 * The athlete's sporting identity — cover, avatar, name, @username, Legacy
 * ID, bio, location, stats (followers/following tappable), and their
 * story: Momentos · Carreras · Medallas (· Equipo on your own profile).
 * Own and other profiles share this layout; only the actions differ.
 */
export function ProfileView({ username, own }: ProfileViewProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const user = useAuthStore((s) => s.user);
  const [section, setSection] = useState<Section>('moments');
  const [menuOpen, setMenuOpen] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [confirmBlock, setConfirmBlock] = useState(false);

  const athlete = useAthlete(username ?? '');
  const moments = useAthleteMoments(username ?? '');
  const myProfile = useProfile();
  const myMedals = useMedals();
  const myEvents = useMyEvents();
  const myGear = useMyGear();
  const block = useBlock(username ?? '');

  const momentList = useMemo<LegacyMoment[]>(() => moments.data?.pages.flatMap((p) => p.data) ?? [], [moments.data]);

  // ----- Own profile without a public username yet -----
  if (own && myProfile.data && !myProfile.data.profile?.username) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.black, paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.sm }}>
          <IconButton icon={Settings} label="Configuración" onPress={() => router.push('/settings')} />
        </View>
        <EmptyState
          icon={UserRoundPlus}
          title={`Hola, ${user?.first_name ?? 'atleta'}`}
          message="Elige tu nombre de usuario y una foto para que otros atletas te encuentren y sigan tu historia."
          actionLabel="Crear mi perfil"
          onAction={() => router.push('/settings/account')}
        />
      </View>
    );
  }

  const loadingPublic = !!username && athlete.isPending;
  if ((own && myProfile.isPending) || loadingPublic) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.black }}>
        <Skeleton height={COVER_HEIGHT + insets.top} radius={0} />
        <View style={{ padding: spacing.lg, gap: spacing.sm, marginTop: -AVATAR_SIZE / 2 }}>
          <Skeleton width={AVATAR_SIZE} height={AVATAR_SIZE} radius={AVATAR_SIZE / 2} />
          <Skeleton width={180} height={22} />
          <Skeleton width={120} height={14} />
        </View>
      </View>
    );
  }

  if (!own && (athlete.isError || !athlete.data)) {
    const notFound = athlete.error instanceof AppError && athlete.error.kind === 'not_found';
    return (
      <View style={{ flex: 1, backgroundColor: colors.black, paddingTop: insets.top }}>
        <IconButton icon={ChevronLeft} label="Volver" onPress={() => router.back()} size={26} />
        <ErrorState
          error={notFound ? undefined : athlete.error}
          message={notFound ? 'Este perfil no está disponible. Puede ser privado o ya no existir.' : 'No pudimos cargar este perfil.'}
          onRetry={notFound ? undefined : athlete.refetch}
        />
      </View>
    );
  }

  const pub = athlete.data;
  const mine = myProfile.data;
  const name = own ? (mine?.athlete.full_name ?? user?.name ?? '') : (pub?.profile.name ?? '');
  const handle = own ? mine?.profile?.username : pub?.profile.username;
  const bio = own ? mine?.profile?.bio : pub?.profile.bio;
  const coverUrl = own ? mine?.profile?.cover_photo_url : pub?.profile.cover_url;
  const photoUrl = own ? mine?.profile?.profile_photo_url : pub?.profile.photo_url;
  const location = [own ? mine?.profile?.city : pub?.profile.city, own ? mine?.profile?.state : pub?.profile.state].filter(Boolean).join(', ');
  const stats = {
    races: own ? (mine?.stats.event_count ?? 0) : (pub?.stats.events ?? 0),
    medals: own ? (mine?.stats.medal_count ?? 0) : (pub?.stats.medals ?? 0),
    followers: own ? (mine?.social.followers_count ?? 0) : (pub?.stats.followers ?? 0),
    following: own ? (mine?.social.following_count ?? 0) : (pub?.stats.following ?? 0),
  };
  const shareUrl = handle ? `https://finisherlegacy.com/@${handle}` : 'https://finisherlegacy.com';
  const isPrivate = own && mine?.profile?.profile_visibility === 'private';

  const sections: { value: Section; label: string }[] = [
    { value: 'moments', label: 'Momentos' },
    { value: 'races', label: 'Carreras' },
    { value: 'medals', label: 'Medallas' },
    ...(own ? [{ value: 'gear' as const, label: 'Equipo' }] : []),
  ];

  const refresh = () => {
    if (username) {
      athlete.refetch();
      moments.refetch();
    }
    if (own) {
      myProfile.refetch();
      myMedals.refetch();
      myEvents.refetch();
      myGear.refetch();
    }
  };

  const header = (
    <View>
      {/* Cover — the athlete's own image, full-bleed */}
      <View style={{ height: COVER_HEIGHT + insets.top, backgroundColor: colors.graphite }}>
        {coverUrl ? (
          <Image source={{ uri: coverUrl }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={200} />
        ) : (
          <LinearGradient colors={[colors.graphiteLight, colors.black]} style={{ flex: 1 }} />
        )}
        <LinearGradient colors={['rgba(10,10,12,0.55)', 'rgba(10,10,12,0)', 'rgba(10,10,12,0.9)']} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} />
        <View style={{ position: 'absolute', top: insets.top + 4, left: spacing.sm, right: spacing.sm, flexDirection: 'row', justifyContent: 'space-between' }}>
          {own ? <View /> : <IconButton icon={ChevronLeft} label="Volver" onPress={() => router.back()} filled size={24} />}
          <View style={{ flexDirection: 'row', gap: spacing.xs }}>
            <IconButton icon={Share2} label="Compartir perfil" onPress={() => Share.share({ message: shareUrl, url: shareUrl })} filled size={20} />
            {own ? (
              <IconButton icon={Settings} label="Configuración" onPress={() => router.push('/settings')} filled size={20} />
            ) : (
              <IconButton icon={MoreHorizontal} label="Más opciones" onPress={() => setMenuOpen(true)} filled size={20} />
            )}
          </View>
        </View>
      </View>

      <View style={{ paddingHorizontal: spacing.lg, marginTop: -AVATAR_SIZE / 2, gap: spacing.sm }}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' }}>
          <Avatar uri={photoUrl} name={name} size={AVATAR_SIZE} ring style={{ borderColor: colors.black, borderWidth: 4 }} />
        </View>

        <View style={{ gap: 2 }}>
          <AppText variant="title" style={{ fontSize: 26 }} accessibilityRole="header">
            {name}
          </AppText>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexWrap: 'wrap' }}>
            {handle ? (
              <AppText variant="body" tone="muted">
                @{handle}
              </AppText>
            ) : null}
            {isPrivate ? (
              <AppText variant="caption" style={{ color: colors.subtle }}>
                · Perfil privado
              </AppText>
            ) : null}
          </View>
        </View>

        {own && user?.legacy_id ? <LegacyIdTag legacyId={user.legacy_id} /> : null}
        {bio ? <AppText variant="body">{bio}</AppText> : null}
        {location ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <MapPin size={14} color={colors.subtle} />
            <AppText variant="caption" tone="muted">
              {location}
            </AppText>
          </View>
        ) : null}

        <View style={{ marginTop: spacing.xs }}>
          <StatStrip
            items={[
              { label: 'Carreras', value: stats.races, onPress: () => setSection('races') },
              { label: 'Medallas', value: stats.medals, onPress: () => setSection('medals') },
              { label: 'Seguidores', value: stats.followers, onPress: handle ? () => router.push(`/athlete/${handle}/connections?kind=followers`) : undefined },
              { label: 'Siguiendo', value: stats.following, onPress: handle ? () => router.push(`/athlete/${handle}/connections?kind=following`) : undefined },
            ]}
          />
        </View>

        <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.xs }}>
          {own ? (
            <>
              <AppButton label="Editar perfil" icon={Pencil} variant="secondary" size="md" fullWidth={false} style={{ flex: 1 }} onPress={() => router.push('/settings/account')} />
              <AppButton label="Nuevo momento" size="md" fullWidth={false} style={{ flex: 1 }} onPress={() => router.push('/moments/create')} />
            </>
          ) : pub && handle && pub.viewer.can_follow ? (
            <View style={{ flex: 1 }}>
              <FollowButton username={handle} isFollowing={pub.viewer.is_following} firstName={name.split(' ')[0]} size="md" fullWidth />
            </View>
          ) : null}
        </View>

        <View style={{ marginTop: spacing.md, marginBottom: spacing.xs }}>
          <SegmentedControl value={section} onChange={setSection} options={sections} />
        </View>
      </View>
    </View>
  );

  // ----- Section content -----
  const renderSectionBody = () => {
    if (section === 'races') {
      const rows = own
        ? (myEvents.data?.pages.flatMap((p) => p.rows) ?? []).map((row) => ({
            key: String(row.id),
            event: row.event,
            race: row.race,
            date: row.event_date,
            time: row.result?.official_time ?? null,
            pace: row.result?.pace ?? null,
            onPress: () => router.push(`/my-events/${row.id}`),
          }))
        : (pub?.recent_events ?? []).map((row, i) => ({
            key: `${row.event_slug}-${i}`,
            event: row.event,
            race: row.race ?? row.distance,
            date: row.event_date,
            time: row.official_time,
            pace: row.pace,
            onPress: row.event_slug ? () => router.push(`/events/${row.event_slug}`) : undefined,
          }));

      if (rows.length === 0) {
        return <EmptyState compact icon={Trophy} title="Sin carreras todavía" message={own ? 'Tus resultados oficiales aparecerán aquí después de cada evento.' : 'Aún no hay carreras públicas.'} />;
      }
      return (
        <View style={{ paddingHorizontal: spacing.lg }}>
          {rows.map((row) => (
            <RaceRow key={row.key} event={row.event} race={row.race} date={row.date} time={row.time} pace={row.pace} onPress={row.onPress} />
          ))}
        </View>
      );
    }

    if (section === 'medals') {
      const tiles = own
        ? (myMedals.data?.pages.flatMap((p) => p.data) ?? []).map((m) => ({ id: m.id, title: m.title ?? m.event_name ?? 'Medalla', image: m.front_image_url }))
        : (pub?.medals ?? []).map((m) => ({ id: m.id, title: m.title ?? 'Medalla', image: m.thumbnail_url }));

      if (tiles.length === 0) {
        return (
          <EmptyState
            compact
            icon={Award}
            title="Sin medallas todavía"
            message={own ? 'Escanea tu Legacy Code para sumar tu primera medalla.' : 'Aún no hay medallas públicas.'}
            actionLabel={own ? 'Escanear Legacy Code' : undefined}
            onAction={own ? () => router.push('/legacy/scan') : undefined}
          />
        );
      }
      const size = (width - spacing.lg * 2 - spacing.sm * 2) / 3;
      return (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          {tiles.map((tile) => (
            <Pressable
              key={tile.id}
              onPress={own ? () => router.push(`/medals/${tile.id}`) : undefined}
              disabled={!own}
              accessibilityRole={own ? 'button' : 'image'}
              accessibilityLabel={tile.title}
              style={{ width: size, height: size, borderRadius: 16, overflow: 'hidden', backgroundColor: colors.graphite, alignItems: 'center', justifyContent: 'center' }}>
              {tile.image ? (
                <Image source={{ uri: tile.image }} style={{ width: '100%', height: '100%' }} contentFit="cover" cachePolicy="memory-disk" />
              ) : (
                <Award size={28} color={colors.goldDim} />
              )}
            </Pressable>
          ))}
        </View>
      );
    }

    if (section === 'gear') {
      const gear = myGear.data ?? [];
      if (gear.length === 0) {
        return (
          <EmptyState compact icon={Shirt} title="Tu equipo está vacío" message="Reclama el gear Finisher Legacy que compraste o recibiste." actionLabel="Reclamar gear" onAction={() => router.push('/gear/claim')} />
        );
      }
      return (
        <View style={{ paddingHorizontal: spacing.lg }}>
          {gear.map((item) => (
            <Pressable
              key={item.uuid}
              onPress={() => router.push(`/gear/${item.uuid}`)}
              accessibilityRole="button"
              style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.hairline, opacity: pressed ? 0.7 : 1 })}>
              <GearIconBadge productName={item.product_name} size={44} />
              <View style={{ flex: 1 }}>
                <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }} numberOfLines={1}>
                  {item.product_name}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {item.variant_name ?? item.asset_code}
                </AppText>
              </View>
            </Pressable>
          ))}
        </View>
      );
    }

    return null;
  };

  const showMoments = section === 'moments';

  return (
    <View style={{ flex: 1, backgroundColor: colors.black }}>
      <FlatList
        data={showMoments ? momentList : []}
        keyExtractor={(item) => item.uuid}
        renderItem={({ item }) => <MomentCard moment={item} />}
        ListHeaderComponent={header}
        ListFooterComponent={
          showMoments ? (moments.isFetchingNextPage ? <Skeleton height={160} radius={0} style={{ marginTop: spacing.md }} /> : null) : <View style={{ paddingTop: spacing.sm }}>{renderSectionBody()}</View>
        }
        ListEmptyComponent={
          showMoments ? (
            moments.isPending && !!username ? (
              <View style={{ padding: spacing.lg }}>
                <Skeleton height={200} radius={16} />
              </View>
            ) : (
              <EmptyState
                compact
                icon={BookHeart}
                title={own ? 'Comparte tu primer momento' : 'Sin momentos todavía'}
                message={own ? 'Un entrenamiento, una carrera o un recuerdo: aquí se va construyendo tu historia.' : 'Cuando comparta algo, lo verás aquí.'}
                actionLabel={own ? 'Crear un momento' : undefined}
                onAction={own ? () => router.push('/moments/create') : undefined}
              />
            )
          ) : null
        }
        onEndReachedThreshold={0.5}
        onEndReached={() => showMoments && moments.hasNextPage && !moments.isFetchingNextPage && moments.fetchNextPage()}
        refreshControl={<RefreshControl refreshing={athlete.isRefetching || myProfile.isRefetching} onRefresh={refresh} tintColor={colors.gold} progressViewOffset={insets.top} />}
        contentContainerStyle={{ paddingBottom: spacing.xxl }}
        showsVerticalScrollIndicator={false}
        initialNumToRender={3}
        windowSize={7}
      />

      {menuOpen && handle ? (
        <Sheet visible onClose={() => setMenuOpen(false)}>
          <SheetActionRow
            icon={Flag}
            label="Reportar perfil"
            onPress={() => {
              setMenuOpen(false);
              setReporting(true);
            }}
          />
          <SheetActionRow
            icon={Ban}
            label={`Bloquear a @${handle}`}
            destructive
            onPress={() => {
              setMenuOpen(false);
              setConfirmBlock(true);
            }}
          />
        </Sheet>
      ) : null}

      {reporting && handle ? <ReportSheet visible targetType="profile" target={handle} onClose={() => setReporting(false)} /> : null}

      {confirmBlock && handle ? (
        <ConfirmDialog
          visible
          title={`¿Bloquear a @${handle}?`}
          description="No verán la actividad del otro, y dejarán de seguirse. Puedes desbloquear desde Configuración › Privacidad."
          confirmLabel="Bloquear"
          loading={block.isPending}
          onCancel={() => setConfirmBlock(false)}
          onConfirm={async () => {
            try {
              await block.mutateAsync(true);
              setConfirmBlock(false);
              showToast(`Bloqueaste a @${handle}.`, 'default');
              router.back();
            } catch (error) {
              setConfirmBlock(false);
              showToast(error instanceof AppError ? error.message : 'No pudimos bloquear. Intenta otra vez.', 'destructive');
            }
          }}
        />
      ) : null}
    </View>
  );
}
