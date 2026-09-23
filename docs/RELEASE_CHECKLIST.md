# Release Checklist

Estado real verificado — no se marca ✅ nada que no se haya confirmado.

## App identity

- ✅ `app.json`: "Finisher Legacy", slug `FinisherLegacyMobile`, scheme `finisherlegacy`.
- ✅ `com.finisherlegacy.app` en iOS y Android — **no cambiar**.
- ✅ `ios.buildNumber` / `android.versionCode`: incrementar en cada submit (production usa `autoIncrement`).
- ✅ Ícono, adaptive icon y splash reales.
- ✅ `ios.supportsTablet: false` (V1 no se diseñó para iPad).
- ✅ `ios.usesAppleSignIn: true` (Sign in with Apple — EAS sincroniza la capability).

## Plugins nativos (requieren development build / EAS, no Expo Go)

- ✅ `@stripe/stripe-react-native` (0.64.0, versión de SDK 57) — `merchantIdentifier: []`, `enableGooglePay: false`: sin entitlement de Apple Pay hasta tener Merchant ID.
- ✅ `expo-apple-authentication`, `expo-camera`, `expo-image-picker`, `expo-video`, `expo-notifications`, `expo-secure-store`.

## Permisos

- ✅ Android: sólo `CAMERA`. Textos de permiso de cámara y fotos en español.

## EAS

- ✅ `eas.json` con perfiles `development`, `preview` (APK) y `production` (AAB); `EXPO_PUBLIC_API_URL` inyectada en `preview`/`production`.
- ✅ `extra.eas.projectId` existe.

## Configuración externa pendiente (lo único que el código no puede resolver)

### Pagos — Stripe (backend `.env`)
- `STRIPE_KEY`, `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`; webhook en Stripe Dashboard → `https://finisherlegacy.com/api/webhooks/stripe`. Probar primero con llaves `pk_test_/sk_test_` y tarjetas de prueba de Stripe (**nunca cobros reales de prueba**). Detalle en `COMMERCE_ARCHITECTURE.md`.
- Sin llaves: la app muestra "El pago con tarjeta todavía no está activo" y el pedido queda guardado.

### Google / Apple sign-in
- Google: crear clientes OAuth (iOS, Android con el SHA-1 de firma de EAS, Web) en Google Cloud. App: `EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID`, `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` (en `eas.json` → `env`). Backend: `GOOGLE_OAUTH_CLIENT_IDS` (los mismos, separados por coma). Sin ids el botón no aparece.
- Apple: habilitar Sign in with Apple en el App ID. Backend: `APPLE_SIGNIN_CLIENT_IDS=com.finisherlegacy.app`. El botón sólo aparece en iOS.

### Push
- Proveedor real (FCM/APNs vía Expo Push) y reemplazar `NullPushNotificationGateway` en el backend. Hoy las notificaciones sociales/pedidos son internas (bandeja de la app), no push.

### Universal Links / App Links
- `apple-app-site-association` (Team ID) y `assetlinks.json` (SHA-256 de firma Android) en `finisherlegacy.com`, + `ios.associatedDomains` / `android.intentFilters`. Sin esto, los enlaces `https://` abren el navegador (los `finisherlegacy://` y el escáner ya funcionan).
- Web: la ruta `/moments/{uuid}` todavía no existe en el sitio (ver `SOCIAL_ARCHITECTURE.md` › URLs).

### Tiendas
- Apple Developer / App Store Connect (App Privacy: email, nombre, fotos, contenido generado por el usuario; reporte/bloqueo ya existen), TestFlight.
- Google Play Console (Data Safety, content rating, track interno).
- Legal: textos finales de privacidad/términos y política de contenido de la comunidad.

## Cuenta de usuario

- ✅ Eliminación de cuenta desde la app (Configuración › Contraseña y cuenta) — requisito de App Store/Play.
- ✅ Restablecer contraseña (correo + pantalla en app).
- ✅ Reportar/bloquear perfiles, momentos y mensajes (requisito de apps con contenido generado por usuarios).

## Seguridad cliente

- ✅ Token sólo en SecureStore. ✅ Sin secretos en el bundle (la llave publicable de Stripe llega del backend en runtime).
- ✅ Datos de tarjeta nunca pasan por Laravel (PaymentSheet). ✅ Logger silencioso en producción.
- ✅ Caché persistido sólo de lectura y borrado al cerrar sesión.

## Quality gates (antes de cada build)

```
npm ci
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo export --platform android
```

Backend: `composer test` (Pest), `vendor/bin/pint --test`, `vendor/bin/phpstan analyse`, y `php artisan migrate --pretend` contra una copia de producción antes de migrar (nunca migrar producción sin aprobación).

## APK preview

```
eas login
eas build --platform android --profile preview
```
