/**
 * Photo space of a Legacy story: used / limit from the backend
 * (`/stories/{id}/quota`) and, when the store can sell an expansion,
 * "Ampliar espacio" opening PhotoExpansionSheet. When the limit is
 * reached the sheet opens on its own once per visit. Without IAP (no
 * native module, store not configured, nothing on sale) only the counter
 * is shown — no link to buy elsewhere.
 */

import { Images } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { Skeleton } from '@/components/skeleton';
import { colors, radius, spacing } from '@/theme/tokens';

import { PhotoExpansionSheet } from './photo-expansion-sheet';
import { usePhotoExpansion, useStoryQuota } from './use-photo-expansion';

export function StoryQuotaCard({ storyPublicId }: { storyPublicId: string }) {
  const quota = useStoryQuota(storyPublicId);
  const expansion = usePhotoExpansion(storyPublicId);
  const [open, setOpen] = useState(false);
  const autoOpened = useRef(false);

  const data = expansion.state.quota ?? quota.data ?? null;
  const full = data !== null && data.remaining <= 0;
  const ready = expansion.state.phase === 'ready';

  useEffect(() => {
    if (full && ready && !autoOpened.current) {
      autoOpened.current = true;
      setOpen(true);
    }
  }, [full, ready]);

  if (quota.isPending) {
    return <Skeleton width="100%" height={96} />;
  }
  if (!data) return null;

  const ratio = data.limit > 0 ? Math.min(1, data.used / data.limit) : 1;

  return (
    <View
      style={{
        gap: spacing.sm,
        padding: spacing.md,
        borderRadius: radius.lg,
        borderCurve: 'continuous',
        backgroundColor: colors.card,
        borderWidth: 1,
        borderColor: full ? colors.gold : colors.hairline,
      }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
        <Images color={colors.accent} size={20} />
        <AppText variant="bodyStrong" style={{ flex: 1 }}>
          Espacio para fotos
        </AppText>
        <AppText variant="bodyStrong" accessibilityLabel={`${data.used} de ${data.limit} fotos`}>
          {data.used}/{data.limit}
        </AppText>
      </View>

      <View style={{ height: 6, borderRadius: 3, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }}>
        <View style={{ width: `${ratio * 100}%`, height: '100%', borderRadius: 3, backgroundColor: full ? colors.gold : colors.foreground }} />
      </View>

      <AppText variant="caption" tone="subtle">
        {full
          ? 'Llegaste al límite de fotos de este recuerdo. Las que ya tienes se quedan.'
          : `Te quedan ${data.remaining} ${data.remaining === 1 ? 'foto' : 'fotos'}.`}
      </AppText>

      {expansion.canOffer ? (
        <AppButton
          label="Ampliar espacio"
          size="md"
          variant={full ? 'legacy' : 'secondary'}
          onPress={() => setOpen(true)}
          loading={expansion.state.phase === 'loading'}
        />
      ) : null}

      <PhotoExpansionSheet
        visible={open}
        onClose={() => {
          setOpen(false);
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
