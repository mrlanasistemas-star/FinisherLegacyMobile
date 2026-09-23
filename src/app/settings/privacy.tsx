import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink, ShieldCheck } from 'lucide-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, ScrollView, Switch, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { AthleteRow } from '@/components/social/athlete-row';
import { ListRow } from '@/components/ui/list-row';
import { TopBar } from '@/components/ui/top-bar';
import { useProfile } from '@/hooks/use-profile';
import { useBlock, useBlocks } from '@/hooks/use-social';
import { useUpdateProfile } from '@/hooks/use-update-profile';
import { showToast } from '@/stores/toastStore';
import { colors, spacing } from '@/theme/tokens';
import type { AthleteSummary } from '@/types/social';

export default function PrivacyScreen() {
  const { data } = useProfile();
  const update = useUpdateProfile();
  const blocks = useBlocks();
  const profile = data?.profile ?? null;
  const isPrivate = profile?.profile_visibility === 'private';
  const blocked = useMemo<AthleteSummary[]>(() => blocks.data?.pages.flatMap((p) => p.data) ?? [], [blocks.data]);

  async function setPrivate(value: boolean) {
    if (!profile) {
      router.push('/settings/account');
      return;
    }
    try {
      await update.mutateAsync({
        username: profile.username,
        bio: profile.bio,
        city: profile.city,
        state: profile.state,
        country: profile.country,
        profile_visibility: value ? 'private' : 'public',
      });
      showToast(value ? 'Tu perfil ahora es privado.' : 'Tu perfil ahora es público.', 'success');
    } catch (error) {
      showToast(error instanceof AppError ? error.message : 'No pudimos cambiar tu privacidad. Intenta otra vez.', 'destructive');
    }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar title="Privacidad" />
      </View>
      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.xl }}>
        <View>
          <AppText variant="label" tone="muted" style={{ marginBottom: spacing.xxs }}>
            PERFIL
          </AppText>
          <ListRow
            icon={ShieldCheck}
            label="Perfil privado"
            description={
              isPrivate
                ? 'Solo tú puedes ver tu perfil, tus momentos y tus medallas. Nadie nuevo puede seguirte.'
                : 'Otros atletas pueden ver tus logros públicos, seguirte y apoyarte en tus momentos.'
            }
            divider={false}
            trailing={
              update.isPending ? (
                <ActivityIndicator color={colors.gold} />
              ) : (
                <Switch
                  value={isPrivate}
                  onValueChange={setPrivate}
                  trackColor={{ false: colors.graphiteLight, true: colors.gold }}
                  thumbColor={colors.white}
                  ios_backgroundColor={colors.graphiteLight}
                  accessibilityLabel="Perfil privado"
                />
              )
            }
          />
          <AppText variant="caption" style={{ color: colors.subtle, marginTop: spacing.xs }}>
            Cada momento también tiene su propia visibilidad: Todos, Seguidores o Solo yo.
          </AppText>
        </View>

        <View>
          <AppText variant="label" tone="muted" style={{ marginBottom: spacing.xxs }}>
            ATLETAS BLOQUEADOS
          </AppText>
          {blocks.isPending ? (
            <ActivityIndicator color={colors.gold} style={{ marginVertical: spacing.md }} />
          ) : blocked.length === 0 ? (
            <AppText variant="body" tone="muted" style={{ paddingVertical: spacing.sm }}>
              No has bloqueado a nadie. Puedes bloquear desde el menú ••• del perfil de un atleta.
            </AppText>
          ) : (
            blocked.map((athlete) => <BlockedRow key={athlete.username ?? athlete.name} athlete={athlete} />)
          )}
        </View>

        <View>
          <AppText variant="label" tone="muted" style={{ marginBottom: spacing.xxs }}>
            LEGAL
          </AppText>
          <ListRow label="Política de privacidad" trailing={<ExternalLink size={16} color={colors.subtle} />} onPress={() => WebBrowser.openBrowserAsync('https://finisherlegacy.com/privacy')} />
          <ListRow label="Términos y condiciones" trailing={<ExternalLink size={16} color={colors.subtle} />} onPress={() => WebBrowser.openBrowserAsync('https://finisherlegacy.com/terms')} divider={false} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function BlockedRow({ athlete }: { athlete: AthleteSummary }) {
  const block = useBlock(athlete.username ?? '');
  return (
    <AthleteRow
      athlete={athlete}
      showFollow={false}
      trailing={
        <AppButton
          label="Desbloquear"
          size="sm"
          variant="secondary"
          fullWidth={false}
          loading={block.isPending}
          onPress={() =>
            block.mutate(false, {
              onSuccess: () => showToast(`Desbloqueaste a @${athlete.username}.`, 'default'),
              onError: () => showToast('No pudimos desbloquear. Intenta otra vez.', 'destructive'),
            })
          }
        />
      }
    />
  );
}
