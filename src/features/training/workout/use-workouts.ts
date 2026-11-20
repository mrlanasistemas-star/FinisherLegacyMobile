import AsyncStorage from '@react-native-async-storage/async-storage';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { deleteWorkout, fetchActiveWorkout, fetchWorkout, fetchWorkouts, fetchWorkoutSports, fetchWorkoutStats, shareWorkout, updateWorkout } from '@/api/workouts';
import { AppError } from '@/api/errors';
import type { Workout, WorkoutPeriod, WorkoutSource, WorkoutSport, WorkoutsPage } from '@/schemas/workouts';
import { ensureOnline } from '@/utils/network';

import { useWorkoutOutbox } from './workout-outbox';

/**
 * TanStack Query layer for Modo entrenamiento. Root key `workouts` (kept out
 * of the persisted cache on purpose: the running workout and the outbox are
 * the offline story, the server lists are always fresh). Every write goes
 * to the server; nothing here fakes a success.
 */
export const workoutKeys = {
  all: ['workouts'] as const,
  sports: ['workouts', 'sports'] as const,
  stats: (period: WorkoutPeriod) => ['workouts', 'stats', period] as const,
  history: (source: WorkoutSource | 'all') => ['workouts', 'history', source] as const,
  detail: (uuid: string) => ['workouts', 'detail', uuid] as const,
  active: ['workouts', 'active'] as const,
};

const SPORTS_KEY = 'fl_workout_sports_v1';

/**
 * The activity list, with the last good copy kept on the phone: starting a
 * workout must also work in a park with no signal (the start itself then
 * waits in the outbox).
 */
async function sportsWithOfflineCopy(): Promise<WorkoutSport[]> {
  try {
    const sports = await fetchWorkoutSports();
    AsyncStorage.setItem(SPORTS_KEY, JSON.stringify(sports)).catch(() => {});
    return sports;
  } catch (error) {
    const offline = error instanceof AppError && (error.kind === 'network' || error.kind === 'timeout');
    const saved = offline ? await AsyncStorage.getItem(SPORTS_KEY).catch(() => null) : null;
    if (saved) return JSON.parse(saved) as WorkoutSport[];
    throw error;
  }
}

export function useWorkoutSports() {
  return useQuery({ queryKey: workoutKeys.sports, queryFn: sportsWithOfflineCopy, staleTime: 60 * 60_000 });
}

export function useWorkoutStats(period: WorkoutPeriod) {
  return useQuery({ queryKey: workoutKeys.stats(period), queryFn: () => fetchWorkoutStats(period) });
}

export function useWorkoutHistory(source: WorkoutSource | 'all') {
  return useInfiniteQuery({
    queryKey: workoutKeys.history(source),
    queryFn: ({ pageParam }) => fetchWorkouts(pageParam, source === 'all' ? undefined : source),
    initialPageParam: 1,
    getNextPageParam: (last: WorkoutsPage) => (last.meta.current_page < last.meta.last_page ? last.meta.current_page + 1 : undefined),
  });
}

export function flattenWorkouts(pages: WorkoutsPage[] | undefined): Workout[] {
  const seen = new Set<string>();
  return (pages ?? []).flatMap((page) => page.data).filter((w) => (seen.has(w.uuid) ? false : (seen.add(w.uuid), true)));
}

export function useWorkout(uuid: string | null) {
  return useQuery({ queryKey: workoutKeys.detail(uuid ?? ''), queryFn: () => fetchWorkout(uuid as string), enabled: !!uuid });
}

/** The server's running workout — used to resolve one left open from another phone or a reinstall. */
export function useServerActiveWorkout(enabled: boolean) {
  return useQuery({ queryKey: workoutKeys.active, queryFn: fetchActiveWorkout, enabled });
}

/** Refresh every workout list the moment the outbox delivers something. */
export function useRefreshOnSync() {
  const queryClient = useQueryClient();
  const lastSyncAt = useWorkoutOutbox((s) => s.lastSyncAt);
  useEffect(() => {
    if (lastSyncAt) queryClient.invalidateQueries({ queryKey: workoutKeys.all }).catch(() => {});
  }, [lastSyncAt, queryClient]);
}

export function useUpdateWorkout(uuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { notes?: string | null; visibility?: string }) => {
      await ensureOnline();
      return updateWorkout(uuid, input);
    },
    onSuccess: (workout) => {
      queryClient.setQueryData(workoutKeys.detail(uuid), workout);
      queryClient.invalidateQueries({ queryKey: ['workouts', 'history'] }).catch(() => {});
    },
  });
}

export function useDeleteWorkout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (uuid: string) => {
      await ensureOnline();
      await deleteWorkout(uuid);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: workoutKeys.all }),
  });
}

export function useShareWorkout(uuid: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { visibility: 'private' | 'followers' | 'public'; caption?: string | null }) => {
      await ensureOnline();
      return shareWorkout(uuid, input);
    },
    onSuccess: (result) => {
      queryClient.setQueryData(workoutKeys.detail(uuid), result.workout);
      queryClient.invalidateQueries({ queryKey: ['feed'] }).catch(() => {});
    },
  });
}
