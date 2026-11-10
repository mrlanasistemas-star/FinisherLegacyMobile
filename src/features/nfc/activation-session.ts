import { AppError } from '@/api/errors';
import type { ActivationConfirm, ActivationStart, PendingActivation } from '@/schemas/activation';

import { describeContent, encodeUriMessage, type ForeignContentKind } from './ndef';
import { classifyNfcError, failureReason, NfcFlowError, type ActivationFailure } from './nfc-errors';
import type { NfcDriver, TagSnapshot } from './nfc-driver';
import { uidsDiffer } from './nfc-uid';
import { isStalePending, type PendingActivationStore } from './pending-activation';
import { extractFlTagCode, isAllowedWriteUrl, normalizeTagCode, sameUrl, type WebOrigin } from './url-policy';

/**
 * The activation state machine, end to end, in one NFC session:
 *
 *   detect → inspect (NDEF? writable? data? already ours?)
 *     → authorize (`start`) → validate `write_url` → persist pending
 *     → write → read back & verify → close session → `confirm`
 *
 * Exits early (closing the session first) when the chip has someone
 * else's data and the person hasn't consented to overwriting it, when it
 * is already a Finisher Legacy chip for another tag, or on any failure.
 * Pure orchestration over injected dependencies — no React, no native
 * imports — so every branch is unit-tested with a fake driver.
 */

export type SessionProgress = 'waiting' | 'detected' | 'authorizing' | 'writing' | 'verifying' | 'confirming';

export interface ActivationApi {
  start(input: { activation_code?: string; tag_code?: string; nfc_uid?: string; platform: 'android' | 'ios' }): Promise<ActivationStart>;
  confirm(intentId: string, input: { nfc_uid?: string; written_url: string }): Promise<ActivationConfirm>;
  fail(intentId: string, reason: string): Promise<void>;
}

export interface ActivationDeps {
  driver: NfcDriver;
  api: ActivationApi;
  pending: PendingActivationStore;
  origin: WebOrigin;
  userId: number | string | null;
  onProgress?: (progress: SessionProgress) => void;
  now?: () => Date;
}

export interface OverwriteConsent {
  /** UID of the chip the person agreed to overwrite (null when the platform hides it). */
  uid: string | null;
}

export interface ActivationRequest {
  activationCode: string;
  overwriteConsent?: OverwriteConsent | null;
}

export interface ForeignSummary {
  kind: ForeignContentKind;
  host: string | null;
}

export type ActivationOutcome =
  | { type: 'activated'; result: ActivationConfirm }
  | { type: 'needs_overwrite_consent'; uid: string | null; summary: ForeignSummary }
  | { type: 'already_activated'; start: ActivationStart }
  /** Chip already carries a Finisher Legacy URL that isn't part of this activation — open it instead. */
  | { type: 'existing_fl_tag'; tagCode: string }
  /** Written and verified, but `confirm` didn't reach the backend. Pending is kept; retry with `confirmPending`. */
  | { type: 'written_unconfirmed'; pending: PendingActivation; failure: ActivationFailure }
  | { type: 'failed'; failure: ActivationFailure };

/** Copy shown in the iOS system sheet (Android shows our own UI). */
export const IOS_MESSAGES = {
  approach: 'Acerca la parte superior de tu iPhone a tu Finisher Legacy.',
  detected: 'Finisher Legacy detectado. No lo muevas…',
  authorizing: 'Autorizando tu Finisher Legacy…',
  writing: 'Escribiendo… mantén tu iPhone quieto.',
  verifying: 'Verificando…',
  done: 'Listo. Tu Finisher Legacy quedó escrito.',
  existing: 'Este Finisher Legacy ya tiene su enlace.',
  read: 'Listo.',
} as const;

const FAIL_SHEET_MESSAGE: Partial<Record<ActivationFailure['kind'], string>> = {
  read_only: 'Este chip está bloqueado contra escritura.',
  not_ndef: 'Este chip no es compatible.',
  too_small: 'Este chip no tiene espacio suficiente.',
  tag_changed: 'Este no es el mismo chip.',
  different_fl_tag: 'Este chip ya pertenece a otro Finisher Legacy.',
  verify_failed: 'No pudimos verificar la escritura.',
};

function appErrorToFailure(error: unknown): ActivationFailure {
  if (error instanceof AppError) {
    switch (error.kind) {
      case 'network':
      case 'timeout':
        return { kind: 'network' };
      case 'rate_limited':
        return { kind: 'rate_limited' };
      case 'unauthenticated':
        return { kind: 'unauthenticated' };
      case 'business_rule':
      case 'validation':
      case 'conflict':
      case 'forbidden':
      case 'not_found':
        return { kind: 'api', code: error.code, message: error.message };
      default:
        return { kind: 'api', code: error.code, message: error.message };
    }
  }
  return { kind: 'unknown' };
}

/** Recoverable confirm failures keep the pending intent; a definitive backend "no" drops it. */
function isTransient(failure: ActivationFailure): boolean {
  return failure.kind === 'network' || failure.kind === 'rate_limited' || (failure.kind === 'api' && !failure.code);
}

let busy = false;

/** True while a session runs — the UI also disables its buttons, this guards double taps that slip through. */
export function isActivationBusy(): boolean {
  return busy;
}

async function preflight(driver: NfcDriver): Promise<ActivationFailure | null> {
  if (!driver.isAvailable()) return { kind: 'module_unavailable' };
  if (!(await driver.isSupported())) return { kind: 'unsupported' };
  if (!(await driver.isEnabled())) return { kind: 'disabled' };
  return null;
}

export async function checkNfcReadiness(driver: NfcDriver): Promise<ActivationFailure | null> {
  return preflight(driver);
}

async function confirmWith(deps: ActivationDeps, pending: PendingActivation): Promise<ActivationOutcome> {
  deps.onProgress?.('confirming');
  try {
    const result = await deps.api.confirm(pending.intent_id, {
      nfc_uid: pending.nfc_uid ?? undefined,
      written_url: pending.write_url,
    });
    await deps.pending.clear();
    return { type: 'activated', result };
  } catch (error) {
    const failure = appErrorToFailure(error);
    if (isTransient(failure)) return { type: 'written_unconfirmed', pending, failure };
    await deps.pending.clear();
    return { type: 'failed', failure };
  }
}

/** Retry `confirm` for the stored intent (after a network failure, or on next launch). */
export async function confirmPending(deps: ActivationDeps): Promise<ActivationOutcome | null> {
  const pending = await deps.pending.load();
  if (!pending || pending.phase !== 'written') return null;
  if (deps.userId !== null && pending.user_id !== null && String(pending.user_id) !== String(deps.userId)) return null;
  return confirmWith(deps, pending);
}

/** Drops an `authorized` intent past its expiry (nothing to recover). */
export async function pruneStalePending(deps: Pick<ActivationDeps, 'pending' | 'now'>): Promise<void> {
  const pending = await deps.pending.load();
  if (pending && isStalePending(pending, deps.now?.() ?? new Date())) await deps.pending.clear();
}

export async function runActivation(deps: ActivationDeps, request: ActivationRequest): Promise<ActivationOutcome> {
  if (busy) return { type: 'failed', failure: { kind: 'busy' } };
  busy = true;

  const { driver, api, origin } = deps;
  const progress = (p: SessionProgress) => deps.onProgress?.(p);
  let sessionOpen = false;
  let intentToFail: string | null = null;
  let writeAttempted = false;

  const closeSession = async (result?: { success?: string; error?: string }) => {
    if (!sessionOpen) return;
    sessionOpen = false;
    await driver.endSession(result);
  };

  try {
    const notReady = await preflight(driver);
    if (notReady) return { type: 'failed', failure: notReady };

    progress('waiting');
    sessionOpen = true;
    await driver.beginSession(IOS_MESSAGES.approach);

    // ── Detect & inspect ──────────────────────────────────────────────
    const snapshot: TagSnapshot = await driver.inspect();
    progress('detected');
    await driver.setMessage(IOS_MESSAGES.detected);

    if (snapshot.ndef === 'read_only') throw new NfcFlowError({ kind: 'read_only' });
    if (snapshot.ndef === 'unsupported') throw new NfcFlowError({ kind: 'not_ndef' });

    const content = describeContent(snapshot.records, (uri) => extractFlTagCode(uri, origin) !== null);
    const flUrls = content.uris.filter((uri) => extractFlTagCode(uri, origin) !== null);
    const flCode = flUrls.length > 0 ? extractFlTagCode(flUrls[0], origin) : null;

    // Recovery: this chip already carries the URL of our own unconfirmed intent.
    const stored = await deps.pending.load();
    if (stored && flUrls.some((uri) => sameUrl(uri, stored.write_url)) && !uidsDiffer(stored.nfc_uid, snapshot.uid)) {
      const pending: PendingActivation = { ...stored, phase: 'written', nfc_uid: stored.nfc_uid ?? snapshot.uid };
      await deps.pending.save(pending);
      await closeSession({ success: IOS_MESSAGES.done });
      return await confirmWith(deps, pending);
    }

    if (content.foreignKind !== null && !flCode) {
      const consented = request.overwriteConsent && !uidsDiffer(request.overwriteConsent.uid, snapshot.uid);
      if (!consented) {
        await closeSession({ success: IOS_MESSAGES.read });
        return { type: 'needs_overwrite_consent', uid: snapshot.uid, summary: { kind: content.foreignKind, host: content.foreignHost } };
      }
    }

    // ── Authorize ─────────────────────────────────────────────────────
    progress('authorizing');
    await driver.setMessage(IOS_MESSAGES.authorizing);
    let start: ActivationStart;
    try {
      start = await api.start({
        activation_code: request.activationCode,
        tag_code: flCode ?? undefined,
        nfc_uid: snapshot.uid ?? undefined,
        platform: driver.platform,
      });
    } catch (error) {
      const failure = appErrorToFailure(error);
      // A chip that already has a FL URL and whose activation the backend refuses is still a real tag — show it.
      if (flCode && failure.kind === 'api' && failure.code === 'TAG_ALREADY_ACTIVATED') {
        await closeSession({ success: IOS_MESSAGES.existing });
        return { type: 'existing_fl_tag', tagCode: flCode };
      }
      throw new NfcFlowError(failure);
    }

    if (start.status === 'already_activated') {
      await closeSession({ success: IOS_MESSAGES.existing });
      return { type: 'already_activated', start };
    }

    if (!start.intent_id || !start.write_url || !start.expires_at) {
      throw new NfcFlowError({ kind: 'unsafe_url' });
    }
    intentToFail = start.intent_id;

    if (!isAllowedWriteUrl(start.write_url, start.tag_code, origin)) {
      throw new NfcFlowError({ kind: 'unsafe_url' });
    }
    if (flCode && flCode !== normalizeTagCode(start.tag_code)) {
      // Never replace one Finisher Legacy chip's URL with another's.
      throw new NfcFlowError({ kind: 'different_fl_tag' });
    }

    const writeUrl = start.write_url;
    const pending: PendingActivation = {
      version: 1,
      user_id: deps.userId,
      intent_id: start.intent_id,
      tag_code: start.tag_code,
      write_url: writeUrl,
      expires_at: start.expires_at,
      nfc_uid: snapshot.uid,
      phase: 'authorized',
      saved_at: (deps.now?.() ?? new Date()).toISOString(),
    };
    await deps.pending.save(pending);

    // ── Write ─────────────────────────────────────────────────────────
    const alreadyWritten = content.uris.length === 1 && content.otherRecords === 0 && sameUrl(content.uris[0], writeUrl);
    if (!alreadyWritten) {
      const bytes = encodeUriMessage(writeUrl);
      if (snapshot.capacity !== null && bytes.length > snapshot.capacity) throw new NfcFlowError({ kind: 'too_small' });
      progress('writing');
      await driver.setMessage(IOS_MESSAGES.writing);
      writeAttempted = true;
      await driver.write(bytes, snapshot.ndef === 'formatable' ? 'format' : 'ndef');
    }

    // ── Verify ────────────────────────────────────────────────────────
    progress('verifying');
    await driver.setMessage(IOS_MESSAGES.verifying);
    const readBack = describeContent(await driver.readRecords(), () => true);
    if (!(readBack.uris.length === 1 && readBack.otherRecords === 0 && sameUrl(readBack.uris[0], writeUrl))) {
      throw new NfcFlowError({ kind: 'verify_failed' });
    }

    const written: PendingActivation = { ...pending, phase: 'written' };
    await deps.pending.save(written);
    intentToFail = null;
    await closeSession({ success: IOS_MESSAGES.done });

    // ── Confirm ───────────────────────────────────────────────────────
    return await confirmWith(deps, written);
  } catch (error) {
    const failure = classifyAny(error, driver);
    await closeSession({ error: FAIL_SHEET_MESSAGE[failure.kind] ?? (failure.kind === 'cancelled' ? undefined : 'No se completó. Intenta de nuevo.') });
    if (intentToFail) {
      // After an interrupted write the chip may already hold the URL: keep the
      // intent alive so the next tap recovers it (the "already carries our URL"
      // branch above). Anything definitive releases the intent on the backend.
      const mayHoldUrl = writeAttempted && ['tag_lost', 'timeout', 'cancelled', 'unknown'].includes(failure.kind);
      if (!mayHoldUrl) {
        await deps.pending.clear();
        await api.fail(intentToFail, failureReason(failure));
      }
    }
    return { type: 'failed', failure };
  } finally {
    if (sessionOpen) await closeSession();
    busy = false;
  }
}

function classifyAny(error: unknown, driver: NfcDriver): ActivationFailure {
  if (error instanceof NfcFlowError) return error.failure;
  if (error instanceof AppError) return appErrorToFailure(error);
  return classifyNfcError(error, driver.errorClasses());
}

// ── Read-only scan (the "Leer mi Finisher Legacy" entry) ────────────────────

export type ReadOutcome =
  | { type: 'read'; uris: string[]; blank: boolean; foreign: boolean }
  | { type: 'failed'; failure: ActivationFailure };

/** Reads a chip without writing anything. */
export async function readTagOnce(driver: NfcDriver): Promise<ReadOutcome> {
  if (busy) return { type: 'failed', failure: { kind: 'busy' } };
  busy = true;
  let open = false;
  try {
    const notReady = await preflight(driver);
    if (notReady) return { type: 'failed', failure: notReady };
    open = true;
    await driver.beginSession(IOS_MESSAGES.approach);
    const snapshot = await driver.inspect();
    const content = describeContent(snapshot.records, () => false);
    open = false;
    await driver.endSession({ success: IOS_MESSAGES.read });
    return { type: 'read', uris: content.uris, blank: content.blank, foreign: content.foreignKind !== null };
  } catch (error) {
    const failure = classifyAny(error, driver);
    if (open) {
      open = false;
      await driver.endSession({ error: failure.kind === 'cancelled' ? undefined : 'No pudimos leerlo. Intenta de nuevo.' });
    }
    return { type: 'failed', failure };
  } finally {
    if (open) await driver.endSession();
    busy = false;
  }
}
