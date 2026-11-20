/**
 * Recipient links of a story ("Para mamá"): each one is a private link
 * with its own label that opens the memory even while it is private, and
 * counts how many times it was opened. Create one, send it with the
 * system share sheet, or deactivate it (it stops working at once). Same
 * links as the web editor (`LegacyStoryShare`, `/legacy/para/{token}`).
 */

import { useLocalSearchParams, router } from 'expo-router';
import { Link2, Plus, Share2, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { ScrollView, Share, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { ContentLockedBody } from '@/components/pin/content-locked';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { Skeleton } from '@/components/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InlineError } from '@/components/ui/inline-error';
import { TopBar } from '@/components/ui/top-bar';
import { isContentLockedError } from '@/features/content-pin/use-content-pin';
import { useCreateStoryShare, useRevokeStoryShare, useStoryShares } from '@/features/stories/use-stories';
import { useI18n } from '@/i18n';
import type { StoryShare } from '@/schemas/story';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';
import { formatLongDate } from '@/utils/dates';
import { haptics } from '@/utils/haptics';

function leave() {
  if (router.canGoBack()) router.back();
  else router.replace('/legacy');
}

function errorMessage(caught: unknown, fallback: string): string {
  return caught instanceof AppError && caught.kind !== 'not_found' ? caught.message : fallback;
}

export default function StorySharesScreen() {
  const { t, tc } = useI18n();
  const { publicId = '' } = useLocalSearchParams<{ publicId?: string }>();
  const insets = useSafeAreaInsets();
  const shares = useStoryShares(publicId);
  const create = useCreateStoryShare(publicId);
  const revoke = useRevokeStoryShare(publicId);

  const [label, setLabel] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [toRevoke, setToRevoke] = useState<StoryShare | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  async function send(share: StoryShare) {
    haptics.light();
    try {
      await Share.share({ message: t('{label}, te comparto este recuerdo:\n{url}', { label: share.label, url: share.url }), url: share.url });
    } catch {
      // The share sheet was dismissed — nothing to report.
    }
  }

  function submit() {
    const value = label.trim();
    if (value === '') {
      setError(t('¿Para quién es? Por ejemplo: Mamá.'));
      return;
    }
    setError(null);
    create.mutate(value, {
      onSuccess: (share) => {
        setLabel('');
        haptics.success();
        void send(share);
      },
      onError: (caught) => setError(errorMessage(caught, t('No pudimos crear el enlace. Intenta de nuevo.'))),
    });
  }

  const missing = shares.error instanceof AppError && shares.error.kind === 'not_found';
  const list = shares.data ?? [];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ paddingLeft: Math.max(insets.left, spacing.md), paddingRight: Math.max(insets.right, spacing.md), borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
        <TopBar title={t('Enlaces para compartir')} onBack={leave} />
      </View>

      {isContentLockedError(shares.error) ? (
        <ContentLockedBody title={t('Recuerdo protegido')} message={t('Escribe tu NIP para ver y editar este recuerdo. Nadie más puede abrirlo.')} onUnlocked={shares.refetch} />
      ) : shares.isError && !shares.data ? (
        <ErrorState
          error={shares.error}
          title={missing ? t('Aún no disponible') : undefined}
          message={missing ? t('Todavía no puedes administrar tus enlaces desde la app. Mientras tanto puedes hacerlo en finisherlegacy.com.') : t('No pudimos cargar tus enlaces.')}
          onRetry={missing ? undefined : shares.refetch}
          onBack={leave}
        />
      ) : (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          refreshControl={
            <BrandRefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void shares.refetch().finally(() => setRefreshing(false));
              }}
            />
          }
          contentContainerStyle={{ alignItems: 'center', paddingTop: spacing.lg, paddingBottom: insets.bottom + spacing.xxl }}>
          <View style={{ width: '100%', maxWidth: 640, paddingLeft: Math.max(insets.left, spacing.md), paddingRight: Math.max(insets.right, spacing.md), gap: spacing.lg }}>
            <AppText variant="caption" tone="muted">
              {t('Crea un enlace para cada persona. Abre tu recuerdo aunque sea privado y puedes desactivarlo cuando quieras.')}
            </AppText>

            {/* New link */}
            <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline, ...shadows.soft }}>
              <AppText variant="bodyStrong">{t('¿Para quién es?')}</AppText>
              <TextInput
                value={label}
                onChangeText={setLabel}
                placeholder={t('Mamá')}
                maxLength={80}
                autoCapitalize="words"
                returnKeyType="done"
                onSubmitEditing={submit}
                editable={!create.isPending}
                accessibilityLabel={t('¿Para quién es?')}
                placeholderTextColor={colors.subtle}
                selectionColor={colors.accent}
                cursorColor={colors.accent}
                style={{ minHeight: 48, paddingHorizontal: spacing.md, borderRadius: radius.md, borderWidth: 1, borderColor: colors.inputBorder, backgroundColor: colors.input, fontFamily: fontFamily.regular, fontSize: 16, color: colors.foreground }}
              />
              <InlineError message={error} />
              <AppButton label={t('Crear enlace')} icon={Plus} loading={create.isPending} onPress={submit} />
            </View>

            {shares.isPending ? (
              <>
                <Skeleton height={84} radius={radius.lg} />
                <Skeleton height={84} radius={radius.lg} />
              </>
            ) : list.length === 0 ? (
              <EmptyState compact icon={Link2} title={t('Aún no hay enlaces')} message={t('Cuando crees uno aparecerá aquí, con las veces que se abrió.')} />
            ) : (
              list.map((share) => (
                <View
                  key={share.id}
                  style={{ gap: spacing.xs, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline, opacity: share.active ? 1 : 0.6 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
                    <AppText variant="bodyStrong" numberOfLines={1} style={{ flex: 1 }}>
                      {t('Para {label}', { label: share.label })}
                    </AppText>
                    {!share.active ? (
                      <AppText variant="caption" tone="subtle">
                        {t('Desactivado')}
                      </AppText>
                    ) : null}
                  </View>
                  <AppText variant="caption" tone="subtle">
                    {share.open_count > 0
                      ? [tc('Abierto {count} vez|Abierto {count} veces', share.open_count), share.last_opened_at ? t('última: {date}', { date: formatLongDate(share.last_opened_at.slice(0, 10)) }) : null].filter(Boolean).join(' · ')
                      : t('Todavía no lo abren')}
                  </AppText>
                  {share.active ? (
                    <View style={{ flexDirection: 'row', gap: spacing.xs, marginTop: spacing.xxs }}>
                      <AppButton label={t('Enviar')} icon={Share2} variant="secondary" size="sm" fullWidth={false} onPress={() => void send(share)} />
                      <AppButton label={t('Desactivar')} icon={Trash2} variant="ghost" size="sm" fullWidth={false} onPress={() => setToRevoke(share)} />
                    </View>
                  ) : null}
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}

      <ConfirmDialog
        visible={!!toRevoke}
        title={t('¿Desactivar este enlace?')}
        description={t('Quien lo tenga ya no podrá abrir tu recuerdo con él. Puedes crear otro cuando quieras.')}
        confirmLabel={t('Desactivar')}
        destructive
        loading={revoke.isPending}
        onConfirm={() => {
          const share = toRevoke;
          if (!share) return;
          revoke.mutate(share.id, {
            onSuccess: () => {
              setToRevoke(null);
              haptics.light();
            },
            onError: (caught) => {
              setToRevoke(null);
              setError(errorMessage(caught, t('No pudimos desactivarlo. Intenta de nuevo.')));
            },
          });
        }}
        onCancel={() => setToRevoke(null)}
      />
    </View>
  );
}
