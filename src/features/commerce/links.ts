import { env } from '@/utils/env';

/** Public web origin, derived from the API base (`…/api/v1`) — never hardcoded per screen. */
export function webBaseUrl(apiUrl: string = env.apiUrl): string {
  return apiUrl.replace(/\/api(\/v\d+)?\/?$/, '').replace(/\/$/, '');
}

export function productWebUrl(slug: string, apiUrl?: string): string {
  return `${webBaseUrl(apiUrl)}/store/${encodeURIComponent(slug)}`;
}
