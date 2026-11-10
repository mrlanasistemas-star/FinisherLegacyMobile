/**
 * Tests for re-resolving an expired signed audio URL: refetch the cache
 * first, fall back to scanning inbox pages, give up cleanly, and allow only
 * one automatic retry per message until it plays again.
 */
import { createRetryGate, resolveFreshAudioUrl, type MessageWithAudio, type PageLike } from './url-refresh';

const page = (n: number, last: number, data: MessageWithAudio[]): PageLike => ({ data, meta: { current_page: n, last_page: last } });

describe('resolveFreshAudioUrl', () => {
  it('returns the re-signed URL from the refetched cache', async () => {
    let cache: MessageWithAudio = { uuid: 'a', audio_url: 'https://cdn/a?sig=old' };
    const refetchCached = jest.fn(async () => {
      cache = { uuid: 'a', audio_url: 'https://cdn/a?sig=new' };
    });
    const fetchPage = jest.fn();
    const url = await resolveFreshAudioUrl('a', { refetchCached, findCached: () => cache, fetchPage });
    expect(url).toBe('https://cdn/a?sig=new');
    expect(refetchCached).toHaveBeenCalledTimes(1);
    expect(fetchPage).not.toHaveBeenCalled();
  });

  it('scans inbox pages when the message is not cached', async () => {
    const fetchPage = jest.fn(async (n: number) =>
      n === 1 ? page(1, 3, [{ uuid: 'x', audio_url: 'u-x' }]) : page(2, 3, [{ uuid: 'b', audio_url: 'https://cdn/b?sig=new' }]),
    );
    const url = await resolveFreshAudioUrl('b', { refetchCached: async () => {}, findCached: () => null, fetchPage });
    expect(url).toBe('https://cdn/b?sig=new');
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it('survives a failed refetch and stops at the last page / max pages', async () => {
    const fetchPage = jest.fn(async (n: number) => page(n, 1, []));
    const url = await resolveFreshAudioUrl('c', {
      refetchCached: async () => {
        throw new Error('offline');
      },
      findCached: () => null,
      fetchPage,
    });
    expect(url).toBeNull();
    expect(fetchPage).toHaveBeenCalledTimes(1);

    const many = jest.fn(async (n: number) => page(n, 99, []));
    await resolveFreshAudioUrl('c', { refetchCached: async () => {}, findCached: () => null, fetchPage: many, maxPages: 2 });
    expect(many).toHaveBeenCalledTimes(2);
  });

  it('returns null when the page request fails or the message lost its audio', async () => {
    expect(
      await resolveFreshAudioUrl('d', {
        refetchCached: async () => {},
        findCached: () => null,
        fetchPage: async () => {
          throw new Error('500');
        },
      }),
    ).toBeNull();
    expect(await resolveFreshAudioUrl('e', { refetchCached: async () => {}, findCached: () => ({ uuid: 'e', audio_url: null }) })).toBeNull();
  });
});

describe('createRetryGate', () => {
  it('allows one retry per message until it plays successfully', () => {
    const gate = createRetryGate();
    expect(gate.tryAcquire('a')).toBe(true);
    expect(gate.tryAcquire('a')).toBe(false);
    expect(gate.tryAcquire('b')).toBe(true);
    gate.succeeded('a');
    expect(gate.tryAcquire('a')).toBe(true);
    gate.reset();
    expect(gate.tryAcquire('b')).toBe(true);
  });
});
