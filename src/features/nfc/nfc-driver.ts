import { Platform } from 'react-native';
import type * as NfcModule from 'react-native-nfc-manager';

import { normalizeUid } from './nfc-uid';
import type { NfcErrorClasses } from './nfc-errors';
import type { RawNdefRecord } from './ndef';

/**
 * Thin, promise-based wrapper over `react-native-nfc-manager` — the only
 * file that touches the native module. Everything above it (the session
 * orchestrator, the screens) talks to this interface, which is what the
 * unit tests fake.
 */

export type NdefState = 'ready' | 'formatable' | 'read_only' | 'unsupported';

export interface TagSnapshot {
  /** Hex UID, upper-case, no separators — null when the platform does not expose it. */
  uid: string | null;
  ndef: NdefState;
  /** Max NDEF message size in bytes, when known. */
  capacity: number | null;
  records: RawNdefRecord[];
}

export interface NfcDriver {
  readonly platform: 'android' | 'ios';
  /** False when the native module isn't in this binary (Expo Go, an old build, web). */
  isAvailable(): boolean;
  errorClasses(): NfcErrorClasses | null;
  isSupported(): Promise<boolean>;
  isEnabled(): Promise<boolean>;
  /** Android: opens NFC settings. iOS: no-op (NFC can't be turned off). */
  openSettings(): Promise<void>;
  /** Starts a reader session and resolves once a tag is in the field. */
  beginSession(alertMessage: string): Promise<void>;
  inspect(): Promise<TagSnapshot>;
  /** iOS sheet text; Android no-op (our own UI shows progress). */
  setMessage(message: string): Promise<void>;
  /** Writes a full NDEF message. `format` only for an Android NdefFormatable chip. Never makes the chip read-only. */
  write(bytes: number[], mode: 'ndef' | 'format'): Promise<void>;
  /** Fresh read of the NDEF message (not the discovery cache). */
  readRecords(): Promise<RawNdefRecord[]>;
  /** Always safe to call; never throws. */
  endSession(result?: { success?: string; error?: string }): Promise<void>;
}

type Module = typeof NfcModule;

let cached: { module: Module | null } | null = null;

/**
 * The library throws at import time when its native module is missing, so
 * it is loaded lazily and the failure becomes `isAvailable() === false`
 * instead of a red screen.
 */
function loadModule(): Module | null {
  if (cached) return cached.module;
  if (Platform.OS !== 'android' && Platform.OS !== 'ios') {
    cached = { module: null };
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-nfc-manager') as Module;
    cached = { module: mod };
  } catch {
    cached = { module: null };
  }
  return cached.module;
}

function toRecords(message: unknown): RawNdefRecord[] {
  if (!Array.isArray(message)) return [];
  return message
    .filter((r): r is RawNdefRecord => !!r && typeof r === 'object' && 'tnf' in r)
    .map((r) => ({ tnf: Number(r.tnf), type: r.type, payload: Array.isArray(r.payload) ? r.payload : [], id: r.id }));
}

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`${label} timeout`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (error: unknown) => {
        clearTimeout(timer);
        reject(error);
      },
    );
  });
}

export function createNativeNfcDriver(): NfcDriver {
  const platform: 'android' | 'ios' = Platform.OS === 'ios' ? 'ios' : 'android';
  let started = false;
  let tech: string | null = null;
  let alertMessage = '';

  function mod(): Module {
    const m = loadModule();
    if (!m) throw new Error('no nfc support');
    return m;
  }

  async function ensureStarted() {
    if (started) return;
    await mod().default.start();
    started = true;
  }

  return {
    platform,
    isAvailable: () => loadModule() !== null,
    errorClasses: () => (loadModule()?.NfcError as NfcErrorClasses | undefined) ?? null,

    async isSupported() {
      const m = loadModule();
      if (!m) return false;
      try {
        return await m.default.isSupported(m.NfcTech.Ndef);
      } catch {
        return false;
      }
    },

    async isEnabled() {
      const m = loadModule();
      if (!m) return false;
      try {
        await ensureStarted();
        return await m.default.isEnabled();
      } catch {
        return false;
      }
    },

    async openSettings() {
      const m = loadModule();
      if (!m || platform !== 'android') return;
      try {
        await m.default.goToNfcSetting();
      } catch {
        // Some OEM ROMs have no NFC settings activity; the screen copy covers it.
      }
    },

    async beginSession(message) {
      const m = mod();
      await ensureStarted();
      alertMessage = message;
      const techs = platform === 'android' ? [m.NfcTech.Ndef, m.NfcTech.NdefFormatable] : m.NfcTech.Ndef;
      tech = await m.default.requestTechnology(techs, { alertMessage: message });
    },

    async inspect() {
      const m = mod();
      const tag = await m.default.getTag();
      const uid = normalizeUid(tag?.id);

      if (platform === 'android' && tech === m.NfcTech.NdefFormatable) {
        // Unformatted chip: no NDEF yet, so nothing to lose and no capacity until it is formatted.
        return { uid, ndef: 'formatable', capacity: null, records: [] };
      }

      const status = await m.default.ndefHandler.getNdefStatus();
      const ndef: NdefState =
        status.status === m.NdefStatus.ReadWrite ? 'ready' : status.status === m.NdefStatus.ReadOnly ? 'read_only' : 'unsupported';

      let records = toRecords(tag?.ndefMessage);
      if (ndef !== 'unsupported' && records.length === 0) {
        try {
          const fresh = await m.default.ndefHandler.getNdefMessage();
          records = toRecords(fresh?.ndefMessage);
        } catch {
          // A blank-but-formatted NTAG has an empty NDEF TLV; reading it may reject. Treat as no records.
        }
      }

      return { uid, ndef, capacity: status.capacity > 0 ? status.capacity : null, records };
    },

    async setMessage(message) {
      if (platform !== 'ios') return;
      try {
        await mod().default.setAlertMessageIOS(message);
      } catch {
        // Cosmetic only.
      }
    },

    async write(bytes, mode) {
      const m = mod();
      if (mode === 'format') {
        if (platform !== 'android') throw new Error('unsupported tag api');
        await m.default.ndefFormatableHandlerAndroid.formatNdef(bytes, { readOnly: false });
        return;
      }
      await m.default.ndefHandler.writeNdefMessage(bytes);
    },

    async readRecords() {
      const m = mod();
      if (platform === 'android' && tech === m.NfcTech.NdefFormatable) {
        // After formatting, the chip only answers NDEF reads through a new Ndef connection.
        await m.default.cancelTechnologyRequest({ delayMsAndroid: 0 });
        tech = await withTimeout(m.default.requestTechnology(m.NfcTech.Ndef, { alertMessage }), 5000, 'verify');
      }
      const fresh = await m.default.ndefHandler.getNdefMessage();
      return toRecords(fresh?.ndefMessage);
    },

    async endSession(result) {
      const m = loadModule();
      tech = null;
      if (!m) return;
      try {
        if (platform === 'ios') {
          if (result?.error) {
            await m.default.invalidateSessionWithErrorIOS(result.error);
            return;
          }
          if (result?.success) await m.default.setAlertMessageIOS(result.success);
        }
        await m.default.cancelTechnologyRequest();
      } catch {
        // Already closed (tag lost, user cancel, OS timeout) — nothing to clean up.
      }
    },
  };
}

/** Single native driver for the app (the native session is a process-wide singleton anyway). */
let shared: NfcDriver | null = null;
export function nativeNfcDriver(): NfcDriver {
  if (!shared) shared = createNativeNfcDriver();
  return shared;
}
