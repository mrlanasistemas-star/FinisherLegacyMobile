import type { FollowState, LegacyMoment, ReactionState, ReactionType } from '@/types/social';
import { t } from '@/i18n';

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
  // A shared training workout without `metrics`: read its own numbers,
  // tolerating any missing/invalid field (never invents a value).
  const training = moment.training;
  if (training) {
    const meters = typeof training.distance_m === 'number' && training.distance_m > 0 ? training.distance_m : null;
    const distance = meters ? `${Number((meters / 1000).toFixed(2))} km` : null;
    const duration = typeof training.duration_s === 'number' ? formatDuration(Math.round(training.duration_s)) : null;
    return [distance, duration, training.pace ?? null].filter((v): v is string => !!v);
  }
  return [];
}

/**
 * Headline for a training Moment: the workout title, else its sport, else
 * the generic label — so a training post never renders an empty card.
 */
export function trainingHeadline(moment: LegacyMoment): string | null {
  const training = moment.training;
  if (!training && moment.type !== 'training') return null;
  const manual = training?.source === 'manual';
  const base = training?.title?.trim() || training?.sport?.trim() || t('Entrenamiento');
  return manual ? `${base} · ${t('Registrado a mano')}` : base;
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

/** A function, not a table: the label is resolved in the language active when it is shown. */
export function momentTypeLabel(type: LegacyMoment['type']): string {
  switch (type) {
    case 'race_completed':
      return t('Carrera terminada');
    case 'medal_claimed':
      return t('Nueva medalla');
    case 'memory':
      return t('Recuerdo');
    case 'training':
      return t('Entrenamiento');
    case 'personal_record':
      return t('Récord personal');
    case 'gear':
      return t('Nuevo gear');
    case 'photo':
      return t('Foto');
    case 'legacy_plate':
      return t('Legacy Plate');
    default:
      return t('Momento');
  }
}

export function visibilityLabel(visibility: LegacyMoment['visibility']): string {
  switch (visibility) {
    case 'followers':
      return t('Seguidores');
    case 'private':
      return t('Solo yo');
    default:
      return t('Todos||quién puede verlo: cualquier persona');
  }
}
