import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { MixMode } from './audio-driver';
import type { QueueMode } from './queue';
import type { IntervalMinutes } from './session-clock';

/**
 * Entrenamientos preferences that survive restarts (non-sensitive, local
 * device only): how messages mix with the athlete's music, playback speed
 * and volume, and the last "Modo entrenamiento" setup.
 */

export const PLAYBACK_RATES = [0.75, 1, 1.25, 1.5, 2] as const;
export type PlaybackRate = (typeof PLAYBACK_RATES)[number];

interface TrainingSettingsState {
  mixMode: MixMode;
  keepAwake: boolean;
  rate: PlaybackRate;
  volume: number;
  queueMode: QueueMode;
  intervalMinutes: IntervalMinutes;
  setMixMode: (mode: MixMode) => void;
  setKeepAwake: (on: boolean) => void;
  setRate: (rate: PlaybackRate) => void;
  setVolume: (volume: number) => void;
  setQueueMode: (mode: QueueMode) => void;
  setIntervalMinutes: (minutes: IntervalMinutes) => void;
}

export const useTrainingSettings = create<TrainingSettingsState>()(
  persist(
    (set) => ({
      mixMode: 'mix',
      keepAwake: false,
      rate: 1,
      volume: 1,
      queueMode: 'unheard_first',
      intervalMinutes: null,
      setMixMode: (mixMode) => set({ mixMode }),
      setKeepAwake: (keepAwake) => set({ keepAwake }),
      setRate: (rate) => set({ rate }),
      setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
      setQueueMode: (queueMode) => set({ queueMode }),
      setIntervalMinutes: (intervalMinutes) => set({ intervalMinutes }),
    }),
    {
      name: 'fl_training_settings_v1',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: ({ mixMode, keepAwake, rate, volume, queueMode, intervalMinutes }) => ({
        mixMode,
        keepAwake,
        rate,
        volume,
        queueMode,
        intervalMinutes,
      }),
    },
  ),
);
