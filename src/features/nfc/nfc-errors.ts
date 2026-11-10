/**
 * Every way an activation can stop, as one closed set — the UI maps each
 * to calm Spanish copy and a next step; nothing raw (no "IOException",
 * no "UID") ever reaches a person. Pure, unit-tested.
 */

export type ActivationFailureKind =
  /** The native module isn't in this build (Expo Go / an old dev build / web). */
  | 'module_unavailable'
  /** The phone has no NFC reader. */
  | 'unsupported'
  /** NFC is switched off (Android). */
  | 'disabled'
  | 'cancelled'
  | 'timeout'
  /** The chip moved away mid-operation. */
  | 'tag_lost'
  /** Another NFC session is already running (double tap). */
  | 'busy'
  | 'read_only'
  /** Not an NDEF chip and cannot be formatted as one. */
  | 'not_ndef'
  | 'too_small'
  /** Written, but reading it back did not return exactly our URL. */
  | 'verify_failed'
  /** Second tap was a different chip than the one we inspected. */
  | 'tag_changed'
  /** The chip already carries a different Finisher Legacy Tag. */
  | 'different_fl_tag'
  /** The backend handed us a URL that fails `isAllowedWriteUrl` — never written. */
  | 'unsafe_url'
  /** Backend rejected the activation (see `code`). */
  | 'api'
  | 'network'
  | 'rate_limited'
  | 'unauthenticated'
  | 'unknown';

export interface ActivationFailure {
  kind: ActivationFailureKind;
  /** Backend error code when `kind === 'api'` (ACTIVATION_CODE_INVALID…). */
  code?: string;
  /** Backend message, shown only for `api` failures. */
  message?: string;
}

/** Error classes exported by `react-native-nfc-manager` (`NfcError` namespace), injected so this stays testable. */
export interface NfcErrorClasses {
  UserCancel?: abstract new (...args: never[]) => Error;
  Timeout?: abstract new (...args: never[]) => Error;
  TagConnectionLost?: abstract new (...args: never[]) => Error;
  TagNotConnected?: abstract new (...args: never[]) => Error;
  RetryExceeded?: abstract new (...args: never[]) => Error;
  TagResponseError?: abstract new (...args: never[]) => Error;
  SessionInvalidated?: abstract new (...args: never[]) => Error;
  SystemBusy?: abstract new (...args: never[]) => Error;
  UnsupportedFeature?: abstract new (...args: never[]) => Error;
  RadioDisabled?: abstract new (...args: never[]) => Error;
  TagNotWritable?: abstract new (...args: never[]) => Error;
  TagSizeTooSmall?: abstract new (...args: never[]) => Error;
  TagUpdateFailure?: abstract new (...args: never[]) => Error;
  FirstNdefInvalid?: abstract new (...args: never[]) => Error;
  SecurityViolation?: abstract new (...args: never[]) => Error;
}

type Rule = [keyof NfcErrorClasses, ActivationFailureKind];

const CLASS_RULES: Rule[] = [
  ['UserCancel', 'cancelled'],
  ['Timeout', 'timeout'],
  // iOS invalidates the session itself after ~60 s or when the app backgrounds.
  ['SessionInvalidated', 'timeout'],
  ['TagConnectionLost', 'tag_lost'],
  ['TagNotConnected', 'tag_lost'],
  ['RetryExceeded', 'tag_lost'],
  ['TagResponseError', 'tag_lost'],
  ['TagUpdateFailure', 'tag_lost'],
  ['SystemBusy', 'busy'],
  ['UnsupportedFeature', 'unsupported'],
  ['RadioDisabled', 'disabled'],
  ['TagNotWritable', 'read_only'],
  ['TagSizeTooSmall', 'too_small'],
  ['FirstNdefInvalid', 'not_ndef'],
  ['SecurityViolation', 'unknown'],
];

/** Android rejects with `exception.toString()` / fixed strings (NfcErrorCodes.java, NdefHandler.java). */
const MESSAGE_RULES: [RegExp, ActivationFailureKind][] = [
  [/^cancelled$/i, 'cancelled'],
  [/TagLostException|tag was lost|tag is out of date/i, 'tag_lost'],
  [/java\.io\.IOException|transceive fail|no tech request available|no reference available/i, 'tag_lost'],
  [/one request at a time|Duplicated registration/i, 'busy'],
  [/tag is not writeable|not writable|read.?only/i, 'read_only'],
  [/tag size is not enough|too small|exceeds/i, 'too_small'],
  [/FormatException|unsupported tag api|No ndef available|not ndef/i, 'not_ndef'],
  [/no nfc support|Not support in this device/i, 'unsupported'],
  [/timeout|timed out/i, 'timeout'],
];

export class NfcFlowError extends Error {
  readonly failure: ActivationFailure;
  constructor(failure: ActivationFailure) {
    super(failure.kind);
    this.failure = failure;
  }
}

export function classifyNfcError(error: unknown, classes: NfcErrorClasses | null): ActivationFailure {
  if (error instanceof NfcFlowError) return error.failure;

  if (classes && error instanceof Error) {
    for (const [name, kind] of CLASS_RULES) {
      const Klass = classes[name];
      if (Klass && error instanceof Klass) return { kind };
    }
  }

  const text = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
  for (const [pattern, kind] of MESSAGE_RULES) {
    if (pattern.test(text)) return { kind };
  }
  return { kind: 'unknown' };
}

/** Short reason sent to `POST /tags/activation/{intent}/fail` — no device data, no PII. */
export function failureReason(failure: ActivationFailure): string {
  return failure.code ? `${failure.kind}:${failure.code}` : failure.kind;
}

/** Failures where tapping again is the right next step. */
export function isRetryableByTap(kind: ActivationFailureKind): boolean {
  return ['cancelled', 'timeout', 'tag_lost', 'busy', 'verify_failed', 'tag_changed', 'network', 'unknown'].includes(kind);
}
