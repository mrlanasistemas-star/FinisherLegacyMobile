/**
 * Tarjeta de ánimo NFC on the "Compartir mi enlace" screen: per cheer link,
 * its counters (free messages used of those included, paid ones, cards that
 * open it), a button to buy a card already bound to that link (adds it to
 * the cart and opens it), and the cards bound to it with "Cambiar enlace"
 * (picker of my active links) and "Desactivar" (confirmation). A card's
 * chip always holds `/t/{code}`; only the server-side binding changes.
 */
import { router, type Href } from 'expo-router';
import { Check, CreditCard, Link2, Power, ShoppingBag } from 'lucide-react-native';
import { useState } from 'react';
import { View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { InlineError } from '@/components/ui/inline-error';
import { Sheet } from '@/components/ui/sheet';
import { useAddCartItem } from '@/hooks/use-cart';
import { useI18n } from '@/i18n';
import { isLinkActive, type CheerCard, type CheerCardOffer, type TrainingLink } from '@/schemas/training';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import { formatMoney } from '@/utils/money';

import { useUpdateCheerCard } from '../use-training';

/** Counters row under a link: "3 de 5 gratis · 2 pagados · 1 tarjeta". */
export function LinkStatsRow({ link }: { link: TrainingLink }) {
  const { t, tc } = useI18n();
  const stats = link.stats;
  if (!stats) return null;
  const parts = [
    stats.after_free === 'free' && stats.free_used >= stats.free_limit
      ? t('{used} gratis', { used: stats.free_used })
      : t('{used} de {limit} gratis', { used: stats.free_used, limit: stats.free_limit }),
    stats.paid_count > 0 ? tc('{count} pagado|{count} pagados', stats.paid_count) : null,
    tc('{count} tarjeta|{count} tarjetas', stats.cards_count),
  ].filter(Boolean) as string[];
  return (
    <AppText variant="caption" tone="muted" numberOfLines={2}>
      {parts.join(' · ')}
    </AppText>
  );
}

/** Buy a Tarjeta de ánimo bound to this link: adds it to the cart, then opens the cart. */
export function BuyCardButton({ link, offer }: { link: TrainingLink; offer: CheerCardOffer | null }) {
  const { t } = useI18n();
  const add = useAddCartItem();
  const [error, setError] = useState<string | null>(null);
  if (!offer?.available || !offer.product_variant_uuid || !isLinkActive(link)) return null;
  const price = offer.price_minor !== null && offer.currency ? formatMoney(offer.price_minor, offer.currency) : null;

  return (
    <View style={{ gap: spacing.xxs }}>
      <AppButton
        variant="secondary"
        size="sm"
        icon={ShoppingBag}
        label={price ? t('Comprar tarjeta para este enlace · {price}', { price }) : t('Comprar tarjeta para este enlace')}
        loading={add.isPending}
        onPress={() => {
          setError(null);
          add.mutate(
            { product_variant_uuid: offer.product_variant_uuid!, quantity: 1, cheer_link_uuid: link.uuid },
            { onSuccess: () => router.push('/cart' as Href), onError: (e) => setError(e.message) },
          );
        }}
      />
      {error ? <InlineError message={error} /> : null}
    </View>
  );
}

/** Cards bound to one link, each with "Cambiar enlace" and "Desactivar". */
export function LinkCardsList({ cards, links }: { cards: CheerCard[]; links: TrainingLink[] }) {
  if (cards.length === 0) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      {cards.map((card) => (
        <CardRow key={card.uuid} card={card} links={links} />
      ))}
    </View>
  );
}

/** One card: code, its messages, and the two actions (each with visible progress/errors). */
export function CardRow({ card, links }: { card: CheerCard; links: TrainingLink[] }) {
  const { t, tc } = useI18n();
  const update = useUpdateCheerCard();
  const [picking, setPicking] = useState(false);
  const [confirmOff, setConfirmOff] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const run = (linkUuid: string | null, success: string) => {
    setError(null);
    setDone(null);
    update.mutate(
      { uuid: card.uuid, linkUuid },
      {
        onSuccess: () => setDone(success),
        onError: (e) => setError(e.message),
        onSettled: () => {
          setPicking(false);
          setConfirmOff(false);
        },
      },
    );
  };

  const choices = links.filter((l) => isLinkActive(l) && l.uuid !== card.link?.uuid);

  return (
    <View style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairline, backgroundColor: colors.background, padding: spacing.sm, gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <CreditCard size={16} color={colors.accent} />
        <AppText variant="caption" style={{ fontFamily: fontFamily.semibold, flex: 1 }} numberOfLines={1}>
          {t('Tarjeta {code}', { code: card.code })}
        </AppText>
        <Badge label={card.active ? t('Activa') : t('Inactiva')} variant={card.active ? 'success' : 'neutral'} />
      </View>
      <AppText variant="caption" tone="muted">
        {card.link ? t('Abre «{title}»', { title: card.link.title }) : t('No abre ningún enlace por ahora.')}
        {' · '}
        {tc('{count} mensaje|{count} mensajes', card.stats.messages_count)}
      </AppText>
      <View style={{ flexDirection: 'row', gap: spacing.xs }}>
        <AppButton
          variant="secondary"
          size="sm"
          icon={Link2}
          style={{ flex: 1 }}
          label={card.link ? t('Cambiar enlace') : t('Vincular a un enlace')}
          disabled={choices.length === 0}
          loading={update.isPending && picking}
          onPress={() => setPicking(true)}
        />
        {card.link ? (
          <AppButton variant="ghost" size="sm" icon={Power} style={{ flex: 1 }} label={t('Desactivar')} onPress={() => setConfirmOff(true)} />
        ) : null}
      </View>
      {choices.length === 0 && !card.link ? (
        <AppText variant="caption" tone="subtle">
          {t('Crea un enlace activo para vincular esta tarjeta.')}
        </AppText>
      ) : null}
      {done ? (
        <AppText variant="caption" tone="success" accessibilityLiveRegion="polite">
          {done}
        </AppText>
      ) : null}
      {error ? <InlineError message={error} /> : null}

      {picking ? (
        <Sheet visible onClose={() => !update.isPending && setPicking(false)}>
          <AppText variant="subtitle" style={{ marginBottom: spacing.xs }}>
            {t('¿Qué enlace abrirá esta tarjeta?')}
          </AppText>
          {choices.map((link) => (
            <PressableScale
              key={link.uuid}
              disabled={update.isPending}
              onPress={() => run(link.uuid, t('Listo: la tarjeta ahora abre «{title}».', { title: link.title }))}
              accessibilityRole="button"
              accessibilityLabel={t('Vincular a {title}', { title: link.title })}
              style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52, paddingHorizontal: spacing.xs }}>
              <Link2 size={18} color={colors.accent} />
              <AppText variant="bodyStrong" style={{ flex: 1 }} numberOfLines={1}>
                {link.title}
              </AppText>
              {update.isPending && update.variables?.linkUuid === link.uuid ? <Check size={18} color={colors.subtle} /> : null}
            </PressableScale>
          ))}
        </Sheet>
      ) : null}

      <ConfirmDialog
        visible={confirmOff}
        title={t('¿Desactivar esta tarjeta?')}
        description={t('Al acercarla se verá un aviso de tarjeta inactiva. Puedes volver a vincularla cuando quieras.')}
        confirmLabel={t('Desactivar')}
        loading={update.isPending}
        onCancel={() => setConfirmOff(false)}
        onConfirm={() => run(null, t('Tarjeta desactivada.'))}
      />
    </View>
  );
}
