import { BatteryLow, Check, Eye, Hand, MapPin, ShieldCheck } from 'lucide-react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useState } from 'react';
import { Linking, Platform, Pressable, ScrollView, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';

import { AppButton } from '@/components/app-button';
import { AppText } from '@/components/app-text';
import { InlineError } from '@/components/ui/inline-error';
import { StickyFooter } from '@/components/ui/sticky-footer';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';
import { haptics } from '@/utils/haptics';

import { createConsent } from '../consent';
import { getLocationAccess, requestBackgroundAccess, requestForegroundAccess, startLiveTracking, TrackingError, type TrackingStartError } from '../tracking-controller';

type Step = 'consent' | 'background' | 'starting';

const START_ERROR_COPY: Record<TrackingStartError, string> = {
  no_consent: 'Necesitamos tu confirmación para empezar.',
  permission_denied: 'Sin permiso de ubicación no podemos compartir tu recorrido.',
  services_off: 'Activa la ubicación de tu teléfono e intenta otra vez.',
  other_active: 'Ya tienes otro seguimiento activo. Detenlo antes de iniciar uno nuevo.',
  unavailable: 'El seguimiento en vivo todavía no está disponible para esta carrera.',
  offline: 'Necesitas conexión para iniciar. Después, si pierdes señal, guardamos tu recorrido y lo enviamos al reconectar.',
};

/**
 * Explicit, informed consent before any GPS: who sees it, what's shared,
 * battery impact and how to stop. Then the foreground permission, then —
 * with its own explanation — the background one (optional).
 */
export function TrackingConsentFlow({ participantId, eventName, onStarted }: { participantId: number; eventName: string | null; onStarted: () => void }) {
  const [accepted, setAccepted] = useState(false);
  const [step, setStep] = useState<Step>('consent');
  const [consent, setConsent] = useState<ReturnType<typeof createConsent> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsSettings, setNeedsSettings] = useState(false);

  async function start(currentConsent: ReturnType<typeof createConsent>) {
    setStep('starting');
    setError(null);
    try {
      await startLiveTracking(participantId, currentConsent);
      haptics.success();
      onStarted();
    } catch (caught) {
      haptics.error();
      setStep('consent');
      setError(caught instanceof TrackingError ? START_ERROR_COPY[caught.reason] : 'No pudimos iniciar el seguimiento. Intenta otra vez.');
    }
  }

  async function onContinue() {
    const fresh = createConsent(participantId);
    setConsent(fresh);
    setError(null);
    setNeedsSettings(false);

    const { access, canAskAgain } = await getLocationAccess();
    if (access === 'background') return start(fresh);

    if (access !== 'foreground') {
      if (access === 'denied' && !canAskAgain) {
        setNeedsSettings(true);
        setError('El permiso de ubicación está desactivado para Finisher Legacy.');
        return;
      }
      const granted = await requestForegroundAccess();
      if (!granted) {
        setError('Sin permiso de ubicación no podemos compartir tu recorrido. Puedes activarlo en Ajustes.');
        setNeedsSettings(true);
        return;
      }
    }
    // Android keeps tracking through a visible foreground-service
    // notification with the while-in-use grant — no "all the time" ask
    // (and no Play background-location declaration). iOS needs "Always"
    // to keep going reliably with the screen locked.
    if (Platform.OS === 'android') return start(fresh);
    setStep('background');
  }

  if (step === 'background' && consent) {
    return (
      <Animated.View entering={FadeIn.duration(220)} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.goldWash }}>
            <MapPin size={28} color={colors.gold} />
          </View>
          <AppText variant="title" accessibilityRole="header">
            ¿Seguimos con la pantalla apagada?
          </AppText>
          <AppText variant="body" tone="muted">
            Para que tu gente te vea avanzar aunque guardes el teléfono, elige{' '}
            <AppText variant="bodyStrong">“Permitir siempre”</AppText> (o “Permitir todo el tiempo”) en el siguiente aviso.
          </AppText>
          <AppText variant="body" tone="muted">
            Solo se usa mientras tu seguimiento esté activo. Verás un aviso permanente en tu teléfono mientras compartes tu ubicación.
          </AppText>
        </ScrollView>
        <StickyFooter>
          <AppButton
            label="Permitir en segundo plano"
            onPress={async () => {
              await requestBackgroundAccess();
              await start(consent);
            }}
          />
          <AppButton label="Ahora no, iniciar así" variant="ghost" onPress={() => start(consent)} />
        </StickyFooter>
      </Animated.View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={{ padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xl }}>
        <Animated.View entering={FadeInDown.duration(320)} style={{ gap: spacing.xs }}>
          <AppText variant="label" tone="gold">
            SEGUIMIENTO EN VIVO
          </AppText>
          <AppText variant="title" accessibilityRole="header">
            Tu gente también corre contigo
          </AppText>
          <AppText variant="body" tone="muted">
            {eventName ? `Durante ${eventName}, ` : 'Durante tu carrera, '}las personas que elijas podrán ver por dónde vas en tiempo real.
          </AppText>
        </Animated.View>

        <View style={{ gap: spacing.sm }}>
          <Point icon={Eye} title="Quién lo ve" body="Solo quien reciba tu enlace. No necesitan cuenta, y puedes revocar cada enlace cuando quieras." />
          <Point icon={MapPin} title="Qué se comparte" body="Tu ubicación, la distancia y la hora de tu último punto, solo mientras el seguimiento está activo." />
          <Point icon={BatteryLow} title="Batería" body="Usa GPS: puede gastar entre 5 % y 10 % de batería por hora. Sal con el teléfono cargado; el modo de ahorro puede pausarlo." />
          <Point icon={Hand} title="Tú decides" body="Lo detienes cuando quieras con el botón Detener. Si pierdes señal, guardamos tu recorrido y lo enviamos al reconectar." />
        </View>

        <Pressable
          onPress={() => {
            haptics.selection();
            setAccepted((value) => !value);
          }}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: accepted }}
          style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 56, padding: spacing.md, borderRadius: radius.lg, borderWidth: 1, borderColor: accepted ? colors.gold : colors.inputBorder, backgroundColor: accepted ? colors.goldWash : colors.input }}>
          <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: accepted ? colors.gold : colors.muted, backgroundColor: accepted ? colors.gold : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
            {accepted ? <Check size={15} color={colors.black} strokeWidth={3} /> : null}
          </View>
          <AppText style={{ flex: 1, fontFamily: fontFamily.medium, fontSize: 15 }}>Entiendo y quiero compartir mi ubicación durante esta carrera.</AppText>
        </Pressable>

        <View style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' }}>
          <ShieldCheck size={16} color={colors.success} />
          <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
            Nunca activamos tu GPS sin que lo inicies aquí.
          </AppText>
        </View>
      </ScrollView>

      <StickyFooter>
        <InlineError message={error} />
        {needsSettings ? <AppButton label="Abrir Ajustes" variant="secondary" onPress={() => Linking.openSettings().catch(() => {})} /> : null}
        <AppButton label="Iniciar seguimiento" icon={MapPin} disabled={!accepted} loading={step === 'starting'} onPress={onContinue} />
      </StickyFooter>
    </View>
  );
}

function Point({ icon: Icon, title, body }: { icon: LucideIcon; title: string; body: string }) {
  return (
    <View style={{ flexDirection: 'row', gap: spacing.sm, padding: spacing.md, borderRadius: radius.lg, backgroundColor: colors.graphite }}>
      <View style={{ width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.goldWash }}>
        <Icon size={18} color={colors.gold} />
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <AppText style={{ fontFamily: fontFamily.semibold, fontSize: 15 }}>{title}</AppText>
        <AppText variant="caption" tone="muted">
          {body}
        </AppText>
      </View>
    </View>
  );
}
