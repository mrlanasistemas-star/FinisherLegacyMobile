import type { FollowState, LegacyMoment, ReactionState, ReactionType } from '@/types/social';

/**
 * Pure state transitions for optimistic UI — the server response always
 * wins afterwards (`applyReactionState`), these only make the tap feel
 * instant and are unit-tested in isolation.
 */
export function toggleReaction(moment: LegacyMoment, type: ReactionType, active: boolean): LegacyMoment {
  const has = moment.my_reactions.includes(type);
  if (has === active) return moment;

  return {
    ...moment,
    my_reactions: active ? [...moment.my_reactions, type] : moment.my_reactions.filter((t) => t !== type),
    reactions: { ...moment.reactions, [type]: Math.max(0, moment.reactions[type] + (active ? 1 : -1)) },
  };
}

export function applyReactionState(moment: LegacyMoment, state: ReactionState): LegacyMoment {
  return { ...moment, reactions: state.reactions, my_reactions: state.my_reactions };
}

export function bumpComments(moment: LegacyMoment, delta: number): LegacyMoment {
  return { ...moment, comments_count: Math.max(0, moment.comments_count + delta) };
}

/** Optimistic follow toggle for a profile's counts. */
export function toggleFollowState(state: FollowState, follow: boolean): FollowState {
  if (state.is_following === follow) return state;
  return {
    ...state,
    is_following: follow,
    followers_count: Math.max(0, state.followers_count + (follow ? 1 : -1)),
  };
}

/** "10.5 km · 52:14 · 4:58 /km" — the metric line a Moment card shows. */
export function formatDuration(totalSeconds: number | null | undefined): string | null {
  if (totalSeconds === null || totalSeconds === undefined || totalSeconds <= 0) return null;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const mm = hours > 0 ? String(minutes).padStart(2, '0') : String(minutes);
  return `${hours > 0 ? `${hours}:` : ''}${mm}:${String(seconds).padStart(2, '0')}`;
}

export function momentMetricLine(moment: LegacyMoment): string[] {
  if (moment.activity) {
    return [moment.activity.distance, moment.activity.official_time, moment.activity.pace].filter((v): v is string => !!v);
  }
  if (moment.metrics) {
    const distance = moment.metrics.distance_km ? `${Number(moment.metrics.distance_km.toFixed(2))} km` : null;
    return [distance, formatDuration(moment.metrics.duration_seconds), moment.metrics.pace].filter((v): v is string => !!v);
  }
  return [];
}

/** Parses "h:mm:ss" / "mm:ss" typed by the athlete into seconds — null when invalid. */
export function parseDuration(input: string): number | null {
  const trimmed = input.trim();
  if (!/^\d{1,3}(:\d{1,2}){0,2}$/.test(trimmed)) return null;
  const parts = trimmed.split(':').map(Number);
  if (parts.slice(1).some((p) => p >= 60)) return null;
  const seconds = parts.reduce((acc, part) => acc * 60 + part, 0);
  return seconds > 0 ? seconds : null;
}

export const MOMENT_TYPE_LABEL: Record<LegacyMoment['type'], string> = {
  race_completed: 'Carrera terminada',
  medal_claimed: 'Nueva medalla',
  memory: 'Recuerdo',
  training: 'Entrenamiento',
  personal_record: 'Récord personal',
  gear: 'Nuevo gear',
  manual: 'Momento',
};

export const VISIBILITY_LABEL: Record<LegacyMoment['visibility'], string> = {
  public: 'Todos',
  followers: 'Seguidores',
  private: 'Solo yo',
};
