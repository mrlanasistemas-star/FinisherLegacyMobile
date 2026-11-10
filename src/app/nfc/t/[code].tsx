import { useQuery } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { X } from 'lucide-react-native';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { getTag } from '@/api/activation';
import { AppError } from '@/api/errors';
import { AppText } from '@/components/app-text';
import { ActivationShell } from '@/components/nfc/activation-shell';
import { StepButton } from '@/components/nfc/step-button';
import { webOrigin } from '@/features/nfc/use-activation';
import { parseHttpUrl } from '@/features/nfc/url-policy';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { colors, radius, spacing } from '@/theme/tokens';

function ownUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const parsed = parseHttpUrl(url);
  return parsed && parsed.scheme === webOrigin.scheme && parsed.host.replace(/^www\./, '') === webOrigin.host.replace(/^www\./, '') ? url : null;
}

/**
 * A chip that already carries a Finisher Legacy URL (`https://<web>/t/{code}`),
 * read in-app by the scanner or the activation flow. Public lookup
 * (`GET /tags/{code}`), so it works with or without a session.
 */
export default function TagScreen() {
  const { code = '' } = useLocalSearchParams<{ code: string }>();
  const status = useAuthStore((s) => s.status);
  const setPendingDeepLink = useUiStore((s) => s.setPendingDeepLink);
  const query = useQuery({ queryKey: ['legacy-tag', code], queryFn: () => getTag(code), enabled: code.length >= 8 });

  const tag = query.data;
  const storyUrl = ownUrl(tag?.story_url);
  const design = tag?.tag?.design;

  function close() {
    if (router.canGoBack()) router.back();
    else router.replace(status === 'authenticated' ? '/' : '/welcome');
  }

  function activate() {
    if (status !== 'authenticated') {
      setPendingDeepLink('/activate');
      router.push('/login');
      return;
    }
    router.replace('/activate' as Href);
  }

  const notFound = query.error instanceof AppError && query.error.kind === 'not_found';

  return (
    <ActivationShell
      stepKey={query.isPending ? 'loading' : query.isError ? 'error' : 'tag'}
      title="Finisher Legacy"
      leading={{ icon: X, label: 'Cerrar', onPress: close }}
      footer={
        tag ? (
          <>
            {storyUrl ? <StepButton label="Ver historia" onPress={() => WebBrowser.openBrowserAsync(storyUrl)} /> : null}
            {tag.can_activate ? <StepButton label="Activar mi Finisher Legacy" variant={storyUrl ? 'secondary' : 'primary'} onPress={activate} /> : null}
            {tag.owned_by_me ? <StepButton label="Ir a mi Legacy" variant="plain" onPress={() => router.replace('/legacy')} /> : null}
          </>
        ) : query.isError ? (
          <StepButton label="Reintentar" variant="secondary" onPress={() => query.refetch()} />
        ) : null
      }>
      {query.isPending ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.accent} />
          <AppText variant="body" tone="muted">
            Leyendo tu Finisher Legacy…
          </AppText>
        </View>
      ) : query.isError || !tag ? (
        <View style={{ gap: spacing.xs }}>
          <AppText variant="title" accessibilityRole="header">
            {notFound ? 'No reconocemos este Finisher Legacy' : 'No pudimos cargarlo'}
          </AppText>
          <AppText variant="body" tone="muted">
            {notFound ? 'Este chip no está registrado. Si crees que es un error, escríbenos a hola@finisherlegacy.com.' : 'Revisa tu conexión e inténtalo de nuevo.'}
          </AppText>
        </View>
      ) : (
        <>
          {design?.image_url ? <Image source={{ uri: design.image_url }} style={styles.image} contentFit="cover" accessibilityIgnoresInvertColors /> : null}
          <AppText variant="label" style={{ color: colors.accent, letterSpacing: 2 }}>
            {(tag.tag?.collection ?? 'FINISHER LEGACY').toUpperCase()}
          </AppText>
          <AppText variant="title" accessibilityRole="header">
            {design?.product_name ?? 'Finisher Legacy'}
          </AppText>
          {design?.variant_name ? (
            <AppText variant="body" tone="muted">
              {design.variant_name}
            </AppText>
          ) : null}
          {tag.message ? (
            <AppText variant="body" tone="muted">
              {tag.message}
            </AppText>
          ) : null}
          {tag.display_code ? (
            <AppText variant="caption" tone="muted">
              {tag.display_code}
            </AppText>
          ) : null}
        </>
      )}
    </ActivationShell>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, minHeight: 200 },
  image: { width: '100%', aspectRatio: 4 / 3, borderRadius: radius.lg, backgroundColor: colors.surfaceMuted },
});
