# Pendientes externos (solo tú puedes hacerlos)

Nada de esto lo puede resolver el código. Marcado en orden de bloqueo.

## Bloqueantes para enviar

| # | Pendiente | Dónde se usa |
|---|---|---|
| 1 | **Cuenta Google Play Console** (pago único de 25 USD). Personal o de organización. Organización requiere **número D-U-N-S** (gratis, tarda 1–4 semanas) y evita el requisito de 12 testers × 14 días. | Publicación Android |
| 2 | **Apple Developer Program** (99 USD/año). Organización requiere D-U-N-S y entidad legal. Verificación de identidad de Apple: hasta 2 semanas. | Publicación iOS |
| 3 | **Apple Team ID** → `eas.json` (`REEMPLAZAR_APPLE_TEAM_ID`) y `APPLE_TEAM_ID` en el `.env` del servidor. | Envío y universal links |
| 4 | **ASC App ID** (número de la app en App Store Connect) → `eas.json` (`REEMPLAZAR_ASC_APP_ID`) y `IOS_APP_STORE_ID` en el servidor. | `eas submit` |
| 5 | **Cuenta de servicio de Google Play** (JSON) con permiso de publicación → `./secrets/google-play-service-account.json` (no se versiona). Guía: https://docs.expo.dev/submit/android/ | `eas submit` Android |
| 6 | **Primer AAB subido a mano** en Play Console (Google no permite que la API cree la primera versión). | Android |
| 7 | **Pagos en producción (OpenPay)** con llaves reales y probado. Si el revisor ve «El pago con tarjeta todavía no está activo», es rechazo por app incompleta (Apple 2.1). | Tienda |
| 8 | **Correo `hola@finisherlegacy.com` funcionando** (la app y las notas lo publican como contacto). Configurar también el correo en Administración › Empresa. | Soporte, UGC 1.2 |
| 9 | **Cuenta de revisión en producción**: `php artisan app:review-account revision@finisherlegacy.com` antes de cada envío; pegar credenciales en ambas tiendas. Usa un correo exclusivo que controles. | Acceso para revisores |
| 10 | **Video de demostración** (NFC, seguimiento en vivo, audio en segundo plano) en YouTube no listado. Guion en [review-notes-es-en.md](./review-notes-es-en.md#guion-del-video-de-demostración). | Apple y declaraciones de Play |
| 11 | **12 testers reales** inscritos 14 días seguidos en prueba cerrada (solo cuenta personal de Play). | Acceso a producción en Play |
| 12 | **Revisión legal** del Aviso de privacidad y de los Términos (web `/privacy`, `/terms`). Agregar **razón social y domicilio** del responsable (LFPDPPP lo exige). Los textos actuales describen con precisión los datos que maneja la app, pero no son asesoría legal. | Ficha de ambas tiendas |
| 13 | **Moderación en 24 h**: alguien del equipo debe revisar Administración › Comunidad › Reportes y Mensajes (incluye solicitudes de eliminación de cuenta) a diario. Lo prometen los Términos y las notas de revisión. | UGC / eliminación |

## Necesarios para que funcionen todas las funciones

| Pendiente | Detalle |
|---|---|
| **Push Android (FCM)** | Crear proyecto Firebase, app Android `com.finisherlegacy.app`, descargar `google-services.json` → `eas env:create --environment production --name GOOGLE_SERVICES_JSON --type file --value ./secrets/google-services.json`. Subir la **llave de cuenta de servicio FCM V1** en `eas credentials -p android` → Push Notifications. |
| **Push iOS (APNs)** | `eas credentials -p ios` → generar/subir la APNs key (.p8). |
| **Proveedor push en el backend** | Reemplazar `NullPushNotificationGateway` por el envío real vía Expo Push si se quieren notificaciones push (hoy son internas en la bandeja). No bloquea la revisión. |
| **App Links Android** | SHA-256 de Play App Signing (Play Console › Integridad de la app) → `ANDROID_SHA256_CERT_FINGERPRINTS` en el servidor. |
| **Universal links iOS** | `APPLE_TEAM_ID` en el servidor (sirve `/.well-known/apple-app-site-association`). |
| **HTTPS válido** en `finisherlegacy.com` con `/privacy`, `/terms`, `/eliminar-cuenta`, `/contact` y `/.well-known/*` accesibles sin login. Desplegar la web con estos cambios **antes** de enviar. |
| **Recursos gráficos**: gráfico de funciones 1024×500, ícono 512×512, capturas (ver [screenshots.md](./screenshots.md)). |
| **Contacto para App Review**: nombre, teléfono y correo de una persona responsable. |

## Recomendado (no bloquea)

- Actualizar parches de Expo SDK 57 (`npx expo install --check`; hay 15 paquetes con parche pendiente según `expo-doctor`) en un momento sin otros agentes trabajando, y reconstruir.
- Instalar `expo-asset` (dependencia par que exige `expo-audio`; sin ella el audio puede fallar fuera de Expo Go): `npx expo install expo-asset`.
- Ícono de notificación Android monocromo de 96×96 (hoy se usa el ícono por defecto con color `#0B0B0C`).
