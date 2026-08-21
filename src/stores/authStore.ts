import { create } from 'zustand';

import type { User } from '@/types/models';

export type SessionStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

interface AuthState {
  status: SessionStatus;
  user: User | null;
  token: string | null;
  setSession: (user: User, token: string) => void;
  setUser: (user: User) => void;
  clearSession: () => void;
  finishBootstrap: (session: { user: User; token: string } | null) => void;
}

/**
 * Session metadata only — never a cache of server data TanStack Query
 * already owns (AGENTS.md §54).
 */
export const useAuthStore = create<AuthState>((set) => ({
  status: 'bootstrapping',
  user: null,
  token: null,
  setSession: (user, token) => set({ status: 'authenticated', user, token }),
  setUser: (user) => set({ user }),
  clearSession: () => set({ status: 'unauthenticated', user: null, token: null }),
  finishBootstrap: (session) =>
    set(
      session
        ? { status: 'authenticated', user: session.user, token: session.token }
        : { status: 'unauthenticated', user: null, token: null },
    ),
}));
