import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface UiState {
  hasSeenOnboarding: boolean;
  pendingDeepLink: string | null;
  setHasSeenOnboarding: (seen: boolean) => void;
  setPendingDeepLink: (href: string | null) => void;
}

/**
 * Onboarding-seen is the only field persisted here — non-sensitive UI
 * preference, AsyncStorage is fine (AGENTS.md §53 only forbids the auth
 * token there). pendingDeepLink stays in-memory only.
 */
export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      hasSeenOnboarding: false,
      pendingDeepLink: null,
      setHasSeenOnboarding: (seen) => set({ hasSeenOnboarding: seen }),
      setPendingDeepLink: (href) => set({ pendingDeepLink: href }),
    }),
    {
      name: 'fl_ui_prefs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ hasSeenOnboarding: state.hasSeenOnboarding }),
    },
  ),
);
