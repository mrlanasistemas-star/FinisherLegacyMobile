/**
 * The upload queue state machine: order, single flight, progress rules,
 * failure / retry, cancel, and how a MEDIA_LIMIT_REACHED blocks (and a
 * purchase resumes) the rest of the same story + kind.
 */

import { activeUpload, initialUploadQueue, nextUpload, pendingCount, summarize, uploadReducer, uploadsForStory, type NewUpload, type UploadEvent, type UploadQueueState } from './upload-queue';

function file(id: string, role: NewUpload['role'] = 'photo', storyId = 's1'): NewUpload {
  return { id, storyId, role, localUri: `file:///${id}`, fileName: `${id}.jpg`, mimeType: null, width: 4000, height: 3000, durationSeconds: null };
}

function run(events: UploadEvent[], from: UploadQueueState = initialUploadQueue): UploadQueueState {
  return events.reduce(uploadReducer, from);
}

const status = (state: UploadQueueState, id: string) => state.items.find((item) => item.id === id)?.status;

describe('uploadReducer', () => {
  it('queues files in the order they were picked and ignores duplicates', () => {
    const state = run([
      { type: 'ENQUEUE', items: [file('a'), file('b')] },
      { type: 'ENQUEUE', items: [file('b'), file('c')] },
    ]);
    expect(state.items.map((item) => item.id)).toEqual(['a', 'b', 'c']);
    expect(state.items.every((item) => item.status === 'queued' && item.progress === 0 && item.attempts === 0)).toBe(true);
  });

  it('runs one file at a time, first in first out', () => {
    let state = run([{ type: 'ENQUEUE', items: [file('a'), file('b')] }]);
    expect(nextUpload(state)?.id).toBe('a');

    state = run([{ type: 'PREPARE', id: 'a' }], state);
    expect(activeUpload(state)?.id).toBe('a');
    expect(nextUpload(state)).toBeNull();

    state = run(
      [
        { type: 'START', id: 'a' },
        { type: 'SUCCEEDED', id: 'a', mediaUuid: 'm-a' },
      ],
      state,
    );
    expect(status(state, 'a')).toBe('done');
    expect(state.items[0].mediaUuid).toBe('m-a');
    expect(state.items[0].progress).toBe(100);
    expect(nextUpload(state)?.id).toBe('b');
  });

  it('only moves progress forward, and never to 100 before the server answers', () => {
    let state = run([
      { type: 'ENQUEUE', items: [file('a')] },
      { type: 'PREPARE', id: 'a' },
    ]);
    state = run([{ type: 'PROGRESS', id: 'a', progress: 50 }], state);
    expect(state.items[0].progress).toBe(0); // not uploading yet

    state = run(
      [
        { type: 'START', id: 'a' },
        { type: 'PROGRESS', id: 'a', progress: 40 },
        { type: 'PROGRESS', id: 'a', progress: 25 },
      ],
      state,
    );
    expect(state.items[0].progress).toBe(40);
    state = run([{ type: 'PROGRESS', id: 'a', progress: 100 }], state);
    expect(state.items[0].progress).toBe(99);
  });

  it('keeps the same state object when nothing changes', () => {
    const state = run([
      { type: 'ENQUEUE', items: [file('a')] },
      { type: 'PREPARE', id: 'a' },
      { type: 'START', id: 'a' },
      { type: 'PROGRESS', id: 'a', progress: 10 },
    ]);
    expect(uploadReducer(state, { type: 'PROGRESS', id: 'a', progress: 10 })).toBe(state);
    expect(uploadReducer(state, { type: 'START', id: 'missing' })).toBe(state);
    expect(uploadReducer(state, { type: 'RETRY', id: 'a' })).toBe(state);
  });

  it('fails with a message, lets the next file go, and retries from zero', () => {
    let state = run([
      { type: 'ENQUEUE', items: [file('a'), file('b')] },
      { type: 'PREPARE', id: 'a' },
      { type: 'START', id: 'a' },
      { type: 'PROGRESS', id: 'a', progress: 70 },
      { type: 'FAILED', id: 'a', message: 'Sin conexión.' },
    ]);
    expect(state.items[0]).toMatchObject({ status: 'failed', progress: 0, error: 'Sin conexión.', attempts: 1 });
    expect(nextUpload(state)?.id).toBe('b');

    state = run([{ type: 'RETRY', id: 'a' }], state);
    expect(state.items[0]).toMatchObject({ status: 'queued', error: null });
    state = run([{ type: 'PREPARE', id: 'a' }], state);
    expect(state.items[0].attempts).toBe(2);
  });

  it('ignores a late success / failure for a file that is no longer in flight', () => {
    const state = run([{ type: 'ENQUEUE', items: [file('a')] }]);
    expect(uploadReducer(state, { type: 'SUCCEEDED', id: 'a', mediaUuid: 'm' })).toBe(state);
    expect(uploadReducer(state, { type: 'FAILED', id: 'a', message: 'x' })).toBe(state);
  });

  it('cancels a waiting or uploading file but never a finished one', () => {
    let state = run([
      { type: 'ENQUEUE', items: [file('a'), file('b')] },
      { type: 'PREPARE', id: 'a' },
      { type: 'START', id: 'a' },
    ]);
    state = run([{ type: 'CANCEL', id: 'a' }], state);
    expect(state.items.map((item) => item.id)).toEqual(['b']);
    expect(nextUpload(state)?.id).toBe('b');

    state = run(
      [
        { type: 'PREPARE', id: 'b' },
        { type: 'START', id: 'b' },
        { type: 'SUCCEEDED', id: 'b', mediaUuid: 'm-b' },
      ],
      state,
    );
    expect(uploadReducer(state, { type: 'CANCEL', id: 'b' })).toBe(state);
  });
});

describe('limit reached', () => {
  const queued = () =>
    run([
      { type: 'ENQUEUE', items: [file('p1'), file('p2'), file('v1', 'video'), file('p3'), file('other', 'photo', 's2')] },
      { type: 'PREPARE', id: 'p1' },
      { type: 'START', id: 'p1' },
      { type: 'LIMIT_REACHED', id: 'p1', message: 'Llegaste al límite de fotos.' },
    ]);

  it('blocks the file and everything still queued for the same story and kind', () => {
    const state = queued();
    expect(status(state, 'p1')).toBe('blocked');
    expect(status(state, 'p2')).toBe('blocked');
    expect(status(state, 'p3')).toBe('blocked');
    expect(state.items[0].error).toBe('Llegaste al límite de fotos.');
  });

  it('leaves other kinds and other stories running', () => {
    const state = queued();
    expect(status(state, 'v1')).toBe('queued');
    expect(status(state, 'other')).toBe('queued');
    expect(nextUpload(state)?.id).toBe('v1');
  });

  it('resumes exactly the blocked files once more space was bought', () => {
    const state = run([{ type: 'RESUME_BLOCKED', storyId: 's1', kind: 'photos' }], queued());
    expect(['p1', 'p2', 'p3'].map((id) => status(state, id))).toEqual(['queued', 'queued', 'queued']);
    expect(state.items[0].error).toBeNull();
    expect(nextUpload(state)?.id).toBe('p1');
  });

  it('does nothing when resuming a kind that is not blocked', () => {
    const state = queued();
    expect(uploadReducer(state, { type: 'RESUME_BLOCKED', storyId: 's1', kind: 'videos' })).toBe(state);
    expect(uploadReducer(state, { type: 'RESUME_BLOCKED', storyId: 's2', kind: 'photos' })).toBe(state);
  });

  it('a blocked file can be retried on its own or removed', () => {
    let state = run([{ type: 'RETRY', id: 'p2' }], queued());
    expect(status(state, 'p2')).toBe('queued');
    state = run([{ type: 'CANCEL', id: 'p3' }], state);
    expect(status(state, 'p3')).toBeUndefined();
  });
});

describe('selectors', () => {
  const state = run([
    { type: 'ENQUEUE', items: [file('a'), file('b'), file('c'), file('v', 'video'), file('z', 'photo', 's2')] },
    { type: 'PREPARE', id: 'a' },
    { type: 'START', id: 'a' },
    { type: 'SUCCEEDED', id: 'a', mediaUuid: 'm-a' },
    { type: 'PREPARE', id: 'b' },
    { type: 'START', id: 'b' },
    { type: 'PROGRESS', id: 'b', progress: 50 },
  ]);

  it('counts what still takes a place in the quota, per story and kind', () => {
    expect(pendingCount(state, 's1', 'photos')).toBe(2); // b uploading + c queued; a is already counted by the server
    expect(pendingCount(state, 's1', 'videos')).toBe(1);
    expect(pendingCount(state, 's2', 'photos')).toBe(1);
    expect(pendingCount(state, 's1', 'audio')).toBe(0);
  });

  it('summarizes one story', () => {
    const summary = summarize(uploadsForStory(state, 's1'));
    expect(summary).toMatchObject({ total: 4, done: 1, waiting: 3, failed: 0, blocked: 0, busy: true });
    expect(summary.progress).toBe(Math.round((100 + 50 + 0 + 0) / 4));
  });

  it('is not busy when only failed / blocked files remain', () => {
    const stuck = run([
      { type: 'ENQUEUE', items: [file('a')] },
      { type: 'PREPARE', id: 'a' },
      { type: 'FAILED', id: 'a', message: 'x' },
    ]);
    expect(summarize(stuck.items)).toMatchObject({ failed: 1, busy: false, progress: 0 });
    expect(summarize([])).toMatchObject({ total: 0, busy: false, progress: 0 });
  });

  it('clears finished files of one story only, and resets everything', () => {
    const cleared = run([{ type: 'CLEAR_DONE', storyId: 's1' }], state);
    expect(cleared.items.map((item) => item.id)).toEqual(['b', 'c', 'v', 'z']);
    expect(uploadReducer(cleared, { type: 'CLEAR_DONE', storyId: 's1' })).toBe(cleared);
    expect(run([{ type: 'RESET' }], state).items).toEqual([]);
  });
});
