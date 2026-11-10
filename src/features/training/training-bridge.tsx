import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

import { queryKeys } from '@/hooks/query-keys';
import { useAuthStore } from '@/stores/authStore';

import { clearOfflineCache } from './offline-cache';
import { refreshAudioMode, registerListenedHandler, releasePlayer, sessionTick } from './player-controller';
import { usePlayerStore } from './player-store';
import { useTrainingSettings } from './settings-store';
import { markListenedEverywhere } from './use-training';

/**
 * Invisible glue mounted once in the root layout (inside QueryProvider):
 * - wires the player's auto "listened" mark to the API + query cache;
 * - ticks the "Modo entrenamiento" interval scheduler (and catches up the
 *   moment the app returns to the foreground);
 * - holds the screen awake only during a session with "Mantener pantalla
 *   encendida" on (expo-keep-awake, loaded lazily);
 * - re-applies the audio mode when "Mezclar / Pausar mi música" changes;
 * - refreshes the inbox when a `training_cheer` push arrives in the foreground;
 * - on logout stops audio and wipes the offline audio of that athlete.
 */
export function TrainingBridge() {
  const client = useQueryClient();
  const status = useAuthStore((s) => s.status);
  const sessionActive = usePlayerStore((s) => s.session.active);
  const keepAwake = useTrainingSettings((s) => s.keepAwake);
  const mixMode = useTrainingSettings((s) => s.mixMode);
  const previousStatus = useRef(status);

  useEffect(() => {
    registerListenedHandler((uuid) => void markListenedEverywhere(client, uuid));
    return () => registerListenedHandler(null);
  }, [client]);

  useEffect(() => {
    if (previousStatus.current === 'authenticated' && status === 'unauthenticated') {
      releasePlayer();
      clearOfflineCache();
    }
    previousStatus.current = status;
  }, [status]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationReceivedListener((notification) => {
      const data = (notification.request.content.data ?? {}) as { type?: string; target?: { type?: string; kind?: string } | null };
      if (data.type === 'training_cheer' || data.target?.type === 'training' || data.target?.kind === 'training') {
        void client.invalidateQueries({ queryKey: queryKeys.trainingMessagesAll });
      }
    });
    return () => sub.remove();
  }, [client]);

  useEffect(() => {
    refreshAudioMode();
  }, [mixMode]);

  useEffect(() => {
    if (!sessionActive) return;
    const timer = setInterval(sessionTick, 500);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') sessionTick();
    });
    return () => {
      clearInterval(timer);
      subscription.remove();
    };
  }, [sessionActive]);

  useEffect(() => {
    if (!sessionActive || !keepAwake) return;
    const keep = loadKeepAwake();
    if (!keep) return;
    keep.activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => {});
    return () => {
      keep.deactivateKeepAwake(KEEP_AWAKE_TAG).catch(() => {});
    };
  }, [sessionActive, keepAwake]);

  return null;
}

const KEEP_AWAKE_TAG = 'fl-training-session';

type KeepAwakeModule = typeof import('expo-keep-awake');

function loadKeepAwake(): KeepAwakeModule | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-keep-awake') as KeepAwakeModule;
    return typeof mod?.activateKeepAwakeAsync === 'function' ? mod : null;
  } catch {
    return null;
  }
}
