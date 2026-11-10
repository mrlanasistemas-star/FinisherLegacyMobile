import { AppError } from '@/api/errors';
import type { ActivationConfirm, ActivationStart } from '@/schemas/activation';

import { confirmPending, readTagOnce, runActivation, type ActivationApi, type ActivationDeps } from './activation-session';
import { encodeUriMessage, type RawNdefRecord } from './ndef';
import type { NfcDriver, TagSnapshot } from './nfc-driver';
import { createMemoryPendingStore } from './pending-activation';
import { resolveWebOrigin } from './url-policy';

jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));

const CODE = 'ABCDEFGHJKMN';
const WRITE_URL = `https://finisherlegacy.com/t/${CODE}`;
const origin = resolveWebOrigin('https://finisherlegacy.com');

function uriRecord(url: string): RawNdefRecord {
  const b = encodeUriMessage(url);
  return { tnf: 1, type: [0x55], payload: b.slice(4) };
}

function startResponse(over: Partial<ActivationStart> = {}): ActivationStart {
  return {
    intent_id: 'int-1',
    tag_code: CODE,
    write_url: WRITE_URL,
    expires_at: new Date(Date.now() + 600_000).toISOString(),
    status: 'ready_to_write',
    product: { name: 'Finisher Legacy Tag', variant: null, collection: null, image_url: null },
    story: null,
    ...over,
  };
}

const confirmed: ActivationConfirm = {
  status: 'activated',
  tag_code: CODE,
  story: { public_id: 'st_1', url: 'https://finisherlegacy.com/s/st_1', edit_url: 'https://finisherlegacy.com/s/st_1/editar' },
};

/** Fake chip + driver: writes land in `chip.records` so read-back reflects them. */
function fakeDriver(initial: Partial<TagSnapshot> = {}, overrides: Partial<NfcDriver> = {}) {
  const chip: TagSnapshot = { uid: '04A1B2C3D4E5F6', ndef: 'ready', capacity: 137, records: [], ...initial };
  const calls: string[] = [];
  const driver: NfcDriver = {
    platform: 'android',
    isAvailable: () => true,
    errorClasses: () => null,
    isSupported: async () => true,
    isEnabled: async () => true,
    openSettings: async () => {},
    beginSession: async () => {
      calls.push('begin');
    },
    inspect: async () => ({ ...chip, records: [...chip.records] }),
    setMessage: async () => {},
    write: async (bytes, mode) => {
      calls.push(`write:${mode}`);
      chip.records = [{ tnf: 1, type: [0x55], payload: bytes.slice(4) }];
      if (chip.ndef === 'formatable') chip.ndef = 'ready';
    },
    readRecords: async () => {
      calls.push('read');
      return chip.records;
    },
    endSession: async () => {
      calls.push('end');
    },
    ...overrides,
  };
  return { driver, chip, calls };
}

function fakeApi(over: Partial<ActivationApi> = {}) {
  const api = {
    start: jest.fn(async () => startResponse()),
    confirm: jest.fn(async () => confirmed),
    fail: jest.fn(async () => {}),
    ...over,
  };
  return api;
}

function deps(driver: NfcDriver, api: ActivationApi, pending = createMemoryPendingStore()): ActivationDeps & { pending: ReturnType<typeof createMemoryPendingStore> } {
  return { driver, api, pending, origin, userId: 7 };
}

describe('runActivation', () => {
  it('blank chip: start → write → verify → confirm, and clears the pending intent', async () => {
    const { driver, chip, calls } = fakeDriver();
    const api = fakeApi();
    const d = deps(driver, api);
    const outcome = await runActivation(d, { activationCode: 'XXXXYYYYZZZZ' });

    expect(outcome).toEqual({ type: 'activated', result: confirmed });
    expect(api.start).toHaveBeenCalledWith({ activation_code: 'XXXXYYYYZZZZ', tag_code: undefined, nfc_uid: '04A1B2C3D4E5F6', platform: 'android' });
    expect(api.confirm).toHaveBeenCalledWith('int-1', { nfc_uid: '04A1B2C3D4E5F6', written_url: WRITE_URL });
    expect(calls).toEqual(['begin', 'write:ndef', 'read', 'end']);
    expect(chip.records).toHaveLength(1);
    expect(d.pending.current()).toBeNull();
  });

  it('formats an unformatted Android chip instead of an NDEF write', async () => {
    const { driver, calls } = fakeDriver({ ndef: 'formatable', capacity: null });
    const outcome = await runActivation(deps(driver, fakeApi()), { activationCode: 'XXXXYYYYZZZZ' });
    expect(outcome.type).toBe('activated');
    expect(calls).toContain('write:format');
  });

  it('never writes a URL that fails the policy (foreign host)', async () => {
    const { driver, calls } = fakeDriver();
    const api = fakeApi({ start: jest.fn(async () => startResponse({ write_url: `https://evil.com/t/${CODE}` })) });
    const outcome = await runActivation(deps(driver, api), { activationCode: 'XXXXYYYYZZZZ' });
    expect(outcome).toEqual({ type: 'failed', failure: { kind: 'unsafe_url' } });
    expect(calls.some((c) => c.startsWith('write'))).toBe(false);
    expect(api.fail).toHaveBeenCalledWith('int-1', 'unsafe_url');
  });

  it('never writes when write_url code differs from tag_code', async () => {
    const { driver, calls } = fakeDriver();
    const api = fakeApi({ start: jest.fn(async () => startResponse({ write_url: 'https://finisherlegacy.com/t/ZZZZZZZZZZZZ' })) });
    expect((await runActivation(deps(driver, api), { activationCode: 'XXXXYYYYZZZZ' })).type).toBe('failed');
    expect(calls.some((c) => c.startsWith('write'))).toBe(false);
  });

  it('asks for consent before overwriting foreign data, and does not call start', async () => {
    const { driver, calls } = fakeDriver({ records: [uriRecord('https://example.com/promo')] });
    const api = fakeApi();
    const outcome = await runActivation(deps(driver, api), { activationCode: 'XXXXYYYYZZZZ' });
    expect(outcome).toEqual({ type: 'needs_overwrite_consent', uid: '04A1B2C3D4E5F6', summary: { kind: 'link', host: 'example.com' } });
    expect(api.start).not.toHaveBeenCalled();
    expect(calls).toEqual(['begin', 'end']);
  });

  it('overwrites foreign data once consented for the same chip', async () => {
    const { driver } = fakeDriver({ records: [uriRecord('https://example.com/promo')] });
    const outcome = await runActivation(deps(driver, fakeApi()), { activationCode: 'XXXXYYYYZZZZ', overwriteConsent: { uid: '04A1B2C3D4E5F6' } });
    expect(outcome.type).toBe('activated');
  });

  it('consent for another chip does not count', async () => {
    const { driver } = fakeDriver({ records: [uriRecord('https://example.com/promo')] });
    const outcome = await runActivation(deps(driver, fakeApi()), { activationCode: 'XXXXYYYYZZZZ', overwriteConsent: { uid: 'FFFFFFFFFFFFFF' } });
    expect(outcome.type).toBe('needs_overwrite_consent');
  });

  it('chip already carrying the same FL URL: sends tag_code, skips the write, still verifies and confirms', async () => {
    const { driver, calls } = fakeDriver({ records: [uriRecord(WRITE_URL)] });
    const api = fakeApi();
    const outcome = await runActivation(deps(driver, api), { activationCode: 'XXXXYYYYZZZZ' });
    expect(outcome.type).toBe('activated');
    expect(api.start).toHaveBeenCalledWith(expect.objectContaining({ tag_code: CODE }));
    expect(calls.some((c) => c.startsWith('write'))).toBe(false);
    expect(calls).toContain('read');
  });

  it('chip with another FL tag URL is never rewritten', async () => {
    const { driver, calls } = fakeDriver({ records: [uriRecord('https://finisherlegacy.com/t/PQRSTUVWXYZ2')] });
    const api = fakeApi({ start: jest.fn(async () => startResponse()) });
    const outcome = await runActivation(deps(driver, api), { activationCode: 'XXXXYYYYZZZZ' });
    expect(outcome).toEqual({ type: 'failed', failure: { kind: 'different_fl_tag' } });
    expect(calls.some((c) => c.startsWith('write'))).toBe(false);
  });

  it('already activated FL chip → existing_fl_tag', async () => {
    const { driver } = fakeDriver({ records: [uriRecord(WRITE_URL)] });
    const api = fakeApi({
      start: jest.fn(async () => {
        throw new AppError({ kind: 'business_rule', code: 'TAG_ALREADY_ACTIVATED', message: 'x', status: 422 });
      }),
    });
    expect(await runActivation(deps(driver, api), { activationCode: 'XXXXYYYYZZZZ' })).toEqual({ type: 'existing_fl_tag', tagCode: CODE });
  });

  it('maps backend codes (invalid activation code)', async () => {
    const { driver } = fakeDriver();
    const api = fakeApi({
      start: jest.fn(async () => {
        throw new AppError({ kind: 'business_rule', code: 'ACTIVATION_CODE_INVALID', message: 'Código inválido', status: 422 });
      }),
    });
    expect(await runActivation(deps(driver, api), { activationCode: 'XXXXYYYYZZZZ' })).toEqual({
      type: 'failed',
      failure: { kind: 'api', code: 'ACTIVATION_CODE_INVALID', message: 'Código inválido' },
    });
  });

  it('read-only chip fails before any network call', async () => {
    const { driver } = fakeDriver({ ndef: 'read_only' });
    const api = fakeApi();
    expect(await runActivation(deps(driver, api), { activationCode: 'XXXXYYYYZZZZ' })).toEqual({ type: 'failed', failure: { kind: 'read_only' } });
    expect(api.start).not.toHaveBeenCalled();
  });

  it('capacity too small fails and releases the intent', async () => {
    const { driver } = fakeDriver({ capacity: 10 });
    const api = fakeApi();
    expect(await runActivation(deps(driver, api), { activationCode: 'XXXXYYYYZZZZ' })).toEqual({ type: 'failed', failure: { kind: 'too_small' } });
    expect(api.fail).toHaveBeenCalledWith('int-1', 'too_small');
  });

  it('tag lost mid-write keeps the intent for recovery and does not call fail', async () => {
    const { driver } = fakeDriver({}, {
      write: async () => {
        throw new Error('android.nfc.TagLostException: Tag was lost.');
      },
    });
    const api = fakeApi();
    const d = deps(driver, api);
    expect(await runActivation(d, { activationCode: 'XXXXYYYYZZZZ' })).toEqual({ type: 'failed', failure: { kind: 'tag_lost' } });
    expect(api.fail).not.toHaveBeenCalled();
    expect(d.pending.current()?.intent_id).toBe('int-1');
  });

  it('verify mismatch fails and releases the intent', async () => {
    const { driver } = fakeDriver({}, { readRecords: async () => [uriRecord('https://finisherlegacy.com/t/ZZZZZZZZZZZZ')] });
    const api = fakeApi();
    const d = deps(driver, api);
    expect(await runActivation(d, { activationCode: 'XXXXYYYYZZZZ' })).toEqual({ type: 'failed', failure: { kind: 'verify_failed' } });
    expect(api.fail).toHaveBeenCalled();
    expect(d.pending.current()).toBeNull();
  });

  it('network failure on confirm → written_unconfirmed, pending kept as written; confirmPending finishes it', async () => {
    const { driver } = fakeDriver();
    const confirm = jest
      .fn()
      .mockRejectedValueOnce(new AppError({ kind: 'network', message: 'offline' }))
      .mockResolvedValueOnce(confirmed);
    const d = deps(driver, fakeApi({ confirm }));
    const outcome = await runActivation(d, { activationCode: 'XXXXYYYYZZZZ' });
    expect(outcome.type).toBe('written_unconfirmed');
    expect(d.pending.current()?.phase).toBe('written');

    expect(await confirmPending(d)).toEqual({ type: 'activated', result: confirmed });
    expect(d.pending.current()).toBeNull();
  });

  it('recovery: reading a chip with our pending URL confirms without a new start', async () => {
    const { driver } = fakeDriver({ records: [uriRecord(WRITE_URL)] });
    const api = fakeApi();
    const pending = createMemoryPendingStore({
      version: 1,
      user_id: 7,
      intent_id: 'int-9',
      tag_code: CODE,
      write_url: WRITE_URL,
      expires_at: new Date().toISOString(),
      nfc_uid: '04A1B2C3D4E5F6',
      phase: 'authorized',
      saved_at: new Date().toISOString(),
    });
    const outcome = await runActivation(deps(driver, api, pending), { activationCode: 'XXXXYYYYZZZZ' });
    expect(outcome.type).toBe('activated');
    expect(api.start).not.toHaveBeenCalled();
    expect(api.confirm).toHaveBeenCalledWith('int-9', expect.objectContaining({ written_url: WRITE_URL }));
  });

  it('confirmPending ignores another user’s pending intent', async () => {
    const pending = createMemoryPendingStore({
      version: 1,
      user_id: 99,
      intent_id: 'int-9',
      tag_code: CODE,
      write_url: WRITE_URL,
      expires_at: new Date().toISOString(),
      nfc_uid: null,
      phase: 'written',
      saved_at: new Date().toISOString(),
    });
    const api = fakeApi();
    expect(await confirmPending(deps(fakeDriver().driver, api, pending))).toBeNull();
    expect(api.confirm).not.toHaveBeenCalled();
  });

  it('preflight: module missing / unsupported / disabled', async () => {
    expect(await runActivation(deps(fakeDriver({}, { isAvailable: () => false }).driver, fakeApi()), { activationCode: 'X' })).toEqual({ type: 'failed', failure: { kind: 'module_unavailable' } });
    expect(await runActivation(deps(fakeDriver({}, { isSupported: async () => false }).driver, fakeApi()), { activationCode: 'X' })).toEqual({ type: 'failed', failure: { kind: 'unsupported' } });
    expect(await runActivation(deps(fakeDriver({}, { isEnabled: async () => false }).driver, fakeApi()), { activationCode: 'X' })).toEqual({ type: 'failed', failure: { kind: 'disabled' } });
  });

  it('user cancel closes the session and reports cancelled', async () => {
    const { driver, calls } = fakeDriver({}, {
      beginSession: async () => {
        throw 'cancelled';
      },
    });
    expect(await runActivation(deps(driver, fakeApi()), { activationCode: 'X' })).toEqual({ type: 'failed', failure: { kind: 'cancelled' } });
    expect(calls).toContain('end');
  });

  it('a double tap while a session runs is rejected as busy', async () => {
    let release: () => void = () => {};
    const { driver } = fakeDriver({}, {
      beginSession: () =>
        new Promise<void>((resolve) => {
          release = resolve;
        }),
    });
    const d = deps(driver, fakeApi());
    const first = runActivation(d, { activationCode: 'XXXXYYYYZZZZ' });
    expect(await runActivation(d, { activationCode: 'XXXXYYYYZZZZ' })).toEqual({ type: 'failed', failure: { kind: 'busy' } });
    // Let the first session proceed so the module-level lock is released.
    await new Promise((resolve) => setTimeout(resolve, 0));
    release();
    expect((await first).type).toBe('activated');
  });
});

describe('readTagOnce', () => {
  it('reads URIs without writing', async () => {
    const { driver, calls } = fakeDriver({ records: [uriRecord(WRITE_URL)] });
    expect(await readTagOnce(driver)).toEqual({ type: 'read', uris: [WRITE_URL], blank: false, foreign: true });
    expect(calls.some((c) => c.startsWith('write'))).toBe(false);
  });
});
