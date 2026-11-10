import AsyncStorage from '@react-native-async-storage/async-storage';
import type * as FileSystem from 'expo-file-system';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { TrainingMessage } from '@/schemas/training';

/**
 * "Disponible sin conexión": voice messages copied to the app's document
 * directory so a workout works without signal. The audio URLs are signed
 * and expire, so downloads happen right after a fresh fetch. The index
 * (uuid → local file + a snapshot of the message) is persisted in
 * AsyncStorage; it holds only what this athlete already received, and is
 * wiped at logout (`clearOfflineCache`).
 *
 * expo-file-system is required lazily, like the other native drivers, so a
 * binary without it just reports downloads as unavailable.
 */

type FsModule = typeof FileSystem;
let fsCache: { mod: FsModule | null } | null = null;

function fs(): FsModule | null {
  if (fsCache) return fsCache.mod;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-file-system') as FsModule;
    fsCache = { mod: typeof mod?.File?.downloadFileAsync === 'function' ? mod : null };
  } catch {
    fsCache = { mod: null };
  }
  return fsCache.mod;
}

export function isOfflineAvailable(): boolean {
  return fs() !== null;
}

const FOLDER = 'training-audio';

function folder(mod: FsModule) {
  const dir = new mod.Directory(mod.Paths.document, FOLDER);
  if (!dir.exists) dir.create({ intermediates: true, idempotent: true });
  return dir;
}

/** Keeps the original container extension when the URL reveals it (m4a, mp3, aac, webm, ogg, wav). */
function extensionFor(url: string): string {
  const match = url.split('?')[0]?.match(/\.(m4a|mp3|aac|webm|ogg|oga|opus|wav|mp4)$/i);
  return match ? match[1].toLowerCase() : 'm4a';
}

export interface OfflineEntry {
  fileUri: string;
  message: TrainingMessage;
  savedAt: string;
}

interface OfflineState {
  entries: Record<string, OfflineEntry>;
  /** In-memory only: uuids currently downloading. */
  downloading: Record<string, true>;
  setEntry: (uuid: string, entry: OfflineEntry | null) => void;
  setDownloading: (uuid: string, on: boolean) => void;
  patchMessage: (uuid: string, patch: Partial<TrainingMessage>) => void;
  reset: () => void;
}

export const useOfflineStore = create<OfflineState>()(
  persist(
    (set) => ({
      entries: {},
      downloading: {},
      setEntry: (uuid, entry) =>
        set((state) => {
          const entries = { ...state.entries };
          if (entry) entries[uuid] = entry;
          else delete entries[uuid];
          return { entries };
        }),
      setDownloading: (uuid, on) =>
        set((state) => {
          const downloading = { ...state.downloading };
          if (on) downloading[uuid] = true;
          else delete downloading[uuid];
          return { downloading };
        }),
      patchMessage: (uuid, patch) =>
        set((state) => {
          const entry = state.entries[uuid];
          if (!entry) return state;
          return { entries: { ...state.entries, [uuid]: { ...entry, message: { ...entry.message, ...patch } } } };
        }),
      reset: () => set({ entries: {}, downloading: {} }),
    }),
    {
      name: 'fl_training_offline_v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ entries: state.entries }),
    },
  ),
);

/** Local file for a message, only if it is still on disk. */
export function localAudioUri(uuid: string): string | null {
  const entry = useOfflineStore.getState().entries[uuid];
  if (!entry) return null;
  const mod = fs();
  if (!mod) return null;
  try {
    const file = new mod.File(entry.fileUri);
    return file.exists ? file.uri : null;
  } catch {
    return null;
  }
}

/** Downloads one voice message. Text-only messages are stored as a snapshot (nothing to download). */
export async function downloadMessage(message: TrainingMessage): Promise<boolean> {
  const store = useOfflineStore.getState();
  if (store.downloading[message.uuid]) return false;
  const savedAt = new Date().toISOString();

  if (!message.audio_url) {
    store.setEntry(message.uuid, { fileUri: '', message, savedAt });
    return true;
  }
  const mod = fs();
  if (!mod) return false;

  store.setDownloading(message.uuid, true);
  try {
    const target = new mod.File(folder(mod), `${message.uuid}.${extensionFor(message.audio_url)}`);
    const file = await mod.File.downloadFileAsync(message.audio_url, target, { idempotent: true });
    useOfflineStore.getState().setEntry(message.uuid, { fileUri: file.uri, message, savedAt });
    return true;
  } catch {
    return false;
  } finally {
    useOfflineStore.getState().setDownloading(message.uuid, false);
  }
}

/** Sequential on purpose: gentle on mobile data, and each signed URL is used right away. */
export async function downloadAll(messages: TrainingMessage[]): Promise<{ ok: number; failed: number }> {
  let ok = 0;
  let failed = 0;
  for (const message of messages) {
    if (useOfflineStore.getState().entries[message.uuid]) continue;
    if (await downloadMessage(message)) ok += 1;
    else failed += 1;
  }
  return { ok, failed };
}

export function removeDownload(uuid: string): void {
  const entry = useOfflineStore.getState().entries[uuid];
  if (entry?.fileUri) {
    const mod = fs();
    try {
      if (mod) {
        const file = new mod.File(entry.fileUri);
        if (file.exists) file.delete();
      }
    } catch {
      // Already gone — the index is what matters.
    }
  }
  useOfflineStore.getState().setEntry(uuid, null);
}

/** Logout / account switch: no audio of one athlete stays for the next. */
export function clearOfflineCache(): void {
  const mod = fs();
  try {
    if (mod) {
      const dir = new mod.Directory(mod.Paths.document, FOLDER);
      if (dir.exists) dir.delete();
    }
  } catch {
    // Best effort.
  }
  useOfflineStore.getState().reset();
}

/** Downloaded messages, newest first — the inbox when there is no signal. */
export function offlineMessages(entries: Record<string, OfflineEntry>): TrainingMessage[] {
  return Object.values(entries)
    .map((entry) => entry.message)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}
