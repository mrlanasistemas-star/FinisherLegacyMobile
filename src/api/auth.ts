import { apiClient } from './client';
import { toAppError } from './errors';

import type { ApiSuccessEnvelope } from '@/types/api';
import type { AuthPayload, LoginInput, RegisterInput } from '@/types/auth';
import type { User } from '@/types/models';

export async function registerRequest(input: RegisterInput): Promise<AuthPayload> {
  try {
    const { data } = await apiClient.post<ApiSuccessEnvelope<AuthPayload>>('auth/register', input);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function loginRequest(input: LoginInput): Promise<AuthPayload> {
  try {
    const { data } = await apiClient.post<ApiSuccessEnvelope<AuthPayload>>('auth/login', input);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function logoutRequest(): Promise<void> {
  try {
    await apiClient.post('auth/logout');
  } catch (error) {
    throw toAppError(error);
  }
}

export async function fetchMeRequest(): Promise<User> {
  try {
    const { data } = await apiClient.get<ApiSuccessEnvelope<User>>('me');
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}
