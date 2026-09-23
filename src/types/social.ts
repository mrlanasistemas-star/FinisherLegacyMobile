/**
 * Legacy Moments social layer — mirrors the real Resources in
 * finisherLegacy/app/Http/Resources/Api/V1/{AthleteResource,MomentResource,
 * MomentCommentResource}.php and the social controllers.
 */

export type MomentType =
  | 'race_completed'
  | 'medal_claimed'
  | 'memory'
  | 'training'
  | 'personal_record'
  | 'gear'
  | 'manual';

export type MomentVisibility = 'public' | 'followers' | 'private';

export type ReactionType = 'like' | 'cheer';

export interface AthleteSummary {
  username: string | null;
  name: string;
  photo_url: string | null;
  city: string | null;
  /** Present only in lists where the server resolved it for the viewer. */
  is_following?: boolean;
}

export interface MomentActivity {
  /** Only for the author — the id `/my-events/[participantId]` uses. */
  participant_id: number | null;
  event: string | null;
  event_slug: string | null;
  edition: string | null;
  event_date: string | null;
  race: string | null;
  distance: string | null;
  official_time: string | null;
  pace: string | null;
  overall_position: number | null;
}

export interface MomentMetrics {
  title: string | null;
  distance_km: number | null;
  duration_seconds: number | null;
  /** Server-computed ("5:00 /km"), never client-side. */
  pace: string | null;
  is_personal_record: boolean;
}

export interface MomentMedia {
  type: 'image' | 'video';
  url: string;
  width: number | null;
  height: number | null;
}

export interface MomentReactionCounts {
  like: number;
  cheer: number;
}

export interface LegacyMoment {
  uuid: string;
  type: MomentType;
  caption: string | null;
  visibility: MomentVisibility;
  created_at: string;
  is_owner: boolean;
  author: AthleteSummary;
  activity: MomentActivity | null;
  medal: { uuid: string; title: string | null; image_url: string | null } | null;
  gear: { uuid: string; product_name: string | null } | null;
  metrics: MomentMetrics | null;
  media: MomentMedia[];
  reactions: MomentReactionCounts;
  my_reactions: ReactionType[];
  comments_count: number;
}

export interface MomentComment {
  uuid: string;
  body: string;
  created_at: string;
  author: AthleteSummary;
  can_delete: boolean;
}

/** PUT/DELETE /moments/{uuid}/reactions/{type} response. */
export interface ReactionState {
  reactions: MomentReactionCounts;
  my_reactions: ReactionType[];
}

/** POST/DELETE /athletes/{username}/follow response. */
export interface FollowState {
  is_following: boolean;
  followers_count: number;
  following_count: number;
}

/** Cursor-paginated `/feed`, `/athletes/{username}/moments`. */
export interface CursorPage<T> {
  data: T[];
  meta: { next_cursor: string | null; prev_cursor: string | null; per_page: number; scope?: string };
}

export interface ExplorePayload {
  athletes: AthleteSummary[];
  moments: LegacyMoment[];
  events: import('./models').EventEditionCard[];
}

export interface SearchResults {
  query: string;
  athletes: AthleteSummary[];
  events: import('./models').EventEditionCard[];
  products: import('./models').ProductSummary[];
}

export type ReportTargetType = 'profile' | 'moment' | 'comment';
export type ReportReason = 'spam' | 'harassment' | 'inappropriate' | 'impersonation' | 'other';

/** What the composer sends to POST /moments (multipart when photos exist). */
export interface CreateMomentInput {
  type: MomentType;
  caption?: string;
  visibility: MomentVisibility;
  event_participant_id?: number;
  medal_uuid?: string;
  gear_uuid?: string;
  event_media_uuids?: string[];
  photos?: { uri: string; name: string; type: string }[];
  metrics?: {
    title?: string;
    distance_km?: number;
    duration_seconds?: number;
    is_personal_record?: boolean;
  };
}
