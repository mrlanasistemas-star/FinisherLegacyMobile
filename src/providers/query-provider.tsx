import AsyncStorage from '@react-native-async-storage/async-storage';
import { createAsyncStoragePersister } from '@tanstack/query-async-storage-persister';
import { QueryClient, type Query } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import Constants from 'expo-constants';
import { useEffect, useState, type PropsWithChildren } from 'react';

import { AppError } from '@/api/errors';
import { useAuthStore } from '@/stores/authStore';

function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  if (error instanceof AppError) {
    if (error.status && error.status >= 400 && error.status < 500) return false;
    if (error.kind === 'network' || error.kind === 'timeout') return failureCount < 1;
  }
  return true;
}

/**
 * Read-only data worth having offline (reopening the app on a plane still
 * shows your Legacy, profile and last feed). Never money/cart/orders — those
 * must always be fresh — and never anything while logged out.
 */
const PERSISTED_ROOTS = new Set(['profile', 'medals', 'feed', 'athlete', 'moment', 'me', 'explore', 'events']);
const PERSIST_MAX_AGE = 1000 * 60 * 60 * 24; // 24h

function shouldPersist(query: Query): boolean {
  const root = query.queryKey[0];
  return query.state.status === 'success' && typeof root === 'string' && PERSISTED_ROOTS.has(root);
}

const persister = createAsyncStoragePersister({ storage: AsyncStorage, key: 'fl_query_cache', throttleTime: 2000 });

export function QueryProvider({ children }: PropsWithChildren) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: shouldRetry,
            staleTime: 30_000,
            gcTime: PERSIST_MAX_AGE,
            refetchOnWindowFocus: false,
          },
          mutations: { retry: false },
        },
      }),
  );

  // Whenever the session ends — explicit logout, expired token, account
  // deletion — drop every cached query and the persisted copy, so the next
  // person on this phone never sees the previous athlete's data.
  const status = useAuthStore((s) => s.status);
  useEffect(() => {
    if (status !== 'unauthenticated') return;
    client.clear();
    Promise.resolve(persister.removeClient()).catch(() => {});
  }, [client, status]);

  return (
    <PersistQueryClientProvider
      client={client}
      persistOptions={{
        persister,
        maxAge: PERSIST_MAX_AGE,
        // A new app version never reads a cache shaped by the old one.
        buster: Constants.expoConfig?.version ?? '1',
        dehydrateOptions: { shouldDehydrateQuery: shouldPersist },
      }}>
      {children}
    </PersistQueryClientProvider>
  );
}
