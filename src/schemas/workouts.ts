import { z } from 'zod';

/**
 * Zod contract for Modo entrenamiento (`/training/sports`,
 * `/training/workouts/*`) — docs/renovacion/entrenamientos.md in the
 * backend. Responses are parsed, never cast; numbers the server may leave
 * null (pace without enough data, distance without GPS) stay null so the UI
 * shows "—" instead of a made-up value.
 */

const nullableNumber = z.coerce.number().nullish().transform((v) => (typeof v === 'number' && Number.isFinite(v) ? v : null));
const nullableString = z.string().nullish().transform((v) => v ?? null);

export const workoutSportSchema = z.object({
  id: z.coerce.number().int(),
  name: z.string(),
  slug: z.string(),
  /** Outdoor by default (GPS on); the athlete can still switch it. */
  gps_default: z.boolean().catch(false),
  /** `speed` (km/h) for cycling, `pace` (min/km) for everything else. */
  metric: z.enum(['pace', 'speed']).catch('pace'),
});
export type WorkoutSport = z.infer<typeof workoutSportSchema>;

export const WORKOUT_SOURCES = ['live', 'manual'] as const;
export type WorkoutSource = (typeof WORKOUT_SOURCES)[number];
export const WORKOUT_VISIBILITIES = ['private', 'followers', 'public'] as const;
export type WorkoutVisibility = (typeof WORKOUT_VISIBILITIES)[number];

export const workoutSchema = z.object({
  uuid: z.string().min(1),
  client_uuid: nullableString,
  source: z.enum(WORKOUT_SOURCES),
  status: z.enum(['in_progress', 'completed', 'discarded']),
  sport: z
    .object({ id: z.coerce.number(), name: z.string(), slug: z.string(), gps_default: z.boolean().catch(false), metric: z.enum(['pace', 'speed']).catch('pace') })
    .nullish()
    .transform((v) => v ?? null),
  uses_gps: z.boolean().catch(false),
  started_at: z.string(),
  ended_at: nullableString,
  duration_s: z.coerce.number().int().nonnegative().catch(0),
  moving_s: nullableNumber,
  distance_m: nullableNumber,
  elevation_gain_m: nullableNumber,
  avg_speed_mps: nullableNumber,
  avg_pace_s_per_km: nullableNumber,
  best_5k_s: nullableNumber,
  best_10k_s: nullableNumber,
  route_points_count: z.coerce.number().int().catch(0),
  route_polyline: nullableString,
  notes: nullableString,
  visibility: z.enum(WORKOUT_VISIBILITIES).catch('private'),
  auto_closed: z.boolean().catch(false),
  last_heartbeat_at: nullableString,
  moment: z
    .object({ uuid: z.string(), visibility: z.string() })
    .nullish()
    .transform((v) => v ?? null),
});
export type Workout = z.infer<typeof workoutSchema>;

const envelope = <T extends z.ZodTypeAny>(data: T) => z.object({ data, message: z.string().nullish() });

export const workoutsPageSchema = z.object({
  data: z.array(z.unknown()).transform((rows) => rows.flatMap((row) => {
    const parsed = workoutSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  })),
  meta: z.object({
    current_page: z.coerce.number().int().min(1),
    last_page: z.coerce.number().int().min(1),
    total: z.coerce.number().int().min(0),
  }),
});
export type WorkoutsPage = z.infer<typeof workoutsPageSchema>;

const recordSchema = z
  .object({ uuid: z.string(), value: z.coerce.number(), started_at: z.string() })
  .nullish()
  .transform((v) => v ?? null);

export const WORKOUT_PERIODS = ['week', 'month', 'year', 'all'] as const;
export type WorkoutPeriod = (typeof WORKOUT_PERIODS)[number];

export const workoutStatsSchema = z.object({
  period: z.enum(WORKOUT_PERIODS),
  totals: z.object({
    workouts: z.coerce.number().int(),
    duration_s: z.coerce.number(),
    distance_m: z.coerce.number(),
    live: z.coerce.number().int(),
    manual: z.coerce.number().int(),
  }),
  by_sport: z.array(
    z.object({
      sport: z.object({ id: z.coerce.number(), name: z.string(), slug: z.string() }).nullish().transform((v) => v ?? null),
      workouts: z.coerce.number().int(),
      duration_s: z.coerce.number(),
      distance_m: z.coerce.number(),
    }),
  ),
  records: z.object({
    longest_distance: recordSchema,
    longest_duration: recordSchema,
    best_5k: recordSchema,
    best_10k: recordSchema,
  }),
});
export type WorkoutStats = z.infer<typeof workoutStatsSchema>;

export const parseWorkout = (raw: unknown): Workout => envelope(workoutSchema).parse(raw).data;
export const parseNullableWorkout = (raw: unknown): Workout | null => envelope(workoutSchema.nullable()).parse(raw).data;
export const parseWorkoutsPage = (raw: unknown): WorkoutsPage => workoutsPageSchema.parse(raw);
export const parseWorkoutStats = (raw: unknown): WorkoutStats => envelope(workoutStatsSchema).parse(raw).data;
export const parseWorkoutSports = (raw: unknown): WorkoutSport[] =>
  envelope(z.array(z.unknown())).parse(raw).data.flatMap((row) => {
    const parsed = workoutSportSchema.safeParse(row);
    return parsed.success ? [parsed.data] : [];
  });
export const parseShareResult = (raw: unknown): { workout: Workout; moment: { uuid: string; visibility: string } } =>
  envelope(z.object({ workout: workoutSchema, moment: z.object({ uuid: z.string(), visibility: z.string() }) })).parse(raw).data;

/** Body of a live start (`source = live`) — `client_uuid` makes retries idempotent. */
export interface StartWorkoutInput {
  source: 'live';
  sport_id: number;
  uses_gps: boolean;
  client_uuid: string;
  started_at: string;
}

/** Body of "Registrar actividad pasada" (`source = manual`). */
export interface ManualWorkoutInput {
  source: 'manual';
  sport_id: number;
  client_uuid: string;
  started_at: string;
  duration_s: number;
  distance_m?: number | null;
  notes?: string | null;
}

export interface FinishWorkoutInput {
  duration_s: number;
  ended_at: string;
  moving_s?: number | null;
  distance_m?: number | null;
  elevation_gain_m?: number | null;
  best_5k_s?: number | null;
  best_10k_s?: number | null;
  route_polyline?: string | null;
  route_points_count?: number;
  notes?: string | null;
}
