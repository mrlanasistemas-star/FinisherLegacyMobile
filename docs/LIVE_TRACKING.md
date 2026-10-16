# Seguimiento en vivo (móvil)

Flujo: Mis eventos → participación → **Iniciar seguimiento** (`/tracking/{participantId}`) → pantalla de consentimiento explícito (quién lo ve, qué se comparte, batería, cómo detener) → permiso de ubicación "mientras se usa" → (solo iOS) explicación + permiso "Siempre" (opcional) → `POST /me/events/{participant}/tracking/sessions` → GPS.

- **Nunca** se enciende el GPS sin un `TrackingConsent` fresco (`features/tracking/consent.ts`, 10 min, por participación). Abrir la pantalla no inicia nada; el arranque de la app solo rehidrata y reenvía puntos pendientes.
- **Tarea en segundo plano**: `features/tracking/tracking-task.ts` define `fl-live-tracking` en el ámbito del módulo (importado desde `app/_layout.tsx`). `startLocationUpdatesAsync` con `foregroundService` (notificación Android visible) y `showsBackgroundLocationIndicator` (iOS). Si no se puede (Expo Go), cae a `watchPositionAsync` y la pantalla avisa "solo con la app abierta".
- **Buffer offline**: AsyncStorage (`fl_live_tracking_v1`), máx. 5 000 puntos, deduplicados, precisión > 75 m descartada. Envío en lotes ≤ `batch_max` (≤ 100) cada 10 puntos o 15 s; fallas de red/5xx/429 → reintento exponencial (2 s → 2 min) y reintento inmediato al volver la conexión (`expo-network`); 422 descarta el lote; 403/404/409/410 = sesión cerrada → se apaga el GPS.
- **Detener**: botón fijo siempre visible. Apaga el GPS al instante; si no hay señal, termina de enviar y cierra la sesión al reconectar.
- **Compartir**: `POST /tracking/sessions/{uuid}/shares` → hoja nativa con la URL `/live/{token}`; revocar con `DELETE /tracking/shares/{uuid}`. Los enlaces creados se guardan localmente (el contrato no tiene listado).
- **Apoyo**: si la participación tiene sesión de apoyo, la pantalla en vivo consulta `me/support-sessions/{id}/triggered` con la distancia recorrida (cada 100 m / 60 s) y muestra texto o audio; "Listo, gracias" lo marca como consumido.

## Configuración nativa (app.json → requiere development build / EAS)

- `expo-location` plugin: textos en español, `isIosBackgroundLocationEnabled: true` (UIBackgroundModes `location`), `isAndroidForegroundServiceEnabled: true` (`FOREGROUND_SERVICE_LOCATION`), `isAndroidBackgroundLocationEnabled: false` — Android sigue con la pantalla apagada mediante el servicio en primer plano iniciado por el usuario, así que no se pide "Permitir todo el tiempo" ni hace falta la declaración de ubicación en segundo plano de Google Play.
- iOS: App Store pide justificar el modo `location` en segundo plano en la revisión (uso: seguimiento en vivo de carreras iniciado por el usuario).
- `expo-task-manager` y la ubicación en segundo plano **no funcionan en Expo Go**: `eas build --profile development`.
