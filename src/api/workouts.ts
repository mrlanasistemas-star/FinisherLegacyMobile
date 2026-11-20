import { apiClient } from '@/api/client';
import { toAppError } from '@/api/errors';
import {
  parseNullableWorkout,
  parseShareResult,
  parseWorkout,
  parseWorkoutSports,
  parseWorkoutsPage,
  parseWorkoutStats,
  type FinishWorkoutInput,
  type ManualWorkoutInput,
  type StartWorkoutInput,
  type Workout,
  type WorkoutPeriod,
  type WorkoutSource,
  type WorkoutSport,
  type WorkoutsPage,
  type WorkoutStats,
} from '@/schemas/workouts';

/**
 * Modo entrenamiento endpoints (`/api/v1/training/sports`,
 * `/api/v1/training/workouts/*`). Laravel is the single source of truth;
 * the phone only keeps the running workout and an offline outbox
 * (features/training/workout). Every response goes through the zod parsers
 * in `schemas/workouts.ts`.
 */

const path = (uuid: string, suffix = '') => `training/workouts/${encodeURIComponent(uuid)}${suffix}`;

export async function fetchWorkoutSports(): Promise<WorkoutSport[]> {
  try {
    const { data } = await apiClient.get('training/sports');
    return parseWorkoutSports(data);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function fetchWorkouts(page: number, source?: WorkoutSource): Promise<WorkoutsPage> {
  try {
    const { data } = await apiClient.get('training/workouts', { params: { page, ...(source ? { source } : {}) } });
    return parseWorkoutsPage(data);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function fetchActiveWorkout(): Promise<Workout | null> {
  try {
    const { data } = await apiClient.get('training/workouts/active');
    return parseNullableWorkout(data);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function fetchWorkoutStats(period: WorkoutPeriod): Promise<WorkoutStats> {
  try {
    const { data } = await apiClient.get('training/workouts/stats', { params: { period } });
    return parseWorkoutStats(data);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function fetchWorkout(uuid: string): Promise<Workout> {
  try {
    const { data } = await apiClient.get(path(uuid));
    return parseWorkout(data);
  } catch (error) {
    throw toAppError(error);
  }
}

/** Live start or manual entry. 409 `workout_in_progress` when another live workout is open. */
export async function createWorkout(input: StartWorkoutInput | ManualWorkoutInput): Promise<Workout> {
  try {
    const { data } = await apiClient.post('training/workouts', input);
    return parseWorkout(data);
  } catch (error) {
    throw toAppError(error);
  }
}

/** Heartbeat of a running workout, or an edit of a finished one. */
export async function updateWorkout(
  uuid: string,
  input: Partial<{ duration_s: number; distance_m: number | null; moving_s: number | null; notes: string | null; visibility: string; sport_id: number }>,
): Promise<Workout> {
  try {
    const { data } = await apiClient.patch(path(uuid), input);
    return parseWorkout(data);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function finishWorkout(uuid: string, input: FinishWorkoutInput): Promise<Workout> {
  try {
    const { data } = await apiClient.post(path(uuid, '/finish'), input, { timeout: 30_000 });
    return parseWorkout(data);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function discardWorkout(uuid: string): Promise<Workout> {
  try {
    const { data } = await apiClient.post(path(uuid, '/discard'));
    return parseWorkout(data);
  } catch (error) {
    throw toAppError(error);
  }
}

export async function deleteWorkout(uuid: string): Promise<void> {
  try {
    await apiClient.delete(path(uuid));
  } catch (error) {
    throw toAppError(error);
  }
}

/** Explicit "Compartir como Legacy Moment" — private unless the athlete picks otherwise. */
export async function shareWorkout(uuid: string, input: { visibility: 'private' | 'followers' | 'public'; caption?: string | null }) {
  try {
    const { data } = await apiClient.post(path(uuid, '/share'), input);
    return parseShareResult(data);
  } catch (error) {
    throw toAppError(error);
  }
}

/**
 * "Compartir con mi familia": opens (or reuses) the workout's live tracking
 * session. Nothing is shared yet — the athlete then picks who on
 * `/family/sharing` (tracking/sessions/{uuid}/sharing).
 */
export async function openWorkoutLiveSession(uuid: string): Promise<{ trackingSessionUuid: string; startedAt: string; batchMax: number }> {
  try {
    const { data } = await apiClient.post(path(uuid, '/live'));
    const body = data?.data ?? {};
    if (typeof body.tracking_session_uuid !== 'string') throw new Error('invalid live session response');
    return {
      trackingSessionUuid: body.tracking_session_uuid,
      startedAt: typeof body.started_at === 'string' ? body.started_at : new Date().toISOString(),
      batchMax: Number(body.batch_max) || 100,
    };
  } catch (error) {
    throw toAppError(error);
  }
}
