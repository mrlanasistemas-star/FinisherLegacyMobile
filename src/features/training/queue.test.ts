/**
 * Tests for the Entrenamientos playback queue: ordering, next/previous,
 * repeat modes, shuffle and removal.
 */
import {
  buildQueueIds,
  createQueue,
  currentId,
  cycleRepeat,
  hasNext,
  jumpTo,
  next,
  previous,
  remainingCount,
  removeId,
  setShuffle,
  shuffled,
} from './queue';

const msg = (uuid: string, listened: boolean, favorite = false) => ({
  uuid,
  listened_at: listened ? '2026-11-01T10:00:00Z' : null,
  favorite,
  created_at: '2026-11-01T09:00:00Z',
});

/** Deterministic LCG so shuffle tests are stable. */
function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('buildQueueIds', () => {
  const list = [msg('a', true), msg('b', false, true), msg('c', true, true), msg('d', false)];

  it('puts unheard first, keeping list order within each group', () => {
    expect(buildQueueIds(list, 'unheard_first')).toEqual(['b', 'd', 'a', 'c']);
  });
  it('keeps only favorites', () => {
    expect(buildQueueIds(list, 'favorites')).toEqual(['b', 'c']);
  });
  it('keeps everything for all', () => {
    expect(buildQueueIds(list, 'all')).toEqual(['a', 'b', 'c', 'd']);
  });
});

describe('createQueue', () => {
  it('starts at the requested message and dedupes', () => {
    const q = createQueue(['a', 'b', 'b', 'c'], { startId: 'b' });
    expect(q.ids).toEqual(['a', 'b', 'c']);
    expect(currentId(q)).toBe('b');
  });
  it('falls back to the first message for an unknown start', () => {
    expect(currentId(createQueue(['a', 'b'], { startId: 'zzz' }))).toBe('a');
  });
  it('an empty queue has no current message', () => {
    expect(currentId(createQueue([]))).toBeNull();
    expect(next(createQueue([]))).toBeNull();
  });
});

describe('next', () => {
  it('advances and finishes with repeat off', () => {
    let q = createQueue(['a', 'b']);
    q = next(q)!;
    expect(currentId(q)).toBe('b');
    expect(next(q)).toBeNull();
    expect(hasNext(q)).toBe(false);
  });
  it('wraps with repeat all', () => {
    const q = { ...createQueue(['a', 'b'], { startId: 'b' }), repeat: 'all' as const };
    expect(hasNext(q)).toBe(true);
    expect(currentId(next(q)!)).toBe('a');
  });
  it('repeat one replays on auto-advance but a manual skip moves on', () => {
    const q = { ...createQueue(['a', 'b']), repeat: 'one' as const };
    expect(currentId(next(q, { auto: true })!)).toBe('a');
    expect(currentId(next(q)!)).toBe('b');
  });
});

describe('previous', () => {
  const q = createQueue(['a', 'b', 'c'], { startId: 'b' });
  it('restarts the message after the first seconds', () => {
    expect(previous(q, 10)).toEqual({ state: q, restart: true });
  });
  it('goes back at the very start', () => {
    const result = previous(q, 1);
    expect(result.restart).toBe(false);
    expect(currentId(result.state)).toBe('a');
  });
  it('restarts the first message when there is nothing before (repeat off)', () => {
    const first = createQueue(['a', 'b']);
    expect(previous(first, 0)).toEqual({ state: first, restart: true });
  });
  it('wraps to the last message with repeat all', () => {
    const first = { ...createQueue(['a', 'b', 'c']), repeat: 'all' as const };
    expect(currentId(previous(first, 0).state)).toBe('c');
  });
});

describe('shuffle', () => {
  it('keeps the current message first and contains every message once', () => {
    const q = setShuffle(createQueue(['a', 'b', 'c', 'd', 'e'], { startId: 'c' }), true, seeded(7));
    expect(q.shuffle).toBe(true);
    expect(currentId(q)).toBe('c');
    expect(q.position).toBe(0);
    expect([...q.order].sort()).toEqual([0, 1, 2, 3, 4]);
  });
  it('turning it off restores natural order on the same message', () => {
    const on = setShuffle(createQueue(['a', 'b', 'c', 'd'], { startId: 'b' }), true, seeded(3));
    const moved = next(on)!;
    const id = currentId(moved);
    const off = setShuffle(moved, false);
    expect(off.order).toEqual([0, 1, 2, 3]);
    expect(currentId(off)).toBe(id);
  });
  it('shuffled is a permutation and is deterministic for a seed', () => {
    const a = shuffled([1, 2, 3, 4, 5, 6], seeded(42));
    const b = shuffled([1, 2, 3, 4, 5, 6], seeded(42));
    expect(a).toEqual(b);
    expect([...a].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe('repeat cycle', () => {
  it('goes off → all → one → off', () => {
    expect(cycleRepeat('off')).toBe('all');
    expect(cycleRepeat('all')).toBe('one');
    expect(cycleRepeat('one')).toBe('off');
  });
});

describe('jumpTo / removeId / remainingCount', () => {
  it('jumps to a message in the queue and ignores unknown ids', () => {
    const q = createQueue(['a', 'b', 'c']);
    expect(currentId(jumpTo(q, 'c')!)).toBe('c');
    expect(jumpTo(q, 'x')).toBeNull();
  });
  it('removing an earlier message keeps the current one', () => {
    const q = removeId(createQueue(['a', 'b', 'c'], { startId: 'c' }), 'a');
    expect(currentId(q)).toBe('c');
    expect(q.ids).toEqual(['b', 'c']);
  });
  it('removing the current message lands on the next one', () => {
    const q = removeId(createQueue(['a', 'b', 'c'], { startId: 'b' }), 'b');
    expect(currentId(q)).toBe('c');
  });
  it('removing the last current message clamps to the new last', () => {
    const q = removeId(createQueue(['a', 'b'], { startId: 'b' }), 'b');
    expect(currentId(q)).toBe('a');
  });
  it('works on a shuffled queue', () => {
    const q = setShuffle(createQueue(['a', 'b', 'c', 'd'], { startId: 'a' }), true, seeded(9));
    const removedOther = q.ids[q.order[2]];
    const after = removeId(q, removedOther);
    expect(currentId(after)).toBe('a');
    expect(after.ids).not.toContain(removedOther);
    expect([...after.order].sort()).toEqual([0, 1, 2]);
  });
  it('removing everything empties the queue', () => {
    expect(currentId(removeId(createQueue(['a']), 'a'))).toBeNull();
  });
  it('counts what is left after the current message', () => {
    expect(remainingCount(createQueue(['a', 'b', 'c']))).toBe(2);
    expect(remainingCount(createQueue(['a', 'b', 'c'], { startId: 'c' }))).toBe(0);
  });
});
