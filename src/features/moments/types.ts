/**
 * Anticipated shape for a "Legacy Moment" — a race, result, medal, photo/
 * video, or milestone shared to a future community feed. NOT backed by any
 * real endpoint today — see `src/features/community/flags.ts` and
 * docs/MOBILE_BACKEND_REQUIREMENTS.md → "COMUNIDAD / LEGACY MOMENTS".
 * Deliberately modeled as something DERIVED from an existing Medal/Event
 * Media/participation rather than a parallel content type, matching how
 * the product brief frames it ("no otro Instagram").
 */

export interface LegacyMomentMedia {
  type: 'image' | 'video';
  url: string;
  poster_url: string | null;
}

export interface LegacyMoment {
  uuid: string;
  athlete_username: string;
  caption: string | null;
  visibility: 'public' | 'private';
  media: LegacyMomentMedia[];
  like_count: number;
  liked_by_me: boolean;
  comment_count: number;
  created_at: string;
}
