import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Nfc } from 'lucide-react-native';
import type { ReactNode } from 'react';
import { View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { Badge } from '@/components/ui/badge';
import { NFC_TARGET_LABEL } from '@/features/nfc/nfc-target';
import { colors, palette, radius, shadows, spacing } from '@/theme/tokens';
import type { NfcTarget } from '@/types/nfc';

interface NfcActivationCardProps {
  target: NfcTarget | null;
  /** Small status line above the title ("Listo para activar", "Ya es tuyo"). */
  status?: string;
  statusVariant?: 'gold' | 'success' | 'neutral' | 'destructive';
  children?: ReactNode;
}

/**
 * The physical product, revealed: image (or a brushed-steel plate when
 * there's none), what it is, and whatever action fits the state. Used for
 * every NFC tap outcome so the moment always looks the same.
 */
export function NfcActivationCard({ target, status, statusVariant = 'gold', children }: NfcActivationCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.springify().damping(18).stiffness(160)}
      style={{ borderRadius: radius.xl, borderCurve: 'continuous', overflow: 'hidden', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline, ...shadows.card }}>
      <View style={{ height: 200, backgroundColor: colors.surfaceMuted }}>
        {target?.image_url ? (
          <Image source={{ uri: target.image_url }} style={{ width: '100%', height: '100%' }} contentFit="cover" transition={250} accessibilityIgnoresInvertColors />
        ) : (
          <SteelPlate />
        )}
        <LinearGradient colors={['rgba(25,25,28,0)', 'rgba(25,25,28,0.95)']} style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 90 }} />
        {status ? (
          <View style={{ position: 'absolute', top: spacing.sm, left: spacing.sm }}>
            <Badge label={status} variant={statusVariant} />
          </View>
        ) : null}
      </View>

      <View style={{ padding: spacing.lg, gap: spacing.xs }}>
        {target ? (
          <AppText variant="eyebrow">
            {NFC_TARGET_LABEL[target.type].toUpperCase()}
          </AppText>
        ) : null}
        <AppText variant="title" style={{ fontSize: 24, lineHeight: 29 }} accessibilityRole="header">
          {target?.title ?? 'Producto Finisher Legacy'}
        </AppText>
        {target?.subtitle ? (
          <AppText variant="body" tone="muted">
            {target.subtitle}
          </AppText>
        ) : null}
        {children ? <View style={{ marginTop: spacing.md, gap: spacing.sm }}>{children}</View> : null}
      </View>
    </Animated.View>
  );
}

/** Fallback art: a warm bone plate with a gold hairline and the NFC mark — never an empty grey box. */
function SteelPlate() {
  return (
    <LinearGradient
      colors={[palette.white, palette.bone, '#EFE6D8', palette.bone]}
      locations={[0, 0.45, 0.7, 1]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ width: 120, height: 78, borderRadius: 10, borderWidth: 1, borderColor: colors.goldDim, alignItems: 'center', justifyContent: 'center' }}>
        <Nfc size={30} color={colors.goldSoft} strokeWidth={1.6} />
      </View>
    </LinearGradient>
  );
}
