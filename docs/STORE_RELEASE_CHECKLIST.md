# Store Release Checklist

## Ya resuelto en el proyecto

- `app.json`: `scheme` (`finisherlegacy`), `ios.bundleIdentifier` / `android.package` (`com.finisherlegacy.app`), `ios.buildNumber` / `android.versionCode`, splash con marca real, permisos de cámara/fotos con descripción en español, `userInterfaceStyle: dark`.
- `eas.json`: perfiles `development`, `preview`, `production`.
- SecureStore para el token, nunca AsyncStorage.
- Manejo centralizado de 401/422/429/errores de red — sin crashes conocidos.
- `settings/account.tsx` documenta el canal real de eliminación de cuenta (`hola@finisherlegacy.com`) mientras no exista el endpoint API — ver gap abajo.
- Enlaces reales a política de privacidad y términos (`finisherlegacy.com/privacy`, `/terms`) desde Ajustes.

## Requiere cuenta/acción humana (Claude no puede resolverlo)

### Apple
- Cuenta de Apple Developer + App Store Connect.
- Certificados/firmas — `eas build` los gestiona, pero requiere iniciar sesión con la cuenta real la primera vez (`eas credentials`).
- Capturas de pantalla, App Privacy (qué datos recolecta la app — hoy: email, nombre, fotos que el usuario sube), age rating, información de revisión para Apple.
- TestFlight antes de producción.

### Google
- Cuenta de Google Play Console.
- App signing (Play App Signing, gestionado por Google tras el primer upload).
- Store listing, capturas, Data Safety form (mismo contenido que App Privacy de Apple), content rating, track de pruebas interno antes de producción.

### Ambos
- `eas init` con una cuenta real de Expo (genera `extra.eas.projectId` en `app.json` — no se inventó aquí porque no existe un proyecto EAS real todavía).
- Icono final de la app (hoy usa el ícono/adaptive icon placeholder del template de Expo — el logo de marca ya está copiado en `assets/images/brand/` pero falta exportarlo en los tamaños/safe-zones exactos de icon set iOS y adaptive icon Android).
- Universal Links (iOS) / App Links (Android) para que `https://finisherlegacy.com/l/{code}` abra la app directamente: requiere el Apple Team ID real (`apple-app-site-association`) y el SHA-256 del certificado de firma de Android (`assetlinks.json`), ambos alojados en el backend Laravel. Sin esto, esos links abren el navegador — el escaneo QR dentro de la app ya funciona sin depender de esto.

## Gaps de backend que idealmente se resuelven antes de publicar

Ver `docs/MOBILE_BACKEND_GAPS.md`:
1. **Eliminación de cuenta vía API** — recomendado tenerlo antes de enviar a review; Apple/Google pueden exigirlo si la app permite crear cuenta.
2. Recuperación de contraseña vía API — no bloqueante, deseable.
3. `event_race_id` en `GET events/{slug}` — no bloqueante, habilita prerregistro real desde la app.
