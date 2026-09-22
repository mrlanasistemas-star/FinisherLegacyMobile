import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { EventGearSelection } from '@/types/models';

export async function fetchEventGear(participantId: number): Promise<EventGearSelection[]> {
  try {
    const { data } = await apiClient.get<{ data: EventGearSelection[] }>(`me/events/${participantId}/gear`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function addEventGear(
  participantId: number,
  athleteOwnedProductUuid: string,
  notes?: string,
): Promise<EventGearSelection> {
  try {
    const { data } = await apiClient.post<{ data: EventGearSelection }>(`me/events/${participantId}/gear`, {
      athlete_owned_product_uuid: athleteOwnedProductUuid,
      notes,
    });
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function removeEventGear(participantId: number, gearUuid: string): Promise<void> {
  try {
    await apiClient.delete(`me/events/${participantId}/gear/${gearUuid}`);
  } catch (error) {
    throw toAppError(error);
  }
}
