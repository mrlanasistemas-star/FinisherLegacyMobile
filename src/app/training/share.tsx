/**
 * Compartir mi enlace — creates the "Envíame ánimo" links that family and
 * friends open on the web (no account, no app) to record a voice note or
 * write a message. Create a link (title + expiry), share it with the native
 * Share sheet, see how many messages each link collected, and revoke it.
 */
import { Link2, MessageCircleHeart, Share2, Trash2 } from 'lucide-react-native';
import { useState } from 'react';
import { Share, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { EmptyState } from '@/components/empty-state';
import { ErrorState } from '@/components/error-state';
import { FormInput } from '@/components/form-input';
import { BrandRefreshControl } from '@/components/motion/brand-refresh-control';
import { PressableScale } from '@/components/motion/pressable-scale';
import { StaggerItem } from '@/components/motion/reveal';
import { Skeleton } from '@/components/skeleton';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { IconButton } from '@/components/ui/icon-button';
import { LargeTitleScroll } from '@/components/ui/top-bar';
import { useCreateTrainingLink, useRevokeTrainingLink, useTrainingLinks } from '@/features/training/use-training';
import { useI18n, type Translate } from '@/i18n';
import { createTrainingLinkSchema, isLinkActive, type CreateTrainingLinkInput, type TrainingLink } from '@/schemas/training';
import { useAuthStore } from '@/stores/authStore';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';
import { formatLongDate } from '@/utils/dates';

/** Built with the component's translator so the labels follow the app language. */
function expiryOptions(t: Translate): { value: CreateTrainingLinkInput['expires_in_days']; label: string }[] {
  return [
    { value: 7, label: t('{days} días', { days: 7 }) },
    { value: 30, label: t('{days} días', { days: 30 }) },
    { value: 90, label: t('{days} días', { days: 90 }) },
    { value: null, label: t('Sin límite') },
  ];
}

async function shareLink(link: TrainingLink, firstName: string | null, t: Translate) {
  // Two whole sentences (third / first person) instead of glued fragments.
  const message = firstName
    ? t('Envíale ánimo para "{title}": graba un audio o escribe un mensaje que escuchará mientras entrena. {url}', { title: link.title, url: link.url })
    : t('Envíame ánimo para "{title}": graba un audio o escribe un mensaje que escucharé mientras entreno. {url}', { title: link.title, url: link.url });
  try {
    await Share.share({ message, url: link.url, title: firstName ? t('Envía ánimo a {name}', { name: firstName }) : t('Envíame ánimo') });
  } catch {
    showToast(t('No pudimos abrir el menú para compartir.'), 'destructive');
  }
}

export default function TrainingShareScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const links = useTrainingLinks();
  const create = useCreateTrainingLink();
  const revoke = useRevokeTrainingLink();
  const firstName = useAuthStore((s) => s.user?.name?.split(' ')[0] ?? null);
  const [title, setTitle] = useState('');
  const [expiry, setExpiry] = useState<CreateTrainingLinkInput['expires_in_days']>(30);
  const [error, setError] = useState<string | undefined>();
  const [revokeTarget, setRevokeTarget] = useState<TrainingLink | null>(null);

  const submit = () => {
    const parsed = createTrainingLinkSchema.safeParse({ title, expires_in_days: expiry });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    setError(undefined);
    create.mutate(parsed.data, {
      onSuccess: (link) => {
        setTitle('');
        void shareLink(link, firstName, t);
      },
      onError: (e) => {
        const field = e instanceof AppError ? e.fieldErrors?.title?.[0] : undefined;
        if (field) setError(field);
        else showToast(e.message, 'destructive');
      },
    });
  };

  const list = links.data ?? [];
  const notFound = links.error instanceof AppError && links.error.kind === 'not_found';

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LargeTitleScroll
        title={t('Compartir mi enlace')}
        subtitle={t('Tu familia y amigos te envían audios y mensajes desde la web, sin crear cuenta.')}
        keyboard
        refreshControl={<BrandRefreshControl refreshing={links.isRefetching} onRefresh={() => links.refetch()} />}
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl, gap: spacing.lg }}>
        <View style={{ backgroundColor: colors.card, borderRadius: radius.xl, borderCurve: 'continuous', borderWidth: 1, borderColor: colors.hairline, padding: spacing.lg, gap: spacing.md, ...shadows.soft }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
            <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: colors.goldWash, alignItems: 'center', justifyContent: 'center' }}>
              <Link2 size={18} color={colors.accent} />
            </View>
            <AppText variant="subtitle">{t('Nuevo enlace')}</AppText>
          </View>
          <FormInput
            label={t('¿Para qué entrenas?')}
            placeholder={t('Ej. Maratón de la CDMX')}
            value={title}
            onChangeText={(text) => {
              setTitle(text);
              if (error) setError(undefined);
            }}
            error={error}
            maxLength={80}
            returnKeyType="done"
            onSubmitEditing={submit}
          />
          <View style={{ gap: spacing.xs }}>
            <AppText variant="caption" tone="muted" style={{ fontFamily: fontFamily.semibold }}>
              {t('Recibir mensajes durante')}
            </AppText>
            <View style={{ flexDirection: 'row', gap: spacing.xs }}>
              {expiryOptions(t).map((option) => {
                const selected = option.value === expiry;
                return (
                  <PressableScale
                    key={String(option.value)}
                    onPress={() => setExpiry(option.value)}
                    haptic="selection"
                    scaleTo={0.94}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    style={{
                      flex: 1,
                      height: 40,
                      borderRadius: radius.md,
                      alignItems: 'center',
                      justifyContent: 'center',
                      backgroundColor: selected ? colors.black : colors.card,
                      borderWidth: 1,
                      borderColor: selected ? colors.black : colors.border,
                    }}>
                    <AppText maxFontSizeMultiplier={1.2} style={{ fontFamily: fontFamily.semibold, fontSize: 13, color: selected ? colors.gold : colors.foreground }}>
                      {option.label}
                    </AppText>
                  </PressableScale>
                );
              })}
            </View>
          </View>
          <AppButton label={t('Crear y compartir')} icon={Share2} onPress={submit} loading={create.isPending} />
        </View>

        <View style={{ gap: spacing.sm }}>
          <AppText variant="eyebrow" tone="subtle" style={{ marginLeft: spacing.xxs }}>
            {t('Mis enlaces')}
          </AppText>
          {links.isPending ? (
            <>
              <Skeleton height={92} radius={radius.lg} />
              <Skeleton height={92} radius={radius.lg} />
            </>
          ) : links.isError ? (
            notFound ? (
              <EmptyState compact icon={Link2} title={t('Muy pronto')} message={t('Los enlaces estarán disponibles en un momento.')} actionLabel={t('Reintentar')} onAction={() => links.refetch()} />
            ) : (
              <ErrorState error={links.error} onRetry={() => links.refetch()} message={t('No pudimos cargar tus enlaces.')} />
            )
          ) : list.length === 0 ? (
            <EmptyState compact icon={MessageCircleHeart} title={t('Aún no tienes enlaces')} message={t('Crea uno arriba y compártelo por WhatsApp, Instagram o donde quieras.')} />
          ) : (
            list.map((link, index) => (
              <StaggerItem key={link.uuid} index={index}>
                <LinkCard link={link} onShare={() => void shareLink(link, firstName, t)} onRevoke={() => setRevokeTarget(link)} />
              </StaggerItem>
            ))
          )}
        </View>
      </LargeTitleScroll>

      <ConfirmDialog
        visible={!!revokeTarget}
        title={t('¿Desactivar este enlace?')}
        description={t('Nadie podrá enviarte mensajes nuevos con él. Los que ya recibiste se quedan contigo.')}
        confirmLabel={t('Desactivar')}
        loading={revoke.isPending}
        onCancel={() => setRevokeTarget(null)}
        onConfirm={() => {
          if (!revokeTarget) return;
          revoke.mutate(revokeTarget.uuid, {
            onSuccess: () => showToast(t('Enlace desactivado')),
            onError: (e) => showToast(e.message, 'destructive'),
            onSettled: () => setRevokeTarget(null),
          });
        }}
      />
    </View>
  );
}

function LinkCard({ link, onShare, onRevoke }: { link: TrainingLink; onShare: () => void; onRevoke: () => void }) {
  const { t, tc } = useI18n();
  const active = isLinkActive(link);
  const state = link.revoked_at
    ? t('Desactivado')
    : !active
      ? t('Vencido')
      : link.expires_at
        ? t('Activo hasta el {date}', { date: formatLongDate(link.expires_at) })
        : t('Activo · sin vencimiento');
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.hairline,
        padding: spacing.md,
        gap: spacing.xs,
        opacity: active ? 1 : 0.7,
        ...shadows.soft,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyStrong" numberOfLines={2}>
            {link.title}
          </AppText>
          <AppText variant="caption" tone={active ? 'success' : 'subtle'} numberOfLines={1}>
            {state}
          </AppText>
        </View>
        {active ? (
          <>
            <IconButton icon={Share2} label={t('Compartir {title}', { title: link.title })} onPress={onShare} size={20} />
            <IconButton icon={Trash2} label={t('Desactivar {title}', { title: link.title })} onPress={onRevoke} size={20} color={colors.destructive} />
          </>
        ) : null}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <MessageCircleHeart size={15} color={colors.accent} />
        <AppText variant="caption" tone="muted">
          {link.messages_count === 0 ? t('Sin mensajes aún') : tc('{count} mensaje|{count} mensajes', link.messages_count)}
        </AppText>
        <AppText variant="caption" tone="subtle" numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>
          {link.url.replace(/^https?:\/\//, '')}
        </AppText>
      </View>
    </View>
  );
}
