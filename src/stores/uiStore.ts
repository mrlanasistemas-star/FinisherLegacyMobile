import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface UiState {
  hasSeenOnboarding: boolean;
  pendingDeepLink: string | null;
  /** Mascot guide tips already dismissed/shown — never re-shown (AGENTS.md §122). */
  seenTips: string[];
  /**
   * The `PushDevice.uuid` this install last registered with `POST
   * /me/push-devices`, so Settings can offer "desactivar" later. There is
   * no `GET /me/push-devices` list endpoint (confirmed reading
   * `Me\PushDeviceController` — only store/destroy exist) — without
   * remembering this locally, the app would have no way to know which
   * device row on the backend is "this phone" to delete it again.
   */
  pushDeviceUuid: string | null;
  setHasSeenOnboarding: (seen: boolean) => void;
  setPendingDeepLink: (href: string | null) => void;
  markTipSeen: (id: string) => void;
  setPushDeviceUuid: (uuid: string | null) => void;
}

/**
 * Onboarding-seen, seen mascot tips, and the local push device uuid are the
 * only fields persisted here — non-sensitive UI/local-device preferences,
 * AsyncStorage is fine (AGENTS.md §53 only forbids the auth token there).
 * pendingDeepLink stays in-memory only.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      pendingDeepLink: null,
      seenTips: [],
      pushDeviceUuid: null,
      setHasSeenOnboarding: (seen) => set({ hasSeenOnboarding: seen }),
      setPendingDeepLink: (href) => set({ pendingDeepLink: href }),
      markTipSeen: (id) => set((state) => (state.seenTips.includes(id) ? state : { seenTips: [...state.seenTips, id] })),
      setPushDeviceUuid: (uuid) => set({ pushDeviceUuid: uuid }),
    }),
    {
      name: 'fl_ui_prefs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        hasSeenOnboarding: state.hasSeenOnboarding,
        seenTips: state.seenTips,
        pushDeviceUuid: state.pushDeviceUuid,
      }),
    },
  ),
);
