import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { PaginatedResponse } from '@/types/api';
import type { Order } from '@/types/models';

/** Standard Laravel resource pagination — `{data, links, meta}`. */
export async function fetchOrders(page = 1): Promise<PaginatedResponse<Order>> {
  try {
    const { data } = await apiClient.get<PaginatedResponse<Order>>('orders', { params: { page } });
    return data;
  } catch (error) {
    throw toAppError(error);
  }
}

export async function fetchOrder(uuid: string): Promise<Order> {
  try {
    const { data } = await apiClient.get<{ data: Order }>(`orders/${uuid}`);
    return data.data;
  } catch (error) {
    throw toAppError(error);
  }
}
