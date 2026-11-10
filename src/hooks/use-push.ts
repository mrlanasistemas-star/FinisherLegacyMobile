import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { router, type Href } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';

import { markNotificationRead } from '@/api/notifications';
import { notificationDestination } from '@/features/notifications/notification-href';
import { getPushPermission, isPushAvailable, registerForPush, type PushPermission, type PushRegistrationResult } from '@/features/push/push-registration';
import { queryKeys } from '@/hooks/query-keys';
import { useAuthStore } from '@/stores/authStore';
import { useUiStore } from '@/stores/uiStore';
import type { NotificationTarget } from '@/types/models';

if (Platform.OS !== 'web') {
  // Foreground: show the banner (the bell badge updates too) without sound.
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
}

interface PushData {
  notification_id?: string;
  target?: NotificationTarget | null;
  action_url?: string | null;
  url?: string | null;
  deep_link?: string | null;
  metadata?: { deep_link?: string | null } | null;
}

/**
 * Mounted once in the root navigator:
 * - with a session and permission ALREADY granted, refreshes the Expo push
 *   token on the backend silently (never shows the system dialog here);
 * - a push received in foreground refreshes the notification list/badge;
 * - tapping a push (warm or cold start) opens the same place the in-app
 *   notification row would, and marks it read.
 */
export function usePushLifecycle() {
  const status = useAuthStore((s) => s.status);
  const client = useQueryClient();
  const registeredThisSession = useRef(false);
  const handledResponseId = useRef<string | null>(null);
  const lastResponse = Notifications.useLastNotificationResponse();

  useEffect(() => {
    if (status !== 'authenticated') {
      registeredThisSession.current = false;
      return;
    }
    if (registeredThisSession.current || !isPushAvailable()) return;
    registeredThisSession.current = true;
    registerForPush({ prompt: false }).catch(() => {});
  }, [status]);

  useEffect(() => {
    if (Platform.OS === 'web') return;
    const sub = Notifications.addNotificationReceivedListener(() => {
      client.invalidateQueries({ queryKey: queryKeys.notifications });
    });
    return () => sub.remove();
  }, [client]);

  useEffect(() => {
    if (!lastResponse || lastResponse.actionIdentifier !== Notifications.DEFAULT_ACTION_IDENTIFIER) return;
    const id = lastResponse.notification.request.identifier;
    if (handledResponseId.current === id) return;

    const data = (lastResponse.notification.request.content.data ?? {}) as PushData;
    const destination = notificationDestination(data);

    if (status !== 'authenticated') {
      // Opened from a push while signed out: replay after login (useDeepLinks).
      if (status === 'unauthenticated' && destination?.kind === 'app') {
        handledResponseId.current = id;
        useUiStore.getState().setPendingDeepLink(destination.href);
      }
      return;
    }

    handledResponseId.current = id;
    if (data.notification_id) {
      markNotificationRead(data.notification_id)
        .then(() => client.invalidateQueries({ queryKey: queryKeys.notifications }))
        .catch(() => {});
    }
    if (destination?.kind === 'app') router.push(destination.href as Href);
    else if (destination?.kind === 'external') WebBrowser.openBrowserAsync(destination.url).catch(() => {});
    else router.push('/notifications');
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }, [lastResponse, status, client]);
}

/**
 * State for a contextual "Activar avisos" prompt: only offered when push
 * can work on this build/device and the athlete hasn't decided yet.
 * `enable()` is the only place the system permission dialog is triggered.
 */
export function usePushPermission() {
  const [permission, setPermission] = useState<PushPermission | null>(null);
  const [pending, setPending] = useState(false);
  const available = isPushAvailable();

  const refresh = useCallback(() => {
    getPushPermission().then(setPermission).catch(() => {});
  }, []);

  useEffect(() => {
    refresh();
    // Coming back from the system settings may have changed the answer.
    const sub = AppState.addEventListener('change', (state) => state === 'active' && refresh());
    return () => sub.remove();
  }, [refresh]);

  const enable = useCallback(async (): Promise<PushRegistrationResult> => {
    setPending(true);
    try {
      const result = await registerForPush({ prompt: true });
      refresh();
      return result;
    } finally {
      setPending(false);
    }
  }, [refresh]);

  return { available, permission, pending, enable };
}
