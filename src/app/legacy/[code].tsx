import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft, ShieldAlert } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import { AppError } from '@/api/errors';
import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { PlateCard } from '@/components/brand/plate-card';
import { Card } from '@/components/card';
import { ErrorState } from '@/components/error-state';
import { Reveal } from '@/components/motion/reveal';
import { Screen } from '@/components/screen';
import { Skeleton } from '@/components/skeleton';
import { useClaimLegacyCode, useLegacyCodeLookup } from '@/hooks/use-legacy-code';
import { formatLongDate } from '@/utils/dates';
import { colors, spacing } from '@/theme/tokens';

export default function LegacyCodeLookupScreen() {
  const { code } = useLocalSearchParams<{ code: string }>();
  const { data, isPending, isError, refetch } = useLegacyCodeLookup(code);
  const claim = useClaimLegacyCode();
  const [claimError, setClaimError] = useState<string | null>(null);

  async function handleClaim() {
    setClaimError(null);
    try {
      const result = await claim.mutateAsync(code);
      router.replace({
        pathname: '/legacy/claimed',
        params: { code: result.legacy_code, medalUuid: result.medal?.id ?? '' },
      });
    } catch (error) {
      setClaimError(error instanceof AppError ? error.message : 'No pudimos reclamar este código.');
    }
  }

  return (
    <Screen scroll edges={['top', 'left', 'right']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.sm }}>
        <Pressable onPress={() => router.back()} hitSlop={12} accessibilityRole="button" accessibilityLabel="Volver">
          <ChevronLeft color={colors.foreground} size={26} />
        </Pressable>
      </View>

      {isPending ? (
        <View style={{ gap: spacing.md }}>
          <Skeleton height={140} radius={22} />
          <Skeleton height={100} radius={16} />
        </View>
      ) : isError || !data ? (
        <ErrorState message="No encontramos este Legacy Code." onRetry={refetch} />
      ) : (
        <Reveal style={{ gap: spacing.lg }}>
          {!data.available ? (
            <PlateCard code={data.code}>
              <View style={{ flexDirection: 'row', gap: spacing.sm, alignItems: 'center', marginTop: spacing.xs }}>
                <ShieldAlert color={colors.destructive} size={20} />
                <AppText variant="body" style={{ flex: 1 }}>
                  Este Legacy Code ya no está disponible.
                </AppText>
              </View>
            </PlateCard>
          ) : data.owned_by_me ? (
            <>
              <PlateCard code={data.code} />
              <Card>
                <AppText variant="bodyStrong">Esta placa ya es parte de tu Legacy.</AppText>
                <AppButton
                  label="Ir a mi Legacy Vault"
                  variant="secondary"
                  onPress={() => router.replace('/medals')}
                  style={{ marginTop: spacing.md }}
                />
              </Card>
            </>
          ) : data.linked ? (
            <>
              <PlateCard code={data.code} />
              <Card>
                <AppText variant="bodyStrong">Esta placa ya forma parte de otro Legacy.</AppText>
                {data.athlete ? (
                  <AppText variant="caption" tone="muted" style={{ marginTop: spacing.xxs }}>
                    Reclamada por @{data.athlete.username}
                  </AppText>
                ) : null}
              </Card>
            </>
          ) : (
            <>
              <PlateCard code={data.code}>
                {data.plate?.event_name ? (
                  <AppText variant="subtitle" style={{ marginTop: spacing.sm }}>
                    {data.plate.event_name}
                  </AppText>
                ) : null}
                {data.plate?.race_name ? (
                  <AppText variant="body" tone="muted">
                    {data.plate.race_name}
                  </AppText>
                ) : null}
                {data.plate?.event_date ? (
                  <AppText variant="caption" tone="gold">
                    {formatLongDate(data.plate.event_date)}
                  </AppText>
                ) : null}
                {(data.plate?.official_time || data.plate?.pace) && (
                  <View style={{ flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs }}>
                    {data.plate?.official_time ? (
                      <AppText variant="caption" tone="muted">
                        Tiempo: {data.plate.official_time}
                      </AppText>
                    ) : null}
                    {data.plate?.pace ? (
                      <AppText variant="caption" tone="muted">
                        Ritmo: {data.plate.pace}
                      </AppText>
                    ) : null}
                  </View>
                )}
              </PlateCard>

              {claimError ? (
                <AppText variant="caption" tone="destructive">
                  {claimError}
                </AppText>
              ) : null}

              <AppButton label="Reclamar este Legacy Code" onPress={handleClaim} loading={claim.isPending} />
            </>
          )}
        </Reveal>
      )}
    </Screen>
  );
}
