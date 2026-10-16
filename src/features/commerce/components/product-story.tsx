import { ChevronDown, Nfc, ShieldCheck, Smartphone, Sparkles } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import Animated, { FadeIn, FadeOut, LinearTransition } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import type { ProductContentSection } from '@/types/models';
import { haptics } from '@/utils/haptics';

/** "Producto conectado" pill — over media or inline. */
export function NfcBadge({ floating = false }: { floating?: boolean }) {
  return (
    <View
      accessible
      accessibilityLabel="Producto conectado con NFC"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        gap: 5,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: radius.pill,
        backgroundColor: floating ? 'rgba(10,10,12,0.72)' : colors.goldWash,
        borderWidth: 1,
        borderColor: colors.goldDim,
      }}>
      <Nfc size={13} color={colors.gold} />
      <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 11, letterSpacing: 0.6, color: colors.gold }}>NFC</AppText>
    </View>
  );
}

/**
 * "Qué se guarda en Mi Equipo" — what owning this product means inside the
 * app. Only claims what the product really does: connected products add a
 * tap-to-open link; everything bought lands in Mi Equipo.
 */
export function GearPromise({ connected, isLegacyPlate }: { connected: boolean; isLegacyPlate: boolean }) {
  const rows = [
    { icon: ShieldCheck, title: 'Queda en Mi Equipo', body: 'Al confirmarse tu pago, el producto aparece en tu equipo con la fecha en que lo recibiste.' },
    { icon: Sparkles, title: 'Se une a tus carreras', body: 'Márcalo en cada evento en el que lo usaste y forma parte de tu legado.' },
    ...(connected
      ? [
          {
            icon: Smartphone,
            title: isLegacyPlate ? 'Acerca tu teléfono' : 'Producto conectado',
            body: isLegacyPlate
              ? 'Tu Legacy Plate abre tu resultado, tus fotos y tu historia con solo acercar un teléfono.'
              : 'Tiene NFC: al acercar tu teléfono lo activas y queda vinculado a tu perfil.',
          },
        ]
      : []),
  ];

  return (
    <View style={{ gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.graphite, borderWidth: 1, borderColor: colors.hairline }}>
      <AppText variant="label" tone="gold">
        QUÉ SE GUARDA EN MI EQUIPO
      </AppText>
      {rows.map(({ icon: Icon, title, body }) => (
        <View key={title} style={{ flexDirection: 'row', gap: spacing.sm }}>
          <View style={{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.goldWash }}>
            <Icon size={16} color={colors.gold} />
          </View>
          <View style={{ flex: 1, gap: 2 }}>
            <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }}>{title}</AppText>
            <AppText variant="caption" tone="muted">
              {body}
            </AppText>
          </View>
        </View>
      ))}
    </View>
  );
}

/** Editorial content blocks (Qué es, Cómo lo usas, Materiales, Cuidados, FAQ) as calm accordions. */
export function ProductSections({ sections }: { sections: ProductContentSection[] }) {
  const [open, setOpen] = useState<string | null>(sections[0]?.key ?? null);
  if (sections.length === 0) return null;

  return (
    <View style={{ borderTopWidth: 1, borderTopColor: colors.hairline }}>
      {sections.map((section) => {
        const expanded = open === section.key;
        return (
          <Animated.View key={section.key} layout={LinearTransition.duration(220)} style={{ borderBottomWidth: 1, borderBottomColor: colors.hairline }}>
            <Pressable
              onPress={() => {
                haptics.selection();
                setOpen(expanded ? null : section.key);
              }}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              style={{ minHeight: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: spacing.sm }}>
              <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 16, flex: 1 }}>{section.title}</AppText>
              <ChevronDown size={18} color={colors.muted} style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }} />
            </Pressable>
            {expanded ? (
              <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(120)} style={{ paddingBottom: spacing.md }}>
                <AppText variant="body" tone="muted" style={{ lineHeight: 23 }}>
                  {section.body}
                </AppText>
              </Animated.View>
            ) : null}
          </Animated.View>
        );
      })}
    </View>
  );
}
