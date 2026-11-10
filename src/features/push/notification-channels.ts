/**
 * Android notification channels (Android 8+). The backend sends `channelId`
 * per category (docs: finisherLegacy/docs/renovacion/notificaciones.md):
 * pedidos, comunidad, entrenamientos, avisos, and `default` (soporte and
 * anything uncategorised). Created at start-up even before permission is
 * granted — Android 13+ needs a channel to exist before the permission
 * prompt can appear. Re-creating an existing channel is a no-op for the
 * user-facing settings (the person's choices are kept).
 */
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const ACCENT_COLOR = '#C9AE8B';

export interface ChannelSpec {
  id: 'default' | 'pedidos' | 'comunidad' | 'entrenamientos' | 'avisos';
  name: string;
  description: string;
  importance: 'high' | 'default';
}

export const NOTIFICATION_CHANNELS: readonly ChannelSpec[] = [
  { id: 'default', name: 'General', description: 'Avisos de tu cuenta y respuestas de soporte.', importance: 'high' },
  { id: 'pedidos', name: 'Pedidos y Tags', description: 'Pagos, envíos, entregas, reembolsos y activación de tus Tags.', importance: 'high' },
  { id: 'comunidad', name: 'Comunidad', description: 'Seguidores, reacciones y comentarios en tus momentos.', importance: 'default' },
  { id: 'entrenamientos', name: 'Entrenamientos', description: 'Mensajes de ánimo de tu equipo de apoyo.', importance: 'high' },
  { id: 'avisos', name: 'Avisos y novedades', description: 'Resultados, eventos, lanzamientos y promociones.', importance: 'default' },
];

let created: Promise<void> | null = null;

/** Idempotent per app run; safe to call from several places. */
export function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  created ??= Promise.all(
    NOTIFICATION_CHANNELS.map((channel) =>
      Notifications.setNotificationChannelAsync(channel.id, {
        name: channel.name,
        description: channel.description,
        importance: channel.importance === 'high' ? Notifications.AndroidImportance.HIGH : Notifications.AndroidImportance.DEFAULT,
        lightColor: ACCENT_COLOR,
        showBadge: true,
        enableVibrate: true,
      }),
    ),
  )
    .then(() => undefined)
    .catch(() => {
      created = null;
    });
  return created;
}
