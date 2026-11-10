/**
 * The limits of a story, one slim meter per kind (Fotos, Videos, Mensaje
 * de voz): "X de Y", what is left, the term of a prepaid plan ("Vence
 * el…") and — only when the store can really sell it — a quiet text action
 * to get more space or renew an expired plan. Each kind owns its purchase
 * sheet (same in-app purchase flow, price from the store SDK). Without IAP
 * the meter and the limit message are all there is: nothing is hidden and
 * nothing points to buying elsewhere.
 */

import { Image as ImageIcon, Mic, Video, type LucideIcon } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { PhotoExpansionSheet } from '@/features/iap/photo-expansion-sheet';
import { usePhotoExpansion } from '@/features/iap/use-photo-expansion';
import { QUOTA_KINDS, type MediaQuota, type QuotaBucket, type QuotaKind } from '@/schemas/story';
import { showToast } from '@/stores/toastStore';
import { colors, fontFamily, radius, shadows, spacing } from '@/theme/tokens';

import { isFull, kindLabel, limitMessage, meterCaption, meterRatio, meterText, PLAN_EXPIRED_MESSAGE, planState } from '../quota';

const ICONS: Record<QuotaKind, LucideIcon> = { photos: ImageIcon, videos: Video, audio: Mic };

export interface OpenRequest {
  kind: QuotaKind;
  /** Any new value re-triggers the request. */
  at: number;
}

interface KindMeterProps {
  publicId: string;
  kind: QuotaKind;
  bucket: QuotaBucket;
  /** Set by the parent when the athlete hit this kind's limit (picker, upload 422, import 422). */
  openRequest: OpenRequest | null;
  onGranted: (kind: QuotaKind) => void;
  divider: boolean;
}

function KindMeter({ publicId, kind, bucket, openRequest, onGranted, divider }: KindMeterProps) {
  const plan = planState(bucket);
  const expired = plan.status === 'expired';
  const sellable = bucket.can_expand || (expired && plan.renewable);
  const expansion = usePhotoExpansion(publicId, kind, sellable);
  const [manualOpen, setManualOpen] = useState(false);
  const [dismissedAt, setDismissedAt] = useState<number | null>(null);
  const told = useRef<number | null>(null);
  const granted = useRef(false);

  const full = isFull(bucket);
  const canOffer = sellable && expansion.canOffer;
  const Icon = ICONS[kind];

  // The limit was hit somewhere else on the screen: offer more space here
  // (once the store answered), or — when it cannot sell it — just say so.
  const requestedAt = openRequest && openRequest.kind === kind ? openRequest.at : null;
  const storeAnswered = expansion.state.phase !== 'loading' && expansion.state.phase !== 'idle';
  const requested = requestedAt !== null && requestedAt !== dismissedAt && storeAnswered;
  const open = manualOpen || (requested && canOffer);

  useEffect(() => {
    if (!requested || canOffer || requestedAt === null || told.current === requestedAt) return;
    told.current = requestedAt;
    showToast(expired ? PLAN_EXPIRED_MESSAGE : limitMessage(kind));
  }, [requested, requestedAt, canOffer, expired, kind]);

  useEffect(() => {
    if (expansion.state.phase === 'success' && !granted.current) {
      granted.current = true;
      onGranted(kind);
    } else if (expansion.state.phase !== 'success') {
      granted.current = false;
    }
  }, [expansion.state.phase, kind, onGranted]);

  return (
    <View style={{ paddingVertical: spacing.sm + 2, borderBottomWidth: divider ? 1 : 0, borderBottomColor: colors.hairline, gap: spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Icon size={17} color={colors.accent} strokeWidth={1.9} />
        <AppText variant="body" style={{ flex: 1, fontFamily: fontFamily.medium }}>
          {kindLabel(kind)}
        </AppText>
        <AppText
          accessibilityLabel={`${bucket.used} de ${bucket.limit} ${kindLabel(kind).toLowerCase()}`}
          style={{ fontFamily: fontFamily.semibold, fontSize: 15, color: colors.foreground, fontVariant: ['tabular-nums'] }}>
          {meterText(bucket)}
        </AppText>
      </View>

      <View style={{ height: 4, borderRadius: 2, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }}>
        <View style={{ width: `${meterRatio(bucket) * 100}%`, height: '100%', borderRadius: 2, backgroundColor: full || expired ? colors.gold : colors.foreground }} />
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm }}>
        <AppText variant="caption" tone="subtle" style={{ flex: 1, fontSize: 13 }}>
          {meterCaption(kind, bucket)}
        </AppText>
        {canOffer ? (
          <PressableScale
            onPress={() => setManualOpen(true)}
            scaleTo={0.94}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={expired ? `Renovar plan de ${kindLabel(kind).toLowerCase()}` : `Ampliar ${kindLabel(kind).toLowerCase()}`}>
            <AppText style={{ fontFamily: fontFamily.bold, fontSize: 13, color: colors.accent }}>{expired ? 'Renovar' : 'Ampliar'}</AppText>
          </PressableScale>
        ) : null}
      </View>

      <PhotoExpansionSheet
        visible={open}
        kind={kind}
        renew={expired}
        onClose={() => {
          setManualOpen(false);
          setDismissedAt(requestedAt);
          expansion.dismiss();
        }}
        state={expansion.state}
        pack={expansion.pack}
        onBuy={() => void expansion.buy()}
        onRestore={() => void expansion.restore()}
      />
    </View>
  );
}

interface QuotaMetersProps {
  publicId: string;
  quota: MediaQuota;
  openRequest?: OpenRequest | null;
  onGranted?: (kind: QuotaKind) => void;
}

const noop = () => {};

export function QuotaMeters({ publicId, quota, openRequest = null, onGranted = noop }: QuotaMetersProps) {
  return (
    <View
      style={{
        backgroundColor: colors.card,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        borderWidth: 1,
        borderColor: colors.hairline,
        paddingHorizontal: spacing.md,
        paddingVertical: spacing.xxs,
        ...shadows.soft,
      }}>
      {QUOTA_KINDS.map((kind, index) => (
        <KindMeter
          key={kind}
          publicId={publicId}
          kind={kind}
          bucket={quota[kind]}
          openRequest={openRequest}
          onGranted={onGranted}
          divider={index < QUOTA_KINDS.length - 1}
        />
      ))}
    </View>
  );
}
