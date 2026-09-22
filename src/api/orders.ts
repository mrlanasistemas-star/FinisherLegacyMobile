import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import type { Order } from '@/types/models';

const ORDERS_PER_PAGE = 20; // hardcoded server-side (Order::query()->paginate(20)) — see note below.

/**
 * `GET /orders` has a confirmed backend bug: `OrderController::index`
 * builds `OrderResource::collection($orders)` (a paginator-backed
 * collection) but never calls `->response()` on it like every other
 * paginated list in this API does — so the JSON response drops ALL
 * pagination metadata (no `links`, no `meta.total`/`last_page`), leaving
 * only a flat `data: Order[]` array for whatever page Laravel resolved
 * from `?page=`. The backend DOES still honor `?page=N` server-side
 * (paginate() reads the query string itself), it just never tells the
 * client whether another page exists. We work around this honestly: fetch
 * with `page`, and treat a full page of exactly `ORDERS_PER_PAGE` rows as
 * "there might be more" — never fabricate a total. See
 * docs/MOBILE_BACKEND_REQUIREMENTS.md for the one-line fix
 * (`OrderResource::collection($orders)->response()`, matching
 * MedalController/EventController).
 */
export async function fetchOrders(page = 1): Promise<{ rows: Order[]; hasMore: boolean }> {
  try {
    const { data } = await apiClient.get<{ data: Order[] }>('orders', { params: { page } });
    return { rows: data.data, hasMore: data.data.length === ORDERS_PER_PAGE };
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
