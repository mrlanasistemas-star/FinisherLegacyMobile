import * as Location from 'expo-location';

import { loadTrackingRecord } from '@/features/tracking/tracking-storage';
import { handleLocations, LIVE_TRACKING_TASK } from '@/features/tracking/tracking-task';
import { t } from '@/i18n';
import { colors } from '@/theme/tokens';

/**
 * GPS for a live workout — NOT a second location stack. It drives the same
 * OS task as live race tracking (`LIVE_TRACKING_TASK`, defined at module
 * scope in features/tracking/tracking-task.ts); that task hands every fix to
 * both consumers (`feedWorkoutPoints` for the workout, the tracking buffer
 * for a race). Whoever starts it first owns the notification text; neither
 * stops it while the other still needs it.
 *
 * Real platform limits (documented, not hidden from the athlete):
 * - Android: a foreground service (`isAndroidForegroundServiceEnabled`,
 *   permanent notification) keeps fixes coming with the screen locked. The
 *   app never asks for ACCESS_BACKGROUND_LOCATION (blocked in
 *   app.config.ts), so the service must be started while the app is in the
 *   foreground — which is always the case here (the athlete taps Empezar).
 *   Aggressive OEM battery savers (Xiaomi, Huawei, Samsung "deep sleep") can
 *   still kill it; the athlete is told to exclude the app if distance stops.
 * - iOS: `UIBackgroundModes: location` (isIosBackgroundLocationEnabled) +
 *   the blue status-bar indicator let updates continue after locking with
 *   just "While using" permission when started in the foreground. If the
 *   system terminates the app, iOS does not relaunch it for standard
 *   updates; the workout clock keeps running (timestamp-based) and the
 *   distance resumes when the app is reopened.
 * - Expo Go / no background mode: falls back to a foreground watcher, and
 *   the workout screen says GPS only works with the app open.
 */

let foregroundWatcher: Location.LocationSubscription | null = null;

export type WorkoutGpsStart = 'background' | 'foreground' | 'denied' | 'services_off';

/** Asks for the foreground permission only after our own explanation in the setup screen. */
export async function ensureWorkoutLocationPermission(): Promise<boolean> {
  const current = await Location.getForegroundPermissionsAsync();
  if (current.granted) return true;
  if (!current.canAskAgain) return false;
  const result = await Location.requestForegroundPermissionsAsync();
  return result.granted;
}

export async function startWorkoutGps(): Promise<WorkoutGpsStart> {
  const permission = await Location.getForegroundPermissionsAsync();
  if (!permission.granted) return 'denied';
  if (!(await Location.hasServicesEnabledAsync().catch(() => true))) return 'services_off';

  try {
    // Already running for live race tracking: the same fixes reach the workout.
    if (!(await Location.hasStartedLocationUpdatesAsync(LIVE_TRACKING_TASK))) {
      await Location.startLocationUpdatesAsync(LIVE_TRACKING_TASK, {
        accuracy: Location.Accuracy.BestForNavigation,
        timeInterval: 3000,
        distanceInterval: 5,
        activityType: Location.ActivityType.Fitness,
        pausesUpdatesAutomatically: false,
        showsBackgroundLocationIndicator: true,
        foregroundService: {
          notificationTitle: t('Entrenamiento en curso'),
          notificationBody: t('Registrando tu distancia con GPS. Abre la app para pausar o terminar.'),
          notificationColor: colors.gold,
          killServiceOnDestroy: false,
        },
      });
    }
    return 'background';
  } catch {
    foregroundWatcher?.remove();
    foregroundWatcher = await Location.watchPositionAsync({ accuracy: Location.Accuracy.BestForNavigation, timeInterval: 3000, distanceInterval: 5 }, (location) => {
      handleLocations([location]).catch(() => {});
    });
    return 'foreground';
  }
}

/** Stops GPS for the workout — unless live race tracking still needs the shared task. */
export async function stopWorkoutGps(): Promise<void> {
  foregroundWatcher?.remove();
  foregroundWatcher = null;
  const tracking = await loadTrackingRecord().catch(() => null);
  if (tracking && !tracking.stopRequested) return;
  if (await Location.hasStartedLocationUpdatesAsync(LIVE_TRACKING_TASK).catch(() => false)) {
    await Location.stopLocationUpdatesAsync(LIVE_TRACKING_TASK).catch(() => {});
  }
}

export async function isWorkoutGpsRunning(): Promise<boolean> {
  if (foregroundWatcher) return true;
  return Location.hasStartedLocationUpdatesAsync(LIVE_TRACKING_TASK).catch(() => false);
}
