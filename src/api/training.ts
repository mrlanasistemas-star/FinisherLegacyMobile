import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import {
  parseTrainingLink,
  parseTrainingLinks,
  parseTrainingMessagesPage,
  type CreateTrainingLinkInput,
  type TrainingFilter,
  type TrainingLink,
  type TrainingMessagesPage,
} from '@/schemas/training';

/**
 * Entrenamientos endpoints (`/api/v1/training/*`): the athlete's inbox of
 * "Envíame ánimo" messages and the share links that collect them. Every
 * response goes through the zod parsers in `schemas/training.ts`.
 */

export async function fetchTrainingMessages(filter: TrainingFilter, page: number): Promise<TrainingMessagesPage> {
  try {
    const { data } = await apiClient.get('training/messages', { params: { filter, page } });
    return parseTrainingMessagesPage(data);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function markTrainingMessageListened(uuid: string): Promise<void> {
  try {
    await apiClient.post(`training/messages/${encodeURIComponent(uuid)}/listened`);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function setTrainingMessageFavorite(uuid: string, favorite: boolean): Promise<void> {
  try {
    await apiClient.post(`training/messages/${encodeURIComponent(uuid)}/favorite`, { favorite });
  } catch (error) {
    throw toAppError(error);
  }
}

/** "Ocultar": removes the message from the athlete's inbox. */
export async function deleteTrainingMessage(uuid: string): Promise<void> {
  try {
    await apiClient.delete(`training/messages/${encodeURIComponent(uuid)}`);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function blockTrainingSender(uuid: string): Promise<void> {
  try {
    await apiClient.post(`training/messages/${encodeURIComponent(uuid)}/block-sender`);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function fetchTrainingLinks(): Promise<TrainingLink[]> {
  try {
    const { data } = await apiClient.get('training/links');
    return parseTrainingLinks(data);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function createTrainingLink(input: CreateTrainingLinkInput): Promise<TrainingLink> {
  try {
    const body: { title: string; expires_in_days?: number } = { title: input.title };
    if (input.expires_in_days) body.expires_in_days = input.expires_in_days;
    const { data } = await apiClient.post('training/links', body);
    return parseTrainingLink(data);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function revokeTrainingLink(uuid: string): Promise<void> {
  try {
    await apiClient.delete(`training/links/${encodeURIComponent(uuid)}`);
  } catch (error) {
    throw toAppError(error);
  }
}
