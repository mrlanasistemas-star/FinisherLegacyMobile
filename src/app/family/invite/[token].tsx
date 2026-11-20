import { router, useLocalSearchParams } from 'expo-router';
import { HeartHandshake, MapPin, ShieldCheck, UserX } from 'lucide-react-native';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { Skeleton } from '@/components/skeleton';
import { Avatar } from '@/components/ui/avatar';
import { InlineError } from '@/components/ui/inline-error';
import { TopBar } from '@/components/ui/top-bar';
import { useAcceptFamilyInvite, useDeclineFamilyInvite, useFamilyInvitePreview } from '@/hooks/use-family';
import { useI18n } from '@/i18n';
import { showToast } from '@/stores/toastStore';
import { colors, spacing } from '@/theme/tokens';

/**
 * A shared family invite link opened in the app
 * (`https://finisherlegacy.com/familia/invitacion/{token}` →
 * `/family/invite/{token}`). Behind the session guard: signed-out people
 * log in first. Accepting never shows a location by itself.
 */
export default function FamilyInviteScreen() {
  const { t } = useI18n();
  const { token: param } = useLocalSearchParams<{ token: string }>();
  const token = typeof param === 'string' && /^[A-Za-z0-9]{20,128}$/.test(param) ? param : null;
  const preview = useFamilyInvitePreview(token);
  const accept = useAcceptFamilyInvite();
  const decline = useDeclineFamilyInvite();
  const failure = accept.error ?? decline.error;
  const gone = !token || (preview.error as { status?: number } | null)?.status === 404;

  async function answer(kind: 'accept' | 'decline') {
    if (!token) return;
    try {
      if (kind === 'accept') {
        await accept.mutateAsync(token);
        showToast(t('Ahora formas parte de su familia.'), 'success');
      } else {
        await decline.mutateAsync(token);
      }
      router.replace('/family');
    } catch {
      // Shown inline below (InlineError).
    }
  }

  const invite = preview.data;

  return (
    <SafeAreaView edges={['top', 'left', 'right', 'bottom']} style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={{ paddingHorizontal: spacing.lg }}>
        <TopBar title={t('Invitación familiar')} />
      </View>
      <View style={{ flex: 1, padding: spacing.lg, gap: spacing.lg }}>
        {gone ? (
          <EmptyState
            icon={UserX}
            title={t('Esta invitación ya no está disponible')}
            message={t('Puede que ya se haya usado o que haya vencido. Pide a quien te invitó que te envíe una nueva.')}
          />
        ) : preview.isPending ? (
          <Skeleton height={220} radius={16} />
        ) : preview.isError || !invite ? (
          <ErrorState message={t('No pudimos cargar la invitación.')} onRetry={preview.refetch} />
        ) : (
          <>
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <Avatar uri={invite.athlete.avatar_url} name={invite.athlete.name} size={80} ring />
              <AppText variant="title" align="center" accessibilityRole="header">
                {t('{name} te invitó a su familia', { name: invite.athlete.name })}
              </AppText>
              {invite.label ? (
                <AppText variant="caption" tone="muted" align="center">
                  {t('Te agregó como «{label}»', { label: invite.label })}
                </AppText>
              ) : null}
            </View>

            <View style={{ gap: spacing.sm }}>
              <Point icon={MapPin} text={t('Podrás seguir su ubicación en vivo solo cuando decida compartirla contigo, durante una carrera o un entrenamiento.')} />
              <Point icon={ShieldCheck} text={t('No es un acceso permanente: cuando termina o deja de compartir, ya no verás nada.')} />
              <Point icon={HeartHandshake} text={t('Puedes salir de su familia cuando quieras.')} />
            </View>

            <InlineError message={failure instanceof AppError ? (failure.fieldErrors?.invite?.[0] ?? failure.message) : null} />

            {invite.is_own ? (
              <AppText variant="caption" tone="muted" align="center">
                {t('Esta es tu propia invitación. Compártela con la persona que quieres agregar.')}
              </AppText>
            ) : (
              <View style={{ gap: spacing.sm }}>
                <AppButton label={t('Aceptar invitación')} loading={accept.isPending} onPress={() => answer('accept')} />
                <AppButton label={t('Rechazar')} variant="secondary" loading={decline.isPending} onPress={() => answer('decline')} />
              </View>
            )}
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

function Point({ icon: Icon, text }: { icon: typeof MapPin; text: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <Icon size={18} color={colors.accent} />
      <AppText variant="body" tone="muted" style={{ flex: 1 }}>
        {text}
      </AppText>
    </View>
  );
}
