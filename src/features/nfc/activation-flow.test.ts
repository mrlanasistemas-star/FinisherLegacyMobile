import type { ActivationConfirm } from '@/schemas/activation';

import { activationCodeForApi, initialWizardState, stepperIndex, wizardReducer, type WizardState } from './activation-flow';
import { classifyNfcError, isRetryableByTap } from './nfc-errors';
import { normalizeUid, uidsDiffer } from './nfc-uid';

function at(state: WizardState, ...actions: Parameters<typeof wizardReducer>[1][]): WizardState {
  return actions.reduce(wizardReducer, state);
}

describe('wizardReducer', () => {
  it('starts at account when logged out and moves to code on login', () => {
    const s = initialWizardState(false);
    expect(s.step).toBe('account');
    expect(at(s, { type: 'auth_changed', authenticated: true }).step).toBe('code');
  });

  it('masks the code and blocks incomplete submissions', () => {
    let s = at(initialWizardState(true), { type: 'code_changed', value: 'abcdefgh' }, { type: 'code_submitted' });
    expect(s.code).toBe('ABCD-EFGH');
    expect(s.step).toBe('code');
    expect(s.codeError).toBeTruthy();
    s = at(s, { type: 'code_changed', value: 'abcdefghjkmn' }, { type: 'code_submitted' });
    expect(s.step).toBe('approach');
    expect(activationCodeForApi(s)).toBe('ABCDEFGHJKMN');
  });

  it('runs approach → session → progress → done', () => {
    const result: ActivationConfirm = { status: 'activated', tag_code: 'ABCDEFGHJKMN', story: { public_id: 'p', url: 'u', edit_url: null } };
    const s = at(
      initialWizardState(true, 'ABCDEFGHJKMN'),
      { type: 'code_submitted' },
      { type: 'session_started' },
      { type: 'progress', progress: 'writing' },
    );
    expect(s.step).toBe('session');
    expect(s.progress).toBe('writing');
    const done = at(s, { type: 'outcome', outcome: { type: 'activated', result } });
    expect(done.step).toBe('done');
    expect(stepperIndex(done.step)).toBe(4);
  });

  it('consent flow carries the chip uid into the next attempt', () => {
    const s = at(
      initialWizardState(true, 'ABCDEFGHJKMN'),
      { type: 'code_submitted' },
      { type: 'session_started' },
      { type: 'outcome', outcome: { type: 'needs_overwrite_consent', uid: '04AA', summary: { kind: 'link', host: 'example.com' } } },
    );
    expect(s.step).toBe('consent');
    const accepted = at(s, { type: 'consent_accepted' });
    expect(accepted.overwriteConsent).toEqual({ uid: '04AA' });
    expect(at(s, { type: 'consent_declined' }).overwriteConsent).toBeNull();
  });

  it('errors offer retry and edit code', () => {
    const s = at(
      initialWizardState(true, 'ABCDEFGHJKMN'),
      { type: 'code_submitted' },
      { type: 'session_started' },
      { type: 'outcome', outcome: { type: 'failed', failure: { kind: 'tag_lost' } } },
    );
    expect(s.step).toBe('error');
    expect(at(s, { type: 'retry' }).step).toBe('approach');
    expect(at(s, { type: 'edit_code' }).step).toBe('code');
  });

  it('ignores progress outside a session and session start from the code step', () => {
    const s = initialWizardState(true);
    expect(at(s, { type: 'progress', progress: 'writing' })).toBe(s);
    expect(at(s, { type: 'session_started' }).step).toBe('code');
  });
});

describe('classifyNfcError', () => {
  class UserCancel extends Error {}
  class TagNotWritable extends Error {}

  it('uses library error classes when available', () => {
    expect(classifyNfcError(new UserCancel(), { UserCancel })).toEqual({ kind: 'cancelled' });
    expect(classifyNfcError(new TagNotWritable(), { TagNotWritable })).toEqual({ kind: 'read_only' });
  });

  it.each([
    ['cancelled', 'cancelled'],
    ['android.nfc.TagLostException: Tag was lost.', 'tag_lost'],
    ['java.io.IOException', 'tag_lost'],
    ['tag is not writeable', 'read_only'],
    ['tag size is not enough', 'too_small'],
    ['android.nfc.FormatException', 'not_ndef'],
    ['You can only issue one request at a time', 'busy'],
    ['Duplicated registration', 'busy'],
    ['no nfc support', 'unsupported'],
    ['verify timeout', 'timeout'],
    ['something else', 'unknown'],
  ])('maps "%s" → %s', (message, kind) => {
    expect(classifyNfcError(message, null).kind).toBe(kind);
    expect(classifyNfcError(new Error(message), null).kind).toBe(kind);
  });

  it('marks tap-retryable failures', () => {
    expect(isRetryableByTap('tag_lost')).toBe(true);
    expect(isRetryableByTap('read_only')).toBe(false);
  });
});

describe('uid helpers', () => {
  it('normalizes hex strings and byte arrays', () => {
    expect(normalizeUid('04:a1:b2:c3:d4:e5:f6')).toBe('04A1B2C3D4E5F6');
    expect(normalizeUid([4, 161, 178, 195])).toBe('04A1B2C3');
    expect(normalizeUid('')).toBeNull();
    expect(normalizeUid(undefined)).toBeNull();
  });
  it('only reports a difference when both are known', () => {
    expect(uidsDiffer('A', 'B')).toBe(true);
    expect(uidsDiffer(null, 'B')).toBe(false);
  });
});
