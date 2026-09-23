/**
 * Every TanStack Query key the app uses, in one place — so invalidation
 * targets exactly what changed (a reaction touches `moment` + feeds, never
 * the store).
 */
export const queryKeys = {
  feed: (scope: 'following' | 'discover') => ['feed', scope] as const,
  feedAll: ['feed'] as const,
  explore: ['explore'] as const,
  search: (q: string, type: string) => ['search', q, type] as const,

  athlete: (username: string) => ['athlete', username] as const,
  athleteMoments: (username: string) => ['athlete', username, 'moments'] as const,
  followers: (username: string) => ['followers', username] as const,
  following: (username: string) => ['following', username] as const,
  blocks: ['blocks'] as const,

  moment: (uuid: string) => ['moment', uuid] as const,
  momentComments: (uuid: string) => ['moment', uuid, 'comments'] as const,

  profile: ['profile'] as const,
  notifications: ['me', 'notifications'] as const,

  products: (filters: object) => ['store', 'products', filters] as const,
  product: (slug: string) => ['store', 'product', slug] as const,
  cart: ['cart'] as const,
  orders: ['orders'] as const,
  order: (uuid: string) => ['orders', uuid] as const,

  mediaEntitlement: (participantId: number) => ['me', 'events', participantId, 'media-entitlement'] as const,
};
