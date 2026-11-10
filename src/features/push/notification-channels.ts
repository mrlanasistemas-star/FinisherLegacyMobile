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
import { getLocale, t } from '@/i18n';

export const ACCENT_COLOR = '#C9AE8B';

export interface ChannelSpec {
  id: 'default' | 'pedidos' | 'comunidad' | 'entrenamientos' | 'avisos';
  name: string;
  description: string;
  importance: 'high' | 'default';
}

/**
 * A function, not a table: the names the person sees in the system settings
 * are resolved in the app language active when the channels are created.
 */
export function notificationChannels(): readonly ChannelSpec[] {
  return [
    { id: 'default', name: t('General||canal de avisos generales'), description: t('Avisos de tu cuenta y respuestas de soporte.'), importance: 'high' },
    { id: 'pedidos', name: t('Pedidos y Tags'), description: t('Pagos, envíos, entregas, reembolsos y activación de tus Tags.'), importance: 'high' },
    { id: 'comunidad', name: t('Comunidad'), description: t('Seguidores, reacciones y comentarios en tus momentos.'), importance: 'default' },
    { id: 'entrenamientos', name: t('Entrenamientos'), description: t('Mensajes de ánimo de tu equipo de apoyo.'), importance: 'high' },
    { id: 'avisos', name: t('Avisos y novedades'), description: t('Resultados, eventos, lanzamientos y promociones.'), importance: 'default' },
  ];
}

let created: Promise<void> | null = null;
let createdLocale: string | null = null;

/**
 * Idempotent per app run and language; safe to call from several places.
 * After a language change the next call renames the channels (Android keeps
 * the person's own settings for each channel id).
 */
export function ensureNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android') return Promise.resolve();
  if (createdLocale !== getLocale()) {
    created = null;
    createdLocale = getLocale();
  }
  created ??= Promise.all(
    notificationChannels().map((channel) =>
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
