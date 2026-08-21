import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'fl_auth_token';

/**
 * The Sanctum bearer token — SecureStore only, never AsyncStorage
 * (AGENTS.md §3/§53).
 */
export const tokenStorage = {
  async get(): Promise<string | null> {
    return SecureStore.getItemAsync(TOKEN_KEY);
  },
  async set(token: string): Promise<void> {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  },
  async clear(): Promise<void> {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
  },
};
