import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ChevronRight, LogOut, Settings, Share2, User as UserIcon } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import { ScrollView, Share, View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { GoldGlow } from '@/components/brand/gold-glow';
import { LegacyIdTag } from '@/components/brand/legacy-id-tag';
import { MascotTip } from '@/components/brand/mascot-tip';
import { MedalHeroTile } from '@/components/brand/medal-hero-tile';
import { MetricNumber } from '@/components/brand/metric-number';
import { Card } from '@/components/card';
import { Reveal } from '@/components/motion/reveal';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useLogout } from '@/hooks/use-logout';
import { useMedals } from '@/hooks/use-medals';
import { useProfile } from '@/hooks/use-profile';
import { useAuthStore } from '@/stores/authStore';
import { colors, spacing } from '@/theme/tokens';

export default function ProfileScreen() {
  const user = useAuthStore((state) => state.user);
  const { data: profile, isPending } = useProfile();
  const { logout, loading } = useLogout();
  const medals = useMedals();
  const [confirmingLogout, setConfirmingLogout] = useState(false);

  const collection = useMemo(() => medals.data?.pages[0]?.data.slice(0, 6) ?? [], [medals.data]);
  const totalMedals = medals.data?.pages[0]?.meta.total ?? null;

  return (
    <Screen scroll padded={false}>
      <View style={{ alignItems: 'center', marginTop: spacing.xl, gap: spacing.sm, position: 'relative' }}>
        <GoldGlow size={220} style={{ position: 'absolute', top: -30 }} />

        <View
          style={{
            width: 96,
            height: 96,
            borderRadius: 48,
            backgroundColor: colors.graphite,
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            borderWidth: 2,
            borderColor: colors.gold,
          }}>
          {profile?.profile_photo_url ? (
            <Image source={{ uri: profile.profile_photo_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" />
          ) : (
            <UserIcon color={colors.muted} size={38} />
          )}
        </View>

        <AppText variant="title">
          {user?.first_name} {user?.last_name}
        </AppText>
        {isPending ? (
          <Skeleton width={120} height={14} />
        ) : profile?.username ? (
          <AppText variant="body" tone="muted">
            @{profile.username}
          </AppText>
        ) : (
          <AppText variant="caption" tone="muted">
            Aún no configuras tu perfil público
          </AppText>
        )}
        {user?.legacy_id ? <LegacyIdTag legacyId={user.legacy_id} /> : null}
      </View>

      <MascotTip
        id="profile-intro"
        message="Tu perfil reúne todo lo que has construido carrera tras carrera."
        style={{ marginHorizontal: spacing.lg, marginTop: spacing.lg }}
      />

      <View style={{ alignItems: 'center', marginTop: spacing.xl }}>
        {medals.isPending ? <Skeleton width={80} height={48} /> : <MetricNumber value={totalMedals ?? 0} size={48} tone="gold" />}
        <AppText variant="caption" tone="muted" style={{ marginTop: 2, letterSpacing: 1.5 }}>
          MEDALLAS
        </AppText>
      </View>

      {collection.length > 0 ? (
        <Reveal style={{ marginTop: spacing.xl }}>
          <View style={{ paddingHorizontal: spacing.lg, marginBottom: spacing.md }}>
            <AppText variant="label" tone="muted" style={{ letterSpacing: 2 }}>
              MI HISTORIA
            </AppText>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
            {collection.map((medal) => (
              <MedalHeroTile key={medal.id} medal={medal} onPress={() => router.push(`/medals/${medal.id}`)} width={128} />
            ))}
          </ScrollView>
          <AppButton
            label="Ver Legacy Vault →"
            variant="ghost"
            onPress={() => router.push('/medals')}
            style={{ marginTop: spacing.sm }}
          />
        </Reveal>
      ) : null}

      <View style={{ marginTop: spacing.xl, paddingHorizontal: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xl }}>
        <MenuRow icon={UserIcon} label="Editar perfil" onPress={() => router.push('/settings/account')} />
        {profile?.username ? (
          <MenuRow
            icon={Share2}
            label="Compartir mi perfil"
            onPress={() => Share.share({ message: `https://finisherlegacy.com/@${profile.username}` })}
          />
        ) : null}
        <MenuRow icon={Settings} label="Configuración" onPress={() => router.push('/settings')} />
        <MenuRow icon={LogOut} label="Cerrar sesión" tone="destructive" onPress={() => setConfirmingLogout(true)} loading={loading} />
      </View>

      <ConfirmDialog
        visible={confirmingLogout}
        title="Cerrar sesión"
        description="Tendrás que iniciar sesión nuevamente para ver tu Legacy."
        confirmLabel="Cerrar sesión"
        loading={loading}
        onConfirm={async () => {
          await logout();
          setConfirmingLogout(false);
        }}
        onCancel={() => setConfirmingLogout(false)}
      />
    </Screen>
  );
}

function MenuRow({
  icon: Icon,
  label,
  onPress,
  tone = 'default',
  loading = false,
}: {
  icon: typeof UserIcon;
  label: string;
  onPress: () => void;
  tone?: 'default' | 'destructive';
  loading?: boolean;
}) {
  return (
    <Card onPress={loading ? undefined : onPress} style={{ paddingVertical: spacing.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
        <Icon color={tone === 'destructive' ? colors.destructive : colors.foreground} size={20} />
        <AppText variant="bodyStrong" tone={tone} style={{ flex: 1 }}>
          {label}
        </AppText>
        {!loading && <ChevronRight color={colors.muted} size={18} />}
      </View>
    </Card>
  );
}
