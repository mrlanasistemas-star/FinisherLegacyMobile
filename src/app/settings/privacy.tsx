import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ExternalLink, ShieldCheck } from 'lucide-react-native';
import { useMemo } from 'react';
import { ActivityIndicator, Switch, View } from 'react-native';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { AthleteRow } from '@/components/social/athlete-row';
import { ListGroup, ListRow } from '@/components/ui/list-row';
import { LargeTitleScroll } from '@/components/ui/top-bar';
import { useProfile } from '@/hooks/use-profile';
import { useBlock, useBlocks } from '@/hooks/use-social';
import { useUpdateProfile } from '@/hooks/use-update-profile';
import { showToast } from '@/stores/toastStore';
import { colors, spacing } from '@/theme/tokens';
import type { AthleteSummary } from '@/types/social';
import { legalLinks } from '@/utils/links';
import { useI18n } from '@/i18n';

export default function PrivacyScreen() {
  const { t } = useI18n();
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
      showToast(value ? t('Tu perfil ahora es privado.') : t('Tu perfil ahora es público.'), 'success');
    } catch (error) {
      showToast(error instanceof AppError ? error.message : t('No pudimos cambiar tu privacidad. Intenta otra vez.'), 'destructive');
    }
  }

  return (
    <LargeTitleScroll title={t('Privacidad')} contentContainerStyle={{ gap: spacing.lg }}>
        <ListGroup title={t('Perfil')} footer={t('Cada momento también tiene su propia visibilidad: Todos, Seguidores o Solo yo.')}>
          <ListRow
            icon={ShieldCheck}
            label={t('Perfil privado')}
            description={
              isPrivate
                ? t('Solo tú puedes ver tu perfil, tus momentos y tus medallas. Nadie nuevo puede seguirte.')
                : t('Otros atletas pueden ver tus logros públicos, seguirte y apoyarte en tus momentos.')
            }
            divider={false}
            trailing={
              update.isPending ? (
                <ActivityIndicator color={colors.accent} />
              ) : (
                <Switch
                  value={isPrivate}
                  onValueChange={setPrivate}
                  trackColor={{ false: colors.surfaceMuted, true: colors.gold }}
                  thumbColor={colors.white}
                  ios_backgroundColor={colors.surfaceMuted}
                  accessibilityLabel={t('Perfil privado')}
                />
              )
            }
          />
        </ListGroup>

        <View>
          <AppText variant="eyebrow" tone="subtle" style={{ marginBottom: spacing.xs, marginLeft: spacing.md }}>
            {t('Atletas bloqueados')}
          </AppText>
          {blocks.isPending ? (
            <ActivityIndicator color={colors.accent} style={{ marginVertical: spacing.md }} />
          ) : blocked.length === 0 ? (
            <AppText variant="caption" tone="muted" style={{ paddingHorizontal: spacing.md }}>
              {t('No has bloqueado a nadie. Puedes bloquear desde el menú ••• del perfil de un atleta.')}
            </AppText>
          ) : (
            <View style={{ backgroundColor: colors.card, borderRadius: 18, paddingHorizontal: spacing.md, borderWidth: 1, borderColor: colors.hairline }}>
              {blocked.map((athlete) => (
                <BlockedRow key={athlete.username ?? athlete.name} athlete={athlete} />
              ))}
            </View>
          )}
        </View>

        <ListGroup title={t('Legal')}>
          <ListRow label={t('Política de privacidad')} trailing={<ExternalLink size={16} color={colors.subtle} />} onPress={() => WebBrowser.openBrowserAsync(legalLinks.privacy)} />
          <ListRow label={t('Términos y condiciones')} trailing={<ExternalLink size={16} color={colors.subtle} />} onPress={() => WebBrowser.openBrowserAsync(legalLinks.terms)} />
        </ListGroup>
    </LargeTitleScroll>
  );
}

function BlockedRow({ athlete }: { athlete: AthleteSummary }) {
  const { t } = useI18n();
  const block = useBlock(athlete.username ?? '');
  return (
    <AthleteRow
      athlete={athlete}
      showFollow={false}
      trailing={
        <AppButton
          label={t('Desbloquear')}
          size="sm"
          variant="secondary"
          fullWidth={false}
          loading={block.isPending}
          onPress={() =>
            block.mutate(false, {
              onSuccess: () => showToast(t('Desbloqueaste a @{username}.', { username: athlete.username ?? '' }), 'default'),
              onError: () => showToast(t('No pudimos desbloquear. Intenta otra vez.'), 'destructive'),
            })
          }
        />
      }
    />
  );
}
