import { router, useLocalSearchParams, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { CircleCheck, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NFC_ALREADY_CLAIMED } from '@/api/nfc';
import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { NfcActivationCard } from '@/components/nfc/nfc-activation-card';
import { NfcPulse } from '@/components/nfc/nfc-pulse';
import { IconButton } from '@/components/ui/icon-button';
import { nfcInAppHref } from '@/features/nfc/nfc-target';
import { useClaimNfcTag, useNfcTag } from '@/hooks/use-nfc';
import { useI18n } from '@/i18n';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { colors, spacing } from '@/theme/tokens';
import type { AthleteOwnedProduct } from '@/types/models';

/** How long the reveal card stays before a claimed tag opens its destination. */
const REVEAL_MS = 1100;

/**
 * Landing screen for an NFC tap (`https://<domain>/n/{token}` or
 * `finisherlegacy://nfc/{token}`). Reachable with or without a session:
 *
 * - claimed → short reveal → the linked experience (athlete legacy, event, Mi equipo)
 * - unclaimed → activation card → (login) → claim → confirmation → Mi equipo
 * - disabled / unknown → a calm explanation, never a raw error
 */
export default function NfcTapScreen() {
  const { t } = useI18n();
  const { token = '' } = useLocalSearchParams<{ token: string }>();
  const status = useAuthStore((s) => s.status);
  const authenticated = status === 'authenticated';
  const setPendingDeepLink = useUiStore((s) => s.setPendingDeepLink);
  const tag = useNfcTag(token);
  const claim = useClaimNfcTag(token);
  const [claimed, setClaimed] = useState<AthleteOwnedProduct | null>(null);
  const navigated = useRef(false);

  const resolution = tag.data;
  const href = resolution ? nfcInAppHref(resolution, authenticated) : null;

  // Claimed tag with a native destination: reveal, then go.
  useEffect(() => {
    if (!href || navigated.current || claimed) return;
    const timer = setTimeout(() => {
      navigated.current = true;
      router.replace(href as Href);
    }, REVEAL_MS);
    return () => clearTimeout(timer);
  }, [href, claimed]);

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace(authenticated ? '/' : '/welcome');
  }

  function goToLogin(screen: '/login' | '/register') {
    // Replayed by useDeepLinks as soon as the session exists.
    setPendingDeepLink(`/nfc/${token}`);
    router.push(screen);
  }

  async function activate() {
    try {
      const item = await claim.mutateAsync();
      setClaimed(item);
    } catch {
      // Rendered below from `claim.error`.
    }
  }

  const claimError = claim.error instanceof AppError ? claim.error : null;
  const alreadyClaimed = claimError?.code === NFC_ALREADY_CLAIMED || claimError?.status === 409;
  // One whole sentence for the translator; {section} marks where the bold "Mi equipo" goes.
  const [activateBefore, activateAfter = ''] = t(
    'Actívalo y quedará en {section}, conectado a tu historia. Cada vez que alguien lo acerque a su teléfono verá tu legado.',
  ).split('{section}');

  return (
    <SafeAreaView edges={['top', 'bottom', 'left', 'right']} style={{ flex: 1, backgroundColor: colors.black }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.sm }}>
        <IconButton icon={X} label={t('Cerrar')} onPress={close} />
      </View>

      <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.lg, paddingBottom: spacing.xl, gap: spacing.xl }}>
        <View style={{ alignItems: 'center', gap: spacing.md, paddingTop: spacing.md }}>
          <NfcPulse size={claimed ? 120 : 168} active={tag.isPending || !!href} />
          <AppText variant="label" tone="gold" style={{ letterSpacing: 3 }}>
            {tag.isPending ? t('CONECTANDO') : claimed ? t('CONECTADO') : 'FINISHER LEGACY'}
          </AppText>
        </View>

        {tag.isPending ? (
          <AppText variant="body" tone="muted" align="center">
            {t('Leyendo tu producto…')}
          </AppText>
        ) : tag.isError || !resolution ? (
          <Message
            title={tag.error instanceof AppError && tag.error.kind === 'not_found' ? t('No reconocemos este producto') : t('No pudimos leer este producto')}
            body={
              tag.error instanceof AppError && tag.error.kind === 'not_found'
                ? t('Este producto no está registrado en Finisher Legacy. Si crees que es un error, escríbenos.')
                : tag.error instanceof AppError && tag.error.kind === 'network'
                  ? t('Sin conexión. Conéctate a Internet y acerca tu teléfono otra vez.')
                  : t('Intenta de nuevo en un momento.')
            }>
            <AppButton label={t('Reintentar')} variant="secondary" onPress={() => tag.refetch()} />
          </Message>
        ) : claimed ? (
          <ClaimedConfirmation item={claimed} onDone={() => router.replace('/gear')} onHome={() => router.replace('/')} />
        ) : resolution.status === 'disabled' ? (
          <Message title={t('Este producto está desactivado')} body={t('Ya no está vinculado a ninguna historia. Si es tuyo y crees que es un error, escríbenos a hola@finisherlegacy.com.')} />
        ) : resolution.status === 'claimed' ? (
          <NfcActivationCard
            target={resolution.target}
            status={resolution.owned_by_me ? t('Es tuyo') : undefined}
            statusVariant="success">
            {href ? (
              <AppText variant="caption" tone="muted">
                {t('Abriendo…')}
              </AppText>
            ) : (
              <>
                {resolution.target?.web_url ? (
                  <AppButton label={t('Ver historia')} onPress={() => WebBrowser.openBrowserAsync(resolution.target!.web_url)} />
                ) : null}
                {!authenticated ? <AppButton label={t('Iniciar sesión')} variant="ghost" onPress={() => goToLogin('/login')} /> : null}
              </>
            )}
          </NfcActivationCard>
        ) : (
          <NfcActivationCard target={resolution.target} status={t('Listo para activar')}>
            <AppText variant="body" tone="muted">
              {activateBefore}
              <AppText variant="bodyStrong">{t('Mi equipo')}</AppText>
              {activateAfter}
            </AppText>
            {!authenticated ? (
              <>
                <AppButton label={t('Inicia sesión para activarlo')} onPress={() => goToLogin('/login')} />
                <AppButton label={t('Crear cuenta')} variant="ghost" onPress={() => goToLogin('/register')} />
              </>
            ) : resolution.can_claim && !alreadyClaimed ? (
              <>
                <AppButton label={t('Activar en mi Legacy')} onPress={activate} loading={claim.isPending} />
                {claimError ? (
                  <AppText variant="caption" tone="destructive">
                    {claimError.message}
                  </AppText>
                ) : null}
              </>
            ) : (
              <AppText variant="caption" tone="muted">
                {alreadyClaimed
                  ? t('Alguien más acaba de activar este producto. Si es tuyo, escríbenos a hola@finisherlegacy.com.')
                  : t('Este producto no se puede activar desde tu cuenta. Si es tuyo, escríbenos a hola@finisherlegacy.com.')}
              </AppText>
            )}
          </NfcActivationCard>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Message({ title, body, children }: { title: string; body: string; children?: React.ReactNode }) {
  return (
    <Animated.View entering={FadeIn.duration(220)} style={{ gap: spacing.sm, alignItems: 'center' }}>
      <AppText variant="subtitle" align="center" accessibilityRole="header">
        {title}
      </AppText>
      <AppText variant="body" tone="muted" align="center">
        {body}
      </AppText>
      {children ? <View style={{ alignSelf: 'stretch', marginTop: spacing.sm }}>{children}</View> : null}
    </Animated.View>
  );
}

function ClaimedConfirmation({ item, onDone, onHome }: { item: AthleteOwnedProduct; onDone: () => void; onHome: () => void }) {
  const { t } = useI18n();
  const product = item.variant_name ? `${item.product_name} · ${item.variant_name}` : item.product_name;

  return (
    <View style={{ gap: spacing.lg, alignItems: 'center' }}>
      <Animated.View entering={ZoomIn.springify().damping(14)}>
        <CircleCheck size={56} color={colors.gold} strokeWidth={1.6} />
      </Animated.View>
      <View style={{ gap: spacing.xs, alignItems: 'center' }}>
        <AppText variant="title" align="center" accessibilityRole="header">
          {t('Ya es parte de tu historia')}
        </AppText>
        <AppText variant="body" tone="muted" align="center">
          {t('{product} quedó conectado a tu Legacy.', { product })}
        </AppText>
      </View>
      <View style={{ alignSelf: 'stretch', gap: spacing.sm }}>
        <AppButton label={t('Ver Mi equipo')} onPress={onDone} />
        <AppButton label={t('Ir al inicio')} variant="ghost" onPress={onHome} />
      </View>
    </View>
  );
}
