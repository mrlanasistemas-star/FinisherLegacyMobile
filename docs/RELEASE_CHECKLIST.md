# Release Checklist

Estado real verificado en esta pasada — no se marca ✅ nada que no se haya confirmado leyendo el archivo real.

## App identity

- ✅ `app.json`: `name` "Finisher Legacy", `slug` "FinisherLegacyMobile", `scheme` "finisherlegacy".
- ✅ `ios.bundleIdentifier` / `android.package`: `com.finisherlegacy.app` — **no cambiar**, ya se distribuyó/configuró con este id.
- ✅ `ios.buildNumber`: "1", `android.versionCode`: 1. Incrementar en cada submit real.
- ✅ **Ícono de app real** (verificado: `assets/images/icon.png`, 39KB, fecha real de proyecto — no es el placeholder azul de `create-expo-app`, ya reemplazado en una pasada anterior). Adaptive icon Android (`android-icon-foreground/background/monochrome.png`) igualmente reales.
- ✅ Splash screen con marca real (`expo-splash-screen` plugin, `logo-mark-gold.png` sobre `#0A0A0C`).
- ⚠️ `ios.supportsTablet`: cambiado a **`false`** en esta pasada (antes `true`). Ningún layout de la app se diseñó o verificó específicamente para tablet — declarar soporte hubiera sido falso. Revertir a `true` sólo después de una pasada real de verificación en iPad.

## Permisos

- ✅ `android.permissions`: sólo `CAMERA` (QR scanning — Legacy Code y Gear claim). `RECORD_AUDIO` **removido** en esta pasada — no hay ningún código en `src/` que grabe audio (Support playback es sólo lectura vía `expo-video`); mantenerlo era un permiso peligroso sin justificación real, lo cual perjudica la revisión de Play Store.
- ✅ `expo-camera` plugin: `cameraPermission` con descripción real en español.
- ✅ `expo-image-picker` plugin: `photosPermission` con descripción real en español — sigue siendo precisa (selección de fotos/videos de medalla, perfil, y ahora también Event Media).
- ✅ `expo-notifications` plugin: agregado en una pasada anterior, config bare (sin props custom) — válido, todos los props del plugin son opcionales con defaults seguros (verificado en el código fuente del plugin).

## EAS

- ✅ `eas.json`: perfiles `development` (APK, developmentClient), `preview` (APK), `production` (AAB por default de EAS — sin override de `buildType`, `autoIncrement: true`).
- ✅ `EXPO_PUBLIC_API_URL=https://finisherlegacy.com/api/v1` inyectada explícitamente en `env` de los perfiles `preview` y `production` — la app standalone (fuera de Metro) no depende de un `.env` local que nunca se sube al build.
- ✅ **`extra.eas.projectId` ya existe** en `app.json` (`f6dce084-4b31-4f64-980a-917784b1f5c3`, `owner: zuriel2026s-team`) — corrige una nota de una auditoría anterior que decía que faltaba `eas init`. Esto significa `eas build --platform android --profile preview` puede correr sin configuración adicional de proyecto (sigue requiriendo `eas login` con la cuenta real la primera vez en cada máquina).
- ⚠️ Push real todavía no entrega nada de punta a punta — el `projectId` ya no es el bloqueante, pero el backend (`PushNotificationGateway`) sigue siendo `NullPushNotificationGateway`. Ver `MOBILE_BACKEND_REQUIREMENTS.md` P1.

## Auth social

- ⚠️ Google/Apple Sign-In: sin backend real (ni Socialite instalado, ni credenciales). Ver `MOBILE_BACKEND_REQUIREMENTS.md` P1. **Decisión de UX**: el botón debe quedar oculto o claramente deshabilitado — nunca un botón grande de aspecto funcional que en realidad no hace nada, ni un "próximamente" ocupando espacio principal del login.

## Cuentas / acciones humanas pendientes (no resolubles por el asistente)

### Apple
- Cuenta de Apple Developer + App Store Connect.
- Certificados/firmas — `eas build`/`eas credentials` los gestiona, requiere login real la primera vez.
- Capturas de pantalla, App Privacy (qué datos recolecta: email, nombre, fotos que el usuario sube), age rating, información de revisión.
- TestFlight antes de producción.

### Google
- Cuenta de Google Play Console.
- App signing (Play App Signing, gestionado por Google tras el primer upload).
- Store listing, capturas, Data Safety form, content rating, track de pruebas interno antes de producción.

### Ambos
- Universal Links (iOS) / App Links (Android) para que `https://finisherlegacy.com/l/{code}` (y equivalentes de gear/eventos) abran la app directamente: requiere Apple Team ID real (`apple-app-site-association`) y el SHA-256 del certificado de firma de Android (`assetlinks.json`), ambos alojados en el backend Laravel — trabajo de backend + cuentas, no de este repo. Sin esto, esos links abren el navegador; el escaneo QR dentro de la app ya funciona sin depender de esto.

## Cuenta de usuario

- ✅ Eliminación de cuenta: sin endpoint API todavía (ver `MOBILE_BACKEND_REQUIREMENTS.md` P0) — `src/app/settings/account.tsx` documenta el canal real de contacto (`hola@finisherlegacy.com`) en vez de un botón que finja borrar la cuenta.
- ✅ Enlaces reales a política de privacidad/términos desde Ajustes.

## Seguridad cliente

- ✅ Token sólo en `expo-secure-store`, nunca `AsyncStorage`.
- ✅ Sin secretos/API keys privadas en el bundle — `EXPO_PUBLIC_API_URL` es pública por diseño (base URL, no un secreto).
- ✅ Manejo centralizado de 401 (limpia sesión sin loop) / 422 / 429 / errores de red — sin crashes conocidos.

## Quality gates (ejecutar antes de cada build real)

```
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo export --platform android
npx expo export --platform ios
```

## APK Preview — listo para

```
eas login
eas init      # si projectId cambiara alguna vez; hoy ya existe, no debería ser necesario
eas build --platform android --profile preview
```

**APK READY: ver el reporte final de esta pasada de hardening para el veredicto exacto (YES/NO y qué falta si NO).**
