import { router } from 'expo-router';
import { Nfc } from 'lucide-react-native';
import { Pressable, ScrollView, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { GearIconBadge } from '@/components/brand/gear-icon-badge';
import { Skeleton } from '@/components/skeleton';
import { SectionHeader } from '@/components/ui/section-header';
import { useMyGear } from '@/hooks/use-gear';
import { colors, radius, spacing } from '@/theme/tokens';

/**
 * "Mi equipo": the Finisher products connected to this athlete's story.
 * Products join by an NFC tap (see /nfc/[token]) — the empty state teaches
 * that gesture instead of offering a scanner.
 */
export function MyGearRail() {
  const gear = useMyGear();
  const items = gear.data ?? [];

  return (
    <View>
      <SectionHeader
        title="Mi equipo"
        actionLabel={items.length > 0 ? `Ver ${items.length}` : undefined}
        onAction={() => router.push('/gear')}
        style={{ paddingHorizontal: spacing.lg }}
      />
      {gear.isPending && !gear.data ? (
        <View style={{ flexDirection: 'row', gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          <Skeleton width={124} height={140} radius={16} />
          <Skeleton width={124} height={140} radius={16} />
        </View>
      ) : items.length === 0 ? (
        <View
          style={{
            marginHorizontal: spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: spacing.md,
            padding: spacing.md,
            borderRadius: radius.lg,
            borderWidth: 1,
            borderStyle: 'dashed',
            borderColor: colors.goldDim,
          }}>
          <Nfc size={26} color={colors.gold} />
          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="bodyStrong">Conecta tu equipo</AppText>
            <AppText variant="caption" tone="muted">
              Acerca tu teléfono a la etiqueta de tu Legacy Plate o producto Finisher. Quedará aquí, unido a tu historia.
            </AppText>
          </View>
        </View>
      ) : (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: spacing.sm, paddingHorizontal: spacing.lg }}>
          {items.slice(0, 10).map((item) => (
            <Pressable
              key={item.uuid}
              onPress={() => router.push(`/gear/${item.uuid}`)}
              accessibilityRole="button"
              accessibilityLabel={`${item.product_name}${item.activated_at ? ', producto conectado' : ''}`}
              style={({ pressed }) => ({
                width: 124,
                gap: spacing.xs,
                alignItems: 'center',
                paddingVertical: spacing.md,
                paddingHorizontal: spacing.xs,
                borderRadius: radius.lg,
                backgroundColor: colors.graphite,
                borderWidth: 1,
                borderColor: colors.border,
                transform: [{ scale: pressed ? 0.97 : 1 }],
              })}>
              <GearIconBadge productName={item.product_name} size={48} />
              <AppText variant="caption" numberOfLines={2} align="center">
                {item.product_name}
              </AppText>
              {item.activated_at ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Nfc size={11} color={colors.gold} />
                  <AppText style={{ fontSize: 11, color: colors.gold }}>Conectado</AppText>
                </View>
              ) : null}
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}
