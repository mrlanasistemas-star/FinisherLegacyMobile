import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface UiState {
  hasSeenOnboarding: boolean;
  pendingDeepLink: string | null;
  /** Mascot guide tips already dismissed/shown — never re-shown (AGENTS.md §122). */
  seenTips: string[];
  setHasSeenOnboarding: (seen: boolean) => void;
  setPendingDeepLink: (href: string | null) => void;
  markTipSeen: (id: string) => void;
}

/**
 * Onboarding-seen and seen mascot tips are the only fields persisted here —
 * non-sensitive UI preferences, AsyncStorage is fine (AGENTS.md §53 only
 * forbids the auth token there). pendingDeepLink stays in-memory only.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      pendingDeepLink: null,
      seenTips: [],
      setHasSeenOnboarding: (seen) => set({ hasSeenOnboarding: seen }),
      setPendingDeepLink: (href) => set({ pendingDeepLink: href }),
      markTipSeen: (id) => set((state) => (state.seenTips.includes(id) ? state : { seenTips: [...state.seenTips, id] })),
    }),
    {
      name: 'fl_ui_prefs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ hasSeenOnboarding: state.hasSeenOnboarding, seenTips: state.seenTips }),
    },
  ),
);
