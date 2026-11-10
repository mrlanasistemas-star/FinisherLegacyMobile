# Publicación en tiendas — índice

Todo lo necesario para que **Finisher Legacy** (`com.finisherlegacy.app`) pase la revisión de Google Play y App Store al primer envío. Verificado contra las políticas vigentes a noviembre de 2026.

| Documento | Para qué |
|---|---|
| [google-play.md](./google-play.md) | Ficha, clasificación, Data safety, declaraciones, pruebas cerradas (12 testers × 14 días) y pasos de publicación en Android. |
| [app-store.md](./app-store.md) | App Store Connect, etiquetas de privacidad, exportación, capturas, TestFlight y configuración de Apple Developer. |
| [review-notes-es-en.md](./review-notes-es-en.md) | Notas para el revisor (español e inglés) listas para copiar y pegar. |
| [screenshots.md](./screenshots.md) | Qué pantallas capturar y cómo hacerlo con `adb` en el teléfono conectado. |
| [pendientes-externos.md](./pendientes-externos.md) | Lo que **solo tú** puedes hacer o proporcionar (cuentas, pagos, llaves, IDs). |

## Orden recomendado

1. Resolver [pendientes-externos.md](./pendientes-externos.md) (cuentas, Team ID, Firebase, OpenPay en producción, correo de soporte).
2. En el servidor de producción: `php artisan app:review-account revision@finisherlegacy.com` y guardar las credenciales que imprime.
3. Grabar el video de demostración (NFC + seguimiento en vivo + audio en segundo plano) — guion en [review-notes-es-en.md](./review-notes-es-en.md#guion-del-video-de-demostración).
4. `eas build -p android --profile production` → prueba interna → prueba cerrada (14 días) → producción.
5. `eas build -p ios --profile production` → TestFlight → envío a revisión.

## Archivos de configuración (qué hace cada uno)

Los JSON no admiten comentarios; aquí se documentan.

### `app.json` (identidad estática)

| Clave | Valor | Motivo |
|---|---|---|
| `name` / `slug` / `scheme` | Finisher Legacy / FinisherLegacyMobile / `finisherlegacy` | Nombre visible, proyecto EAS y esquema de deep links. |
| `version` | `1.0.0` | Versión visible. **Se sube a mano** en cada release (1.0.1, 1.1.0…). |
| `ios.bundleIdentifier`, `android.package` | `com.finisherlegacy.app` | Identificador definitivo. **Nunca cambiarlo** después del primer envío. |
| `ios.buildNumber`, `android.versionCode` | (eliminados) | Los gestiona EAS en remoto (`appVersionSource: remote` + `autoIncrement`). |
| `ios.supportsTablet` | `false` | La app no está diseñada para iPad: no se piden capturas de iPad y Apple no la revisa en iPad. |
| `userInterfaceStyle` / `orientation` | `light` / `portrait` | Identidad solo clara; solo vertical. |
| `icon`, `android.adaptiveIcon`, `expo-splash-screen` | Monograma oficial FL | Ícono 1024 (iOS), adaptive + monochrome (Android 13+), splash claro. |
| `android.permissions` | `CAMERA`, `NFC`, `VIBRATE` | Únicos permisos propios. Ubicación, servicios en primer plano y audio los añaden sus plugins. |
| `expo-image-picker` | textos en español, `microphonePermission: false` | La cámara solo toma fotos: sin micrófono ni `RECORD_AUDIO`. |
| `expo-location` | textos en español; segundo plano solo en iOS; servicio en primer plano en Android | Seguimiento en vivo iniciado por el usuario. Android **no** pide `ACCESS_BACKGROUND_LOCATION`. |
| `expo-video` | sin opciones | Pasarle `supportsBackgroundPlayback: false` **quitaría** el modo `audio` que necesita `expo-audio`. |
| `@stripe/stripe-react-native` | (lo administra el agente de pagos) | Se retirará al pasar a checkout web de OpenPay. |

`androidNavigationBar.enforceContrast` se eliminó de `app.json`: en SDK 57 ya no tiene efecto y rompía la validación de esquema de `expo-doctor`. Ahora lo aplica `app.config.ts`.

### `app.config.ts` (capa dinámica, comentada en el propio archivo)

- Universal links / App Links para `https://finisherlegacy.com/n/*` y `/t/*`.
- NFC: entitlement solo `TAG` (evita el error de subida ITMS-90778 «NDEF is disallowed»; la app solo usa `NFCTagReaderSession`).
- `expo-audio`: solo reproducción, segundo plano activado, sin micrófono.
- `expo-notifications`: `aps-environment` = `production` en builds de producción.
- `ios.privacyManifests`: Privacy Manifest (APIs con motivo + tipos de datos recopilados).
- `ITSAppUsesNonExemptEncryption: false`.
- `android.blockedPermissions`: `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `READ_MEDIA_*`, `ACCESS_BACKGROUND_LOCATION`, `AD_ID`.
- `android:enforceNavigationBarContrast=false` en el tema (edge-to-edge de Android 15/16, targetSdk 36).
- `googleServicesFile` desde la variable de archivo de EAS `GOOGLE_SERVICES_JSON` (FCM para push en Android).

### `eas.json`

| Perfil | Uso | Detalle |
|---|---|---|
| `development` | Dev client para desarrollo | `developmentClient`, distribución interna, APK. Usa tu `.env.local`. |
| `preview` | Pruebas internas | APK (Android) / ad-hoc (iOS) contra producción. |
| `production` | Tiendas | AAB, `autoIncrement` de build number / versionCode, `EXPO_PUBLIC_API_URL=https://finisherlegacy.com/api/v1`, `EXPO_PUBLIC_WEB_URL=https://finisherlegacy.com`. |
| `submit.production` | `eas submit` | Android: `./secrets/google-play-service-account.json`, track `internal`, `releaseStatus: draft`. iOS: `appleTeamId` y `ascAppId` con marcadores **`REEMPLAZAR_…`** (ver pendientes). |

`/secrets/`, `google-services.json` y `GoogleService-Info.plist` están en `.gitignore`.

## Cambios que requieren un build nativo nuevo

Todo lo de `app.json` / `app.config.ts` (permisos, entitlements, Privacy Manifest, plugins, tema Android). Un update OTA no los aplica.

## URLs públicas que piden las tiendas

| Uso | URL |
|---|---|
| Política de privacidad | https://finisherlegacy.com/privacy |
| Términos (EULA, reglas de la comunidad) | https://finisherlegacy.com/terms |
| Eliminación de cuenta (Google Play › Data safety) | https://finisherlegacy.com/eliminar-cuenta |
| Soporte / contacto | https://finisherlegacy.com/contact |
| Sitio de marketing | https://finisherlegacy.com |

## Estado de cumplimiento

| Requisito | Estado |
|---|---|
| Eliminación de cuenta en la app (Apple 5.1.1(v), Google) | ✅ Configuración › Contraseña y cuenta › Eliminar mi cuenta (`DELETE /api/v1/me/account`). |
| Eliminación desde la web + solicitud sin la app (Google) | ✅ `/eliminar-cuenta` (nueva) y Ajustes › Perfil en la web (ahora usa la misma acción `DeleteAccount` que la app). |
| Política de privacidad y términos | ✅ Textos completos (se quitó el aviso de «placeholder»). ⚠️ Falta revisión legal y razón social/domicilio del responsable. |
| UGC: filtro, reporte, bloqueo, moderación, aceptación de términos (Apple 1.2) | ✅ Reportar perfil/momento/mensaje, bloquear, cola de moderación en el admin, **nuevo** filtro de lenguaje ofensivo y **nueva** casilla obligatoria de Términos en el registro. |
| Bienes digitales (Apple 3.1.1) | ✅ Sin IAP y sin botones de compra de fotos/ampliaciones; la API ya excluye productos `digital_photo` del catálogo. |
| Bienes físicos con checkout externo (Apple 3.1.3(e)) | ✅ Permitido. Depende de que OpenPay esté activo en producción. |
| Sign in with Apple (4.8) | ✅ No aplica: solo correo y contraseña. Código de Google sign-in eliminado de la app. |
| Cuenta demo (2.1) | ✅ `php artisan app:review-account {email}`. |
| Ubicación / audio en segundo plano | ✅ Justificados en notas; ⚠️ Google exige video de los servicios en primer plano. |
| Contenido «Próximamente» / lorem / TODO en UI | ✅ No se encontró. |
| Privacy Manifest iOS | ✅ |
| Cifrado (exportación) | ✅ `ITSAppUsesNonExemptEncryption: false`. |
| Android 15/16 edge-to-edge, targetSdk 36 | ✅ |
