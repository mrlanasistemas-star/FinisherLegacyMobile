import { create } from 'zustand';

import type { ActiveWorkoutSport } from './workout-storage';

/**
 * The workout the athlete just finished, kept in memory for the summary
 * screen right after "Terminar" — it renders immediately, even offline,
 * while the outbox sends the finish. Once synced, the summary reads the
 * server's copy (the single source of truth) by its uuid.
 */
export interface FinishedWorkout {
  clientUuid: string;
  sport: ActiveWorkoutSport;
  usesGps: boolean;
  startedAt: string;
  durationS: number;
  movingS: number | null;
  distanceM: number | null;
  elevationGainM: number | null;
  best5kS: number | null;
  best10kS: number | null;
  polyline: string | null;
}

export const useFinishedWorkoutStore = create<{ finished: FinishedWorkout | null; set: (finished: FinishedWorkout | null) => void }>((set) => ({
  finished: null,
  set: (finished) => set({ finished }),
}));
