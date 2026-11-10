import { Smartphone, Sparkles } from 'lucide-react-native';
import { Fragment, useState, type ReactNode } from 'react';
import { ScrollView, View } from 'react-native';
import Animated, { FadeIn, useReducedMotion, withSpring, withTiming } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { TagFlip, TagStage, type TagSide } from '@/components/tag';
import { TAG_WIDTHS } from '@/components/tag/tag-geometry';
import { Chip } from '@/components/ui/chip';
import { useI18n } from '@/i18n';
import { colors, fontFamily, motion, radius, spacing, springs } from '@/theme/tokens';

import type { TagFace } from '../tag-design';

interface TagHeroProps {
  face: TagFace;
  accent: string | null;
  /** Space reserved at the top for the floating header (safe area + bar). */
  topInset: number;
  height: number;
}

/**
 * The detail hero: the tag on its soft stage, flippable, floating and
 * leaning with the phone. It enters with a scale + fade from the card the
 * user tapped (the shared-element feel, without a native shared-element
 * API — Reanimated 4's is behind a build flag this app doesn't set).
 */
export function TagHero({ face, accent, topInset, height }: TagHeroProps) {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  const [side, setSide] = useState<TagSide>('front');
  const entering = reduceMotion ? FadeIn.duration(motion.fast) : heroEntering;
  // Fit the whole tag (loop + body + floor shadow ≈ 2.45× its width) between the
  // top bar (`topInset` already includes it) and the caption, so it never runs under
  // the sheet or the "girar" hint.
  const available = height - topInset - 96;
  const tagWidth = Math.max(96, Math.min(TAG_WIDTHS.lg, Math.floor(available / 2.45)));

  return (
    <TagStage accent={accent} bordered={false} style={{ height, paddingTop: topInset, paddingBottom: 96, alignItems: 'center', justifyContent: 'center' }}>
      <Animated.View entering={entering}>
        <TagFlip face={face} width={tagWidth} float tilt onSideChange={setSide} />
      </Animated.View>
      <View style={{ position: 'absolute', bottom: spacing.xl + spacing.md, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: spacing.xs }}>
        <SideDot active={side === 'front'} />
        <SideDot active={side === 'back'} />
        <AppText variant="caption" tone="muted" style={{ marginLeft: 4 }}>
          {side === 'front' ? t('Frente · toca o desliza para girar') : t('Reverso · toca o desliza para girar')}
        </AppText>
      </View>
    </TagStage>
  );
}

/** Scale + rise + fade from the tapped card's size (UI-thread custom entering). */
function heroEntering() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateY: 28 }, { scale: 0.84 }] },
    animations: {
      opacity: withTiming(1, { duration: 260 }),
      transform: [{ translateY: withSpring(0, springs.gentle) }, { scale: withSpring(1, springs.gentle) }],
    },
  };
}

function SideDot({ active }: { active: boolean }) {
  return <View style={{ width: active ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: active ? colors.foreground : colors.border }} />;
}

/** Segmented-style chips to pick a design/variant; the tag art crossfades (expo-image transition). */
export function DesignChips<T extends string>({ options, value, onChange, label }: { options: { value: T; label: string; disabled?: boolean }[]; value: T; onChange: (value: T) => void; label: string }) {
  if (options.length < 2) return null;
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ marginHorizontal: -spacing.lg }}
        contentContainerStyle={{ gap: spacing.xs, paddingHorizontal: spacing.lg }}
        accessibilityRole="tablist">
        {options.map((option) => (
          <Chip key={option.value} label={option.label} selected={option.value === value} disabled={option.disabled} onPress={() => onChange(option.value)} />
        ))}
      </ScrollView>
    </View>
  );
}

/** iOS grouped section: white rounded card, hairline-separated rows. */
export function Grouped({ title, children }: { title?: string; children: ReactNode }) {
  const rows = (Array.isArray(children) ? children : [children]).filter(Boolean);
  return (
    <View style={{ gap: spacing.xs }}>
      {title ? (
        <AppText variant="label" tone="muted" style={{ textTransform: 'uppercase' }}>
          {title}
        </AppText>
      ) : null}
      <View style={{ borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline, overflow: 'hidden' }}>
        {rows.map((row, index) => (
          <Fragment key={index}>
            {index > 0 ? <View style={{ height: 1, marginLeft: spacing.md, backgroundColor: colors.hairline }} /> : null}
            <View style={{ paddingHorizontal: spacing.md, paddingVertical: 14 }}>{row}</View>
          </Fragment>
        ))}
      </View>
    </View>
  );
}

/** "Cómo funciona": Acerca tu celular → se abre tu recuerdo. */
export function HowItWorksStrip() {
  const { t } = useI18n();
  const reduceMotion = useReducedMotion();
  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeIn.delay(160).duration(motion.base)}
      accessible
      accessibilityLabel={t('Cómo funciona: acerca tu celular al tag y se abre tu recuerdo. Sin códigos QR.')}
      style={{ gap: spacing.sm }}>
      <AppText variant="label" tone="muted" style={{ textTransform: 'uppercase' }}>
        {t('Cómo funciona')}
      </AppText>
      <View style={{ gap: spacing.md, padding: spacing.md, borderRadius: radius.lg, borderCurve: 'continuous', backgroundColor: colors.black }}>
        <Step icon={<Smartphone size={18} color={colors.gold} />} title={t('Acerca tu celular')} caption={t('NFC, sin apps extra')} />
        <Step icon={<Sparkles size={18} color={colors.gold} />} title={t('Se abre tu recuerdo')} caption={t('Fotos, tiempos, historia')} />
      </View>
    </Animated.View>
  );
}

function Step({ icon, title, caption }: { icon: ReactNode; title: string; caption: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(201,174,139,0.14)' }}>{icon}</View>
      <View style={{ flex: 1 }}>
        <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15, lineHeight: 20, color: colors.onDark }}>
          {title}
        </AppText>
        <AppText style={{ fontFamily: fontFamily.regular, fontSize: 13, lineHeight: 18, color: colors.onDarkMuted }}>
          {caption}
        </AppText>
      </View>
    </View>
  );
}
