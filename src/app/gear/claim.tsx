import { router, useLocalSearchParams, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ChevronRight, KeyRound, Nfc, X } from 'lucide-react-native';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AppError } from '@/api/errors';
import { extractGearCode, normalizeGearCode } from '@/api/gear';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { GearIconBadge } from '@/components/brand/gear-icon-badge';
import { PressableScale } from '@/components/motion/pressable-scale';
import { InlineError } from '@/components/ui/inline-error';
import { FormInput } from '@/components/form-input';
import { Skeleton } from '@/components/skeleton';
import { useClaimGear, usePublicGear } from '@/hooks/use-gear';
import { colors, radius, spacing } from '@/theme/tokens';

/**
 * Claim a product by its printed code (historical products). New products
 * connect by NFC tap (/nfc/[token]) — there is no camera scanner any more.
 * `?code=` (from "Tengo un código impreso") jumps straight to the preview.
 */
export default function GearClaimScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const [manualCode, setManualCode] = useState('');
  const [detectedCode, setDetectedCode] = useState<string | null>(() => (params.code ? normalizeGearCode(params.code) : null));
  const [claimError, setClaimError] = useState<string | null>(null);
  const insets = useSafeAreaInsets();

  const preview = usePublicGear(detectedCode);
  const claim = useClaimGear();

  function submitManualCode() {
    const normalized = extractGearCode(manualCode) ?? normalizeGearCode(manualCode);
    if (normalized.length < 4) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setClaimError(null);
    setDetectedCode(normalized);
  }

  function reset() {
    setDetectedCode(null);
    setClaimError(null);
  }

  async function handleClaim() {
    if (!detectedCode) return;
    setClaimError(null);
    try {
      const owned = await claim.mutateAsync(detectedCode);
      router.replace({
        pathname: '/gear/claimed',
        params: { uuid: owned.uuid, productName: owned.product_name, variantName: owned.variant_name ?? '' },
      });
    } catch (error) {
      setClaimError(error instanceof AppError ? error.message : 'No pudimos reclamar este equipo.');
    }
  }

  if (detectedCode) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
        <View style={{ flexDirection: 'row', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
          <Pressable onPress={reset} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cancelar">
            <X color={colors.foreground} size={26} />
          </Pressable>
        </View>

        <View style={{ flex: 1, paddingHorizontal: spacing.lg, paddingBottom: insets.bottom + spacing.lg, justifyContent: 'center', gap: spacing.lg }}>
          {preview.isPending ? (
            <View style={{ gap: spacing.md }}>
              <Skeleton height={100} width={100} radius={radius.lg} style={{ alignSelf: 'center' }} />
              <Skeleton height={24} width="60%" style={{ alignSelf: 'center' }} />
            </View>
          ) : preview.isError || !preview.data ? (
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <AppText variant="subtitle" align="center">
                No encontramos este código
              </AppText>
              <AppText variant="body" tone="muted" align="center">
                Verifica el código e inténtalo de nuevo.
              </AppText>
              <AppButton label="Probar otro código" variant="secondary" onPress={reset} fullWidth={false} style={{ paddingHorizontal: spacing.xl, marginTop: spacing.sm }} />
            </View>
          ) : !preview.data.claimable ? (
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <GearIconBadge productName={preview.data.product_name} size={88} />
              <AppText variant="subtitle" align="center" style={{ marginTop: spacing.sm }}>
                {preview.data.product_name}
              </AppText>
              <AppText variant="body" tone="muted" align="center">
                Este equipo ya fue reclamado por otro Legacy.
              </AppText>
              <AppButton label="Probar otro código" variant="secondary" onPress={reset} fullWidth={false} style={{ paddingHorizontal: spacing.xl, marginTop: spacing.sm }} />
            </View>
          ) : (
            <View style={{ alignItems: 'center', gap: spacing.sm }}>
              <GearIconBadge productName={preview.data.product_name} size={88} />
              <AppText variant="title" align="center" style={{ marginTop: spacing.sm }}>
                {preview.data.product_name}
              </AppText>
              {preview.data.variant_name ? (
                <AppText variant="body" tone="muted" align="center">
                  {preview.data.variant_name}
                </AppText>
              ) : null}

              <InlineError message={claimError} />

              <AppButton label="Reclamar este equipo" onPress={handleClaim} loading={claim.isPending} style={{ marginTop: spacing.md }} />
              <AppButton label="Probar otro código" variant="ghost" onPress={reset} disabled={claim.isPending} />
            </View>
          )}
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background, paddingTop: insets.top }}>
      <View style={{ flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: spacing.lg, paddingVertical: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Cerrar">
          <X color={colors.foreground} size={26} />
        </Pressable>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.lg, gap: spacing.xl, paddingBottom: insets.bottom + spacing.xl }}>
          <View style={{ gap: spacing.xs }}>
            <AppText variant="eyebrow">Mi equipo</AppText>
            <AppText variant="title" accessibilityRole="header">
              Conecta tu producto
            </AppText>
            <AppText variant="body" tone="muted">
              Escribe el código impreso en la etiqueta de tu prenda o accesorio.
            </AppText>
          </View>
          <View style={{ gap: spacing.sm }}>
            <FormInput
              label="Código del producto"
              icon={KeyRound}
              value={manualCode}
              onChangeText={(text) => setManualCode(text.toUpperCase())}
              autoCapitalize="characters"
              autoCorrect={false}
              autoFocus
              placeholder="Ej. ASTXXXXXXXXXXXX"
              returnKeyType="go"
              onSubmitEditing={submitManualCode}
            />
            <AppButton label="Buscar" onPress={submitManualCode} disabled={manualCode.trim().length < 4} />
          </View>
          <PressableScale
            onPress={() => router.replace('/activate' as Href)}
            accessibilityRole="button"
            accessibilityLabel="¿Tu producto tiene NFC? Actívalo acercando tu teléfono"
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline }}>
            <Nfc size={22} color={colors.accent} />
            <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
              ¿Tu producto tiene NFC? Acerca tu teléfono a la etiqueta y se conectará solo.
            </AppText>
            <ChevronRight size={18} color={colors.subtle} />
          </PressableScale>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
