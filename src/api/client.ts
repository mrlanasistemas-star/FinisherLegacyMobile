import axios from 'axios';

import { tokenStorage } from '@/api/secureStore';
import { useAuthStore } from '@/stores/authStore';
import { env } from '@/utils/env';
import { logger } from '@/utils/logger';
import { uuidv4 } from '@/utils/uuid';

import { toAppError } from './errors';

// axios's default export intentionally also carries `create` — standard
// usage, not an accidental named/default mix-up.
// eslint-disable-next-line import/no-named-as-default-member
export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
  headers: {
    Accept: 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Server reuses this id if present (AssignRequestId middleware) so a
  // failed request can be traced end-to-end in our own logs too.
  config.headers['X-Request-ID'] = uuidv4();

  logger.debug(`-> ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

let handlingUnauthorized = false;

apiClient.interceptors.response.use(
  (response) => {
    logger.debug(`<- ${response.status} ${response.config.url}`);
    return response;
  },
  async (error) => {
    const appError = toAppError(error);
    logger.debug(`x ${appError.status ?? 'ERR'} ${error.config?.url} — ${appError.message}`, {
      requestId: appError.requestId,
    });

    if (appError.kind === 'unauthenticated' && useAuthStore.getState().status === 'authenticated' && !handlingUnauthorized) {
      handlingUnauthorized = true;
      await tokenStorage.clear();
      useAuthStore.getState().clearSession();
      handlingUnauthorized = false;
    }

    return Promise.reject(error);
  },
);
