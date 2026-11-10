import { router, type Href } from 'expo-router';
import { Check, ChevronRight, X } from 'lucide-react-native';
import { View } from 'react-native';

import { AppText } from '@/components/app-text';
import { PressableScale } from '@/components/motion/pressable-scale';
import { IconButton } from '@/components/ui/icon-button';
import { useUiStore } from '@/stores/uiStore';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { MyProfileResponse } from '@/types/models';
import { useI18n, type Translate } from '@/i18n';

interface Step {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  href: Href;
}

/** Derived only from real account data — a step is "done" because it actually happened. */
export function gettingStartedSteps(profile: MyProfileResponse, t: Translate): Step[] {
  return [
    {
      id: 'profile',
      label: t('Completa tu perfil'),
      hint: t('Foto, nombre de usuario y bio.'),
      done: !!profile.profile?.username && !!profile.profile?.profile_photo_url,
      href: '/settings/account',
    },
    {
      id: 'medal',
      label: t('Reclama tu primera medalla'),
      hint: t('Acerca tu pieza Finisher Legacy al teléfono o agrégala a mano.'),
      done: profile.stats.medal_count > 0,
      href: '/medals/create',
    },
    {
      id: 'follow',
      label: t('Sigue a otros atletas'),
      hint: t('Su actividad aparecerá en tu comunidad.'),
      done: profile.social.following_count > 0,
      href: '/search',
    },
    {
      id: 'moment',
      label: t('Comparte tu primer momento'),
      hint: t('Un entrenamiento, una carrera o un recuerdo.'),
      done: profile.social.moments_count > 0,
      href: '/moments/create',
    },
  ];
}

/**
 * "Primeros pasos" — guides a new athlete to the four things that make the
 * app come alive. Disappears on its own once everything is done.
 */
export function GettingStarted({ profile }: { profile: MyProfileResponse }) {
  const { t } = useI18n();
  const dismissed = useUiStore((s) => s.dismissedGettingStarted);
  const dismiss = useUiStore((s) => s.setDismissedGettingStarted);
  const steps = gettingStartedSteps(profile, t);
  const completed = steps.filter((s) => s.done).length;

  if (dismissed || completed === steps.length) return null;

  return (
    <View style={{ borderRadius: 18, borderCurve: 'continuous', backgroundColor: colors.card, borderWidth: 1, borderColor: colors.hairline, padding: spacing.md, gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 17 }}>{t('Primeros pasos')}</AppText>
          <AppText variant="caption" tone="muted">
            {t('{completed} de {total} completados', { completed, total: steps.length })}
          </AppText>
        </View>
        <IconButton icon={X} label={t('Ocultar primeros pasos')} onPress={() => dismiss(true)} size={18} color={colors.subtle} />
      </View>

      <View
        style={{ height: 4, borderRadius: 2, backgroundColor: colors.surfaceMuted, overflow: 'hidden' }}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: steps.length, now: completed }}>
        <View style={{ width: `${(completed / steps.length) * 100}%`, height: '100%', backgroundColor: colors.gold }} />
      </View>

      <View>
        {steps.map((step) => (
          <PressableScale
            dim
            scaleTo={0.98}
            key={step.id}
            onPress={() => router.push(step.href)}
            disabled={step.done}
            accessibilityRole="button"
            accessibilityState={{ checked: step.done, disabled: step.done }}
            accessibilityLabel={step.done ? t('{label}, completado', { label: step.label }) : step.label}
            style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52, paddingVertical: spacing.xs }}>
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 12,
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: step.done ? colors.gold : 'transparent',
                borderWidth: step.done ? 0 : 1.5,
                borderColor: colors.goldDim,
              }}>
              {step.done ? <Check size={14} color={colors.black} strokeWidth={3} /> : null}
            </View>
            <View style={{ flex: 1 }}>
              <AppText
                style={{
                  fontFamily: fontFamily.medium,
                  fontSize: 15,
                  color: step.done ? colors.subtle : colors.foreground,
                  textDecorationLine: step.done ? 'line-through' : 'none',
                }}>
                {step.label}
              </AppText>
              {!step.done ? (
                <AppText variant="caption" tone="muted">
                  {step.hint}
                </AppText>
              ) : null}
            </View>
            {!step.done ? <ChevronRight size={18} color={colors.subtle} /> : null}
          </PressableScale>
        ))}
      </View>
    </View>
  );
}
