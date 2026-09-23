import * as Haptics from 'expo-haptics';

/**
 * The few moments that deserve a physical response — follow, like, add to
 * cart, purchase success, scan, claim. Never on every tap. Every call is
 * fire-and-forget (a device without a taptic engine just no-ops).
 */
export const haptics = {
  selection: () => Haptics.selectionAsync().catch(() => {}),
  light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {}),
  success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {}),
  warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {}),
  error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {}),
};
