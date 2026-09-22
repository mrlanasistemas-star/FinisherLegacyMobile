import { router } from 'expo-router';
import { Check, ImagePlus, Sparkles } from 'lucide-react-native';
import { View } from 'react-native';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { Card } from '@/components/card';
import { Screen } from '@/components/screen';
import { ScreenHeader } from '@/components/screen-header';
import { colors, radius, spacing } from '@/theme/tokens';

interface Tier {
  name: string;
  description: string;
  bullets: string[];
}

const TIERS: Tier[] = [
  {
    name: 'FREE',
    description: 'Incluido en cada participación, sin costo.',
    bullets: ['5 fotos por carrera', '1 video por carrera'],
  },
  {
    name: 'MEMORY PACK',
    description: 'Más espacio para revivir una carrera específica.',
    bullets: ['Más fotos para esa participación', 'Ideal para una carrera especial'],
  },
  {
    name: 'MEMORY PACK MAX',
    description: 'El máximo de capacidad para una participación.',
    bullets: ['Más fotos y video', 'Para cuando una carrera merece todo el espacio'],
  },
];

/**
 * Purely informational — Laravel doesn't expose a paid media entitlement
 * product yet (ResolveMediaEntitlement only resolves the free allowance
 * today). No prices, no purchase flow. See
 * docs/MOBILE_BACKEND_REQUIREMENTS.md for the entitlement contract this
 * screen is designed to consume once it exists.
 */
export default function MemoryUpgradesScreen() {
  return (
    <Screen scroll edges={['top', 'left', 'right']}>
      <ScreenHeader title="Más espacio" />

      <View style={{ alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.lg, gap: spacing.xs }}>
        <Sparkles color={colors.gold} size={30} />
        <AppText variant="title" align="center">
          Tus recuerdos incluidos están completos
        </AppText>
        <AppText variant="body" tone="muted" align="center">
          Estamos preparando más espacio para que ninguna meta se quede fuera de tu Legacy.
        </AppText>
      </View>

      <View style={{ gap: spacing.md, paddingBottom: spacing.xl }}>
        {TIERS.map((tier) => (
          <Card key={tier.name} style={{ gap: spacing.sm }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <AppText variant="label" tone="gold" style={{ letterSpacing: 2 }}>
                {tier.name}
              </AppText>
              {tier.name !== 'FREE' ? (
                <View
                  style={{
                    paddingHorizontal: spacing.sm,
                    paddingVertical: 3,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: colors.border,
                  }}>
                  <AppText variant="caption" tone="muted">
                    Próximamente
                  </AppText>
                </View>
              ) : null}
            </View>
            <AppText variant="body" tone="muted">
              {tier.description}
            </AppText>
            <View style={{ gap: 6 }}>
              {tier.bullets.map((bullet) => (
                <View key={bullet} style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
                  <Check color={colors.gold} size={14} />
                  <AppText variant="caption">{bullet}</AppText>
                </View>
              ))}
            </View>
          </Card>
        ))}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.xs, paddingHorizontal: spacing.xs }}>
          <ImagePlus color={colors.muted} size={16} />
          <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
            Los precios y la compra estarán disponibles cuando el catálogo esté listo. Por ahora, sigue disfrutando tus
            recuerdos incluidos.
          </AppText>
        </View>

        <AppButton label="Entendido" variant="secondary" onPress={() => router.back()} />
      </View>
    </Screen>
  );
}
