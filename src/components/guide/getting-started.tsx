import { router, type Href } from 'expo-router';
import { Check, ChevronRight, X } from 'lucide-react-native';
import { Pressable, View } from 'react-native';

import { AppText } from '@/components/app-text';
import { IconButton } from '@/components/ui/icon-button';
import { useUiStore } from '@/stores/uiStore';
import { colors, fontFamily, spacing } from '@/theme/tokens';
import type { MyProfileResponse } from '@/types/models';

interface Step {
  id: string;
  label: string;
  hint: string;
  done: boolean;
  href: Href;
}

/** Derived only from real account data — a step is "done" because it actually happened. */
export function gettingStartedSteps(profile: MyProfileResponse): Step[] {
  return [
    {
      id: 'profile',
      label: 'Completa tu perfil',
      hint: 'Foto, nombre de usuario y bio.',
      done: !!profile.profile?.username && !!profile.profile?.profile_photo_url,
      href: '/settings/account',
    },
    {
      id: 'medal',
      label: 'Reclama tu primera medalla',
      hint: 'Escanea el Legacy Code de tu placa o medalla.',
      done: profile.stats.medal_count > 0,
      href: '/legacy/scan',
    },
    {
      id: 'follow',
      label: 'Sigue a otros atletas',
      hint: 'Su actividad aparecerá en tu comunidad.',
      done: profile.social.following_count > 0,
      href: '/explore',
    },
    {
      id: 'moment',
      label: 'Comparte tu primer momento',
      hint: 'Un entrenamiento, una carrera o un recuerdo.',
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
  const dismissed = useUiStore((s) => s.dismissedGettingStarted);
  const dismiss = useUiStore((s) => s.setDismissedGettingStarted);
  const steps = gettingStartedSteps(profile);
  const completed = steps.filter((s) => s.done).length;

  if (dismissed || completed === steps.length) return null;

  return (
    <View style={{ borderRadius: 20, backgroundColor: colors.graphite, padding: spacing.md, gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <View style={{ flex: 1 }}>
          <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 17 }}>Primeros pasos</AppText>
          <AppText variant="caption" tone="muted">
            {completed} de {steps.length} completados
          </AppText>
        </View>
        <IconButton icon={X} label="Ocultar primeros pasos" onPress={() => dismiss(true)} size={18} color={colors.subtle} />
      </View>

      <View
        style={{ height: 4, borderRadius: 2, backgroundColor: colors.graphiteLight, overflow: 'hidden' }}
        accessibilityRole="progressbar"
        accessibilityValue={{ min: 0, max: steps.length, now: completed }}>
        <View style={{ width: `${(completed / steps.length) * 100}%`, height: '100%', backgroundColor: colors.gold }} />
      </View>

      <View>
        {steps.map((step) => (
          <Pressable
            key={step.id}
            onPress={() => router.push(step.href)}
            disabled={step.done}
            accessibilityRole="button"
            accessibilityState={{ checked: step.done, disabled: step.done }}
            accessibilityLabel={`${step.label}${step.done ? ', completado' : ''}`}
            style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 52, opacity: pressed ? 0.6 : 1 })}>
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
          </Pressable>
        ))}
      </View>
    </View>
  );
}
