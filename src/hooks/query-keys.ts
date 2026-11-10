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
  myGear: ['me', 'gear'] as const,
  myEventsAll: ['me', 'events'] as const,
  supportSessions: ['me', 'support-sessions'] as const,

  /** Not persisted (root `nfc`): a tap must always reflect the tag's current owner. */
  nfc: (token: string, authenticated: boolean) => ['nfc', token, authenticated ? 'auth' : 'guest'] as const,

  products: (filters: object) => ['store', 'products', filters] as const,
  product: (slug: string) => ['store', 'product', slug] as const,
  collections: ['store', 'collections'] as const,
  collection: (slug: string) => ['store', 'collections', slug] as const,
  cart: ['cart'] as const,
  orders: ['orders'] as const,
  order: (uuid: string) => ['orders', uuid] as const,

  mediaEntitlement: (participantId: number) => ['me', 'events', participantId, 'media-entitlement'] as const,

  /** Not persisted (root `training`): audio URLs are signed and expire. Offline audio lives in features/training/offline-cache. */
  training: ['training'] as const,
  trainingMessagesAll: ['training', 'messages'] as const,
  trainingMessages: (filter: 'all' | 'unheard' | 'favorites') => ['training', 'messages', filter] as const,
  trainingLinks: ['training', 'links'] as const,
};
