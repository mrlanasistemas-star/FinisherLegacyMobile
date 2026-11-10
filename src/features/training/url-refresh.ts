/**
 * Recovery for expired signed audio URLs (pure, unit-tested).
 *
 * Message audio is served from short-lived signed URLs. A queue loaded at
 * the start of a long workout can outlive them, and the player then fails
 * with an HTTP 403. On a playback error the controller asks
 * `resolveFreshAudioUrl` for a new URL — refetch the cached message lists
 * first, then scan the first pages of the inbox — and retries ONCE per
 * message (`createRetryGate`) so a really broken file can't loop.
 */

export interface MessageWithAudio {
  uuid: string;
  audio_url: string | null;
}

export interface PageLike {
  data: MessageWithAudio[];
  meta: { current_page: number; last_page: number };
}

export interface UrlRefreshDeps {
  /** Refetches every cached message list (TanStack Query). */
  refetchCached: () => Promise<unknown>;
  /** Reads a message from the (just refetched) cache. */
  findCached: (uuid: string) => MessageWithAudio | null;
  /** Fallback: fetches a page of the "all" inbox directly. */
  fetchPage?: (page: number) => Promise<PageLike>;
  maxPages?: number;
}

/** A playable URL for `uuid` from the server, or null when the message is gone / still has no audio. */
export async function resolveFreshAudioUrl(uuid: string, deps: UrlRefreshDeps): Promise<string | null> {
  try {
    await deps.refetchCached();
  } catch {
    // Offline or transient: the cache may still hold a newer copy, and the fallback below may work.
  }
  const cached = deps.findCached(uuid);
  if (cached?.audio_url) return cached.audio_url;

  if (!deps.fetchPage) return null;
  const maxPages = deps.maxPages ?? 3;
  for (let page = 1; page <= maxPages; page += 1) {
    let result: PageLike;
    try {
      result = await deps.fetchPage(page);
    } catch {
      return null;
    }
    const found = result.data.find((m) => m.uuid === uuid);
    if (found) return found.audio_url;
    if (result.meta.current_page >= result.meta.last_page) break;
  }
  return null;
}

/** One automatic retry per message until it plays successfully again. */
export function createRetryGate() {
  const tried = new Set<string>();
  return {
    /** True the first time for `uuid`; false until `succeeded(uuid)`. */
    tryAcquire(uuid: string): boolean {
      if (tried.has(uuid)) return false;
      tried.add(uuid);
      return true;
    },
    succeeded(uuid: string) {
      tried.delete(uuid);
    },
    reset() {
      tried.clear();
    },
  };
}
