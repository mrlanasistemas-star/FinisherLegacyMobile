import { router, useLocalSearchParams, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { ChevronLeft, KeyRound, ShieldAlert, Smartphone, X } from 'lucide-react-native';
import { useCallback, useEffect, useReducer, useRef, useState, type Dispatch } from 'react';
import { BackHandler, Keyboard, Platform, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import { AppText } from '@/components/app-text';
import { ActivationProgress } from '@/components/nfc/activation-progress';
import { ActivationShell } from '@/components/nfc/activation-shell';
import { StepButton } from '@/components/nfc/step-button';
import { TapIllustration, type TapPhase } from '@/components/nfc/tap-illustration';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { failureCopy, PROGRESS_COPY } from '@/features/nfc/activation-copy';
import { activationCodeForApi, initialWizardState, STEPPER_LABELS, stepperIndex, wizardReducer, type WizardAction, type WizardState } from '@/features/nfc/activation-flow';
import { isActivationBusy } from '@/features/nfc/activation-session';
import { nativeNfcDriver } from '@/features/nfc/nfc-driver';
import { securePendingActivationStore } from '@/features/nfc/pending-activation';
import { useActivationRunner, webOrigin } from '@/features/nfc/use-activation';
import { parseHttpUrl } from '@/features/nfc/url-policy';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import { colors, fontFamily, radius, spacing } from '@/theme/tokens';

const PLATFORM: 'ios' | 'android' = Platform.OS === 'ios' ? 'ios' : 'android';

/** Only our own web origin opens from this flow (story / edit links come from the backend). */
function isOwnWebUrl(url: string | null | undefined): url is string {
  if (!url) return false;
  const parsed = parseHttpUrl(url);
  return !!parsed && parsed.scheme === webOrigin.scheme && parsed.host.replace(/^www\./, '') === webOrigin.host.replace(/^www\./, '');
}

/**
 * "Activar mi Finisher Legacy" — writes the Tag's permanent URL into a
 * blank NTAG21x with the phone's own NFC (no third-party app). See
 * docs/NFC_ACTIVATION.md for the flow and the error matrix.
 */
export default function ActivateScreen() {
  const params = useLocalSearchParams<{ code?: string }>();
  const status = useAuthStore((s) => s.status);
  const authenticated = status === 'authenticated';
  const setPendingDeepLink = useUiStore((s) => s.setPendingDeepLink);

  const [state, dispatch] = useReducer(wizardReducer, undefined, () => initialWizardState(authenticated, params.code ?? ''));
  const [confirmOverwrite, setConfirmOverwrite] = useState(false);
  const { run, retryConfirm } = useActivationRunner((progress) => dispatch({ type: 'progress', progress }));
  const running = useRef(false);

  useEffect(() => {
    dispatch({ type: 'auth_changed', authenticated });
  }, [authenticated]);

  // Crash/network recovery: a chip written earlier but never confirmed.
  useEffect(() => {
    if (!authenticated) return;
    let alive = true;
    securePendingActivationStore.load().then((pending) => {
      if (alive && pending?.phase === 'written') dispatch({ type: 'recovered_pending', pending });
    });
    return () => {
      alive = false;
    };
  }, [authenticated]);

  // Success → its own screen (replace: no "back" into a finished write).
  useEffect(() => {
    if (state.step !== 'done' || !state.result) return;
    const { result } = state;
    const query = [
      ['tagCode', result.tag_code],
      ['storyUrl', result.story.url],
      ['editUrl', result.story.edit_url ?? ''],
    ]
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
    router.replace(`/activate/success?${query}` as Href);
  }, [state]);

  const startSession = useCallback(
    async (current: WizardState, consent: { uid: string | null } | null) => {
      if (running.current || isActivationBusy()) return;
      running.current = true;
      dispatch({ type: 'session_started' });
      try {
        const outcome = await run({ activationCode: activationCodeForApi(current), overwriteConsent: consent });
        dispatch({ type: 'outcome', outcome });
      } finally {
        running.current = false;
      }
    },
    [run],
  );

  const doRetryConfirm = useCallback(async () => {
    if (running.current) return;
    running.current = true;
    dispatch({ type: 'confirm_retry_started' });
    try {
      const outcome = await retryConfirm();
      if (outcome) dispatch({ type: 'outcome', outcome });
      else dispatch({ type: 'edit_code' });
    } finally {
      running.current = false;
    }
  }, [retryConfirm]);

  function close() {
    if (state.step === 'session') return;
    if (router.canGoBack()) router.back();
    else router.replace(authenticated ? '/' : '/welcome');
  }

  function goToAuth(screen: '/login' | '/register') {
    setPendingDeepLink('/activate');
    router.push(screen);
  }

  const backable = state.step === 'approach' || state.step === 'error' || state.step === 'consent';

  // Leaving the code step closes its keyboard; otherwise it lingers over the next
  // step (Acerca tu Finisher Legacy) and hides the content and the CTA.
  useEffect(() => {
    if (state.step !== 'code') Keyboard.dismiss();
  }, [state.step]);

  // Android back (button or edge gesture) mirrors the header: previous step
  // first, never yanking the user out mid-wizard or mid-write.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (state.step === 'session') return true;
      if (backable) {
        dispatch({ type: 'back' });
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [state.step, backable]);
  const leading =
    state.step === 'session'
      ? undefined
      : backable
        ? { icon: ChevronLeft, label: 'Volver', onPress: () => dispatch({ type: 'back' }) }
        : { icon: X, label: 'Cerrar', onPress: close };

  const tapPhase: TapPhase =
    state.step === 'session' ? (state.progress === 'waiting' ? 'searching' : 'working') : state.step === 'error' ? 'error' : 'idle';

  return (
    <>
      <ActivationShell
        stepKey={state.step}
        title="Activar mi Finisher Legacy"
        leading={leading}
        progress={<ActivationProgress labels={STEPPER_LABELS} index={stepperIndex(state.step)} />}
        footer={<Footer state={state} dispatch={dispatch} startSession={startSession} retryConfirm={doRetryConfirm} goToAuth={goToAuth} onOverwrite={() => setConfirmOverwrite(true)} />}>
        <StepBody state={state} dispatch={dispatch} tapPhase={tapPhase} onSubmitCode={() => dispatch({ type: 'code_submitted' })} />
      </ActivationShell>

      <ConfirmDialog
        visible={confirmOverwrite}
        title="¿Reemplazar lo que tiene este chip?"
        description={overwriteDescription(state)}
        confirmLabel="Reemplazar y activar"
        onCancel={() => setConfirmOverwrite(false)}
        onConfirm={() => {
          setConfirmOverwrite(false);
          const consent = state.consent ? { uid: state.consent.uid } : null;
          dispatch({ type: 'consent_accepted' });
          startSession(state, consent);
        }}
      />
    </>
  );
}

function overwriteDescription(state: WizardState): string {
  const summary = state.consent?.summary;
  const what =
    summary?.kind === 'link'
      ? `un enlace${summary.host ? ` a ${summary.host}` : ''}`
      : summary?.kind === 'text'
        ? 'un texto'
        : 'datos de otra aplicación';
  return `Este chip tiene ${what}. Se borrará y quedará solo el enlace permanente de tu Finisher Legacy. No se puede deshacer.`;
}

// ── Bodies ──────────────────────────────────────────────────────────────────

function Eyebrow({ children }: { children: string }) {
  return (
    <AppText variant="label" style={{ color: colors.accent, letterSpacing: 2 }}>
      {children}
    </AppText>
  );
}

function Heading({ title, body }: { title: string; body?: string }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <AppText variant="title" accessibilityRole="header">
        {title}
      </AppText>
      {body ? (
        <AppText variant="body" tone="muted">
          {body}
        </AppText>
      ) : null}
    </View>
  );
}

function StepBody({
  state,
  dispatch,
  tapPhase,
  onSubmitCode,
}: {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
  tapPhase: TapPhase;
  onSubmitCode: () => void;
}) {
  switch (state.step) {
    case 'account':
      return (
        <>
          <Heading
            title="Tu Finisher Legacy, a tu nombre"
            body="Inicia sesión o crea tu cuenta. Tu Finisher Legacy quedará conectado a tu historia y solo tú podrás editarla."
          />
          <View style={{ alignItems: 'center', paddingVertical: spacing.md }}>
            <TapIllustration phase="idle" platform={PLATFORM} size={180} />
          </View>
        </>
      );

    case 'code':
      return <CodeStep state={state} dispatch={dispatch} onSubmit={onSubmitCode} />;

    case 'approach':
      return (
        <>
          <Heading title="Acerca tu Finisher Legacy" body={PLATFORM === 'ios' ? 'Cuando aparezca el aviso, acerca el tag a la parte superior de tu iPhone.' : 'Acerca el tag al centro de la parte trasera de tu teléfono.'} />
          <View style={{ alignItems: 'center' }}>
            <TapIllustration phase="idle" platform={PLATFORM} />
          </View>
          <Tips />
        </>
      );

    case 'session': {
      const copy = PROGRESS_COPY[state.progress];
      return (
        <View style={{ alignItems: 'center', gap: spacing.md }}>
          <TapIllustration phase={tapPhase} platform={PLATFORM} />
          <Animated.View key={state.progress} entering={FadeIn.duration(180)} exiting={FadeOut.duration(120)} style={{ alignItems: 'center', gap: spacing.xxs }} accessibilityLiveRegion="polite">
            <AppText variant="subtitle" align="center">
              {copy.title}
            </AppText>
            <AppText variant="body" tone="muted" align="center">
              {copy.body}
            </AppText>
          </Animated.View>
        </View>
      );
    }

    case 'consent':
      return (
        <>
          <View style={[styles.iconBadge, { backgroundColor: colors.goldWash }]}>
            <ShieldAlert size={22} color={colors.accent} strokeWidth={1.8} />
          </View>
          <Heading title="Este chip ya tiene información" body={overwriteDescription(state)} />
          <AppText variant="caption" tone="muted">
            Si no es tu Finisher Legacy, no lo reemplaces: vuelve y acerca el tag que venía en tu empaque.
          </AppText>
        </>
      );

    case 'already': {
      const product = state.already?.product;
      return (
        <>
          <Eyebrow>YA ACTIVADO</Eyebrow>
          <Heading
            title={state.existingTagCode ? 'Este Finisher Legacy ya tiene su enlace' : 'Tu Finisher Legacy ya está activado'}
            body={
              state.existingTagCode
                ? 'Este chip ya pertenece a un Finisher Legacy. Ábrelo para ver su historia.'
                : `${product?.name ?? 'Este Finisher Legacy'} ya está conectado a una historia.`
            }
          />
        </>
      );
    }

    case 'confirm_retry':
      return (
        <>
          <Eyebrow>CASI LISTO</Eyebrow>
          <Heading title="Tu Finisher Legacy ya quedó escrito" body="Solo falta guardar la activación. Revisa tu conexión y toca Reintentar; no necesitas volver a acercarlo." />
        </>
      );

    case 'error': {
      const copy = failureCopy(state.failure ?? { kind: 'unknown' });
      return (
        <>
          <View style={[styles.iconBadge, { backgroundColor: colors.destructiveWash }]}>
            <Smartphone size={22} color={colors.destructive} strokeWidth={1.8} />
          </View>
          <Heading title={copy.title} body={copy.body} />
        </>
      );
    }

    case 'done':
      return (
        <View style={{ alignItems: 'center' }}>
          <TapIllustration phase="done" platform={PLATFORM} />
        </View>
      );
  }
}

function Tips() {
  const tips =
    PLATFORM === 'ios'
      ? ['Quita fundas metálicas o con imán.', 'Mantén el tag quieto hasta sentir la vibración.', 'La primera vez puede tardar unos segundos.']
      : ['Verifica que el NFC esté encendido.', 'Quita fundas metálicas o con imán.', 'Mantén el tag quieto hasta sentir la vibración.'];
  return (
    <View style={{ gap: spacing.xs }}>
      {tips.map((tip) => (
        <View key={tip} style={{ flexDirection: 'row', gap: spacing.xs, alignItems: 'flex-start' }}>
          <View style={styles.dot} />
          <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
            {tip}
          </AppText>
        </View>
      ))}
    </View>
  );
}

function CodeStep({ state, dispatch, onSubmit }: { state: WizardState; dispatch: Dispatch<WizardAction>; onSubmit: () => void }) {
  const [focused, setFocused] = useState(false);
  return (
    <>
      <Heading title="Tu código de activación" body="Está en la tarjeta que viene dentro del empaque de tu Finisher Legacy." />
      <View style={{ gap: spacing.xs }}>
        <View style={[styles.codeField, focused && { borderColor: colors.gold }, state.codeError ? { borderColor: colors.destructive } : null]}>
          <KeyRound size={18} color={colors.accent} strokeWidth={1.8} />
          <TextInput
            value={state.code}
            onChangeText={(value) => dispatch({ type: 'code_changed', value })}
            placeholder="XXXX-XXXX-XXXX"
            placeholderTextColor={colors.subtle}
            autoCapitalize="characters"
            autoCorrect={false}
            autoComplete="off"
            spellCheck={false}
            keyboardType={Platform.OS === 'ios' ? 'ascii-capable' : 'visible-password'}
            returnKeyType="go"
            maxLength={14}
            autoFocus
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            onSubmitEditing={onSubmit}
            accessibilityLabel="Código de activación, 12 caracteres"
            style={styles.codeInput}
          />
        </View>
        {state.codeError ? (
          <AppText variant="caption" tone="destructive" accessibilityLiveRegion="polite">
            {state.codeError}
          </AppText>
        ) : (
          <AppText variant="caption" tone="muted">
            12 caracteres. Los guiones se agregan solos.
          </AppText>
        )}
      </View>
    </>
  );
}

// ── Footer CTAs ─────────────────────────────────────────────────────────────

function Footer({
  state,
  dispatch,
  startSession,
  retryConfirm,
  goToAuth,
  onOverwrite,
}: {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
  startSession: (state: WizardState, consent: { uid: string | null } | null) => void;
  retryConfirm: () => void;
  goToAuth: (screen: '/login' | '/register') => void;
  onOverwrite: () => void;
}) {
  switch (state.step) {
    case 'account':
      return (
        <>
          <StepButton label="Iniciar sesión" onPress={() => goToAuth('/login')} />
          <StepButton label="Crear cuenta" variant="secondary" onPress={() => goToAuth('/register')} />
        </>
      );
    case 'code':
      return <StepButton label="Continuar" onPress={() => dispatch({ type: 'code_submitted' })} disabled={state.code.replace(/-/g, '').length < 12} />;
    case 'approach':
      return <StepButton label="Estoy listo" accessibilityHint="Activa el lector NFC del teléfono" onPress={() => startSession(state, state.overwriteConsent)} />;
    case 'session':
      return PLATFORM === 'android' && state.progress === 'waiting' ? (
        <StepButton label="Cancelar" variant="plain" onPress={() => nativeNfcDriver().endSession()} />
      ) : null;
    case 'consent':
      return (
        <>
          <StepButton label="Reemplazar y activar" onPress={onOverwrite} />
          <StepButton label="No, usar otro chip" variant="plain" onPress={() => dispatch({ type: 'consent_declined' })} />
        </>
      );
    case 'already':
      return state.existingTagCode ? (
        <StepButton label="Ver este Finisher Legacy" onPress={() => router.replace(`/nfc/t/${state.existingTagCode}` as Href)} />
      ) : (
        <>
          {isOwnWebUrl(state.already?.story?.url) ? <StepButton label="Ver historia" onPress={() => WebBrowser.openBrowserAsync(state.already!.story!.url)} /> : null}
          <StepButton label="Ir a mi Legacy" variant="secondary" onPress={() => router.replace('/legacy')} />
        </>
      );
    case 'confirm_retry':
      return <StepButton label="Reintentar" onPress={retryConfirm} />;
    case 'error': {
      const copy = failureCopy(state.failure ?? { kind: 'unknown' });
      return (
        <>
          {copy.action === 'retry' ? <StepButton label="Intentar de nuevo" onPress={() => dispatch({ type: 'retry' })} /> : null}
          {copy.action === 'settings' ? <StepButton label="Abrir ajustes de NFC" onPress={() => nativeNfcDriver().openSettings()} /> : null}
          {copy.action === 'settings' ? <StepButton label="Ya lo encendí" variant="secondary" onPress={() => dispatch({ type: 'retry' })} /> : null}
          {copy.action === 'edit_code' ? <StepButton label="Corregir código" onPress={() => dispatch({ type: 'edit_code' })} /> : null}
          {copy.action === 'login' ? <StepButton label="Iniciar sesión" onPress={() => goToAuth('/login')} /> : null}
          {copy.action === 'none' ? <StepButton label="Volver" variant="secondary" onPress={() => dispatch({ type: 'edit_code' })} /> : null}
        </>
      );
    }
    default:
      return null;
  }
}

const styles = StyleSheet.create({
  iconBadge: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.gold, marginTop: 8 },
  codeField: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.inputBorder,
    backgroundColor: colors.input,
  },
  codeInput: {
    flex: 1,
    minHeight: 50,
    fontFamily: fontFamily.semibold,
    fontSize: 20,
    letterSpacing: 2.5,
    color: colors.foreground,
    paddingVertical: 0,
  },
});
