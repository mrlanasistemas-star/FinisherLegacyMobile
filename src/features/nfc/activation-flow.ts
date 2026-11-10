import { t, type Translate } from '@/i18n';
import type { ActivationConfirm, ActivationStart, PendingActivation } from '@/schemas/activation';

import type { ActivationOutcome, ForeignSummary, SessionProgress } from './activation-session';
import type { ActivationFailure } from './nfc-errors';
import { formatActivationCode, isCompleteActivationCode, normalizeActivationCode } from './url-policy';

/**
 * Screen-level state of the "Activar mi Finisher Legacy" wizard — pure
 * reducer, unit-tested. The NFC session itself lives in
 * `activation-session.ts`; this only decides which step is on screen.
 *
 * Steps (stepper): 1 Cuenta · 2 Código · 3 Acercar · 4 Activar · 5 Listo
 */

export type WizardStep = 'account' | 'code' | 'approach' | 'session' | 'consent' | 'already' | 'confirm_retry' | 'error' | 'done';

export interface WizardState {
  step: WizardStep;
  /** Formatted for display: `XXXX-XXXX-XXXX`. */
  code: string;
  codeError: string | null;
  progress: SessionProgress;
  consent: { uid: string | null; summary: ForeignSummary } | null;
  /** Set once the person accepted overwriting a specific chip. */
  overwriteConsent: { uid: string | null } | null;
  failure: ActivationFailure | null;
  already: ActivationStart | null;
  existingTagCode: string | null;
  pending: PendingActivation | null;
  result: ActivationConfirm | null;
}

export type WizardAction =
  | { type: 'auth_changed'; authenticated: boolean }
  | { type: 'code_changed'; value: string }
  | { type: 'code_submitted' }
  | { type: 'session_started' }
  | { type: 'progress'; progress: SessionProgress }
  | { type: 'outcome'; outcome: ActivationOutcome }
  | { type: 'consent_accepted' }
  | { type: 'consent_declined' }
  | { type: 'retry' }
  | { type: 'edit_code' }
  | { type: 'back' }
  | { type: 'confirm_retry_started' }
  | { type: 'recovered_pending'; pending: PendingActivation };

/** Stepper labels, built with the component's translator (`useI18n()`) so they follow the app language. */
export function stepperLabels(t: Translate): readonly string[] {
  return [t('Cuenta'), t('Código'), t('Acercar'), t('Activar'), t('Listo')];
}

export function stepperIndex(step: WizardStep): number {
  switch (step) {
    case 'account':
      return 0;
    case 'code':
      return 1;
    case 'approach':
      return 2;
    case 'done':
      return 4;
    default:
      return 3;
  }
}

export function initialWizardState(authenticated: boolean, initialCode = ''): WizardState {
  return {
    step: authenticated ? 'code' : 'account',
    code: formatActivationCode(initialCode),
    codeError: null,
    progress: 'waiting',
    consent: null,
    overwriteConsent: null,
    failure: null,
    already: null,
    existingTagCode: null,
    pending: null,
    result: null,
  };
}

export function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case 'auth_changed':
      if (!action.authenticated) return { ...initialWizardState(false), code: state.code };
      return state.step === 'account' ? { ...state, step: 'code' } : state;

    case 'code_changed':
      return { ...state, code: formatActivationCode(action.value), codeError: null };

    case 'code_submitted':
      if (!isCompleteActivationCode(state.code)) {
        return { ...state, codeError: t('Escribe los 12 caracteres de tu tarjeta de activación.') };
      }
      return { ...state, step: 'approach', codeError: null, overwriteConsent: null };

    case 'session_started':
      if (state.step !== 'approach' && state.step !== 'error' && state.step !== 'consent') return state;
      return { ...state, step: 'session', progress: 'waiting', failure: null };

    case 'progress':
      return state.step === 'session' ? { ...state, progress: action.progress } : state;

    case 'outcome':
      return applyOutcome(state, action.outcome);

    case 'consent_accepted':
      if (!state.consent) return state;
      return { ...state, step: 'approach', overwriteConsent: { uid: state.consent.uid }, consent: null };

    case 'consent_declined':
      return { ...state, step: 'approach', consent: null, overwriteConsent: null };

    case 'retry':
      return { ...state, step: 'approach', failure: null };

    case 'edit_code':
      return { ...state, step: 'code', failure: null, overwriteConsent: null };

    case 'back':
      if (state.step === 'approach' || state.step === 'error' || state.step === 'consent') return { ...state, step: 'code', failure: null };
      return state;

    case 'confirm_retry_started':
      return state.step === 'confirm_retry' ? { ...state, step: 'session', progress: 'confirming' } : state;

    case 'recovered_pending':
      return { ...state, step: 'confirm_retry', pending: action.pending };

    default:
      return state;
  }
}

function applyOutcome(state: WizardState, outcome: ActivationOutcome): WizardState {
  switch (outcome.type) {
    case 'activated':
      return { ...state, step: 'done', result: outcome.result, pending: null, failure: null };
    case 'needs_overwrite_consent':
      return { ...state, step: 'consent', consent: { uid: outcome.uid, summary: outcome.summary } };
    case 'already_activated':
      return { ...state, step: 'already', already: outcome.start };
    case 'existing_fl_tag':
      return { ...state, step: 'already', existingTagCode: outcome.tagCode };
    case 'written_unconfirmed':
      return { ...state, step: 'confirm_retry', pending: outcome.pending, failure: outcome.failure };
    case 'failed':
      return { ...state, step: 'error', failure: outcome.failure };
  }
}

/** The raw 12-char code sent to the backend. */
export function activationCodeForApi(state: WizardState): string {
  return normalizeActivationCode(state.code);
}
