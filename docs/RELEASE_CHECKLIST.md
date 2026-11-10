# Release Checklist

Estado real verificado — no se marca ✅ nada que no se haya confirmado.

> **Publicación en tiendas:** la guía vigente (fichas, Data safety, App Privacy, notas de revisión, cuenta demo, pendientes externos) está en [`docs/store/`](./store/README.md). Este documento queda como checklist técnico general.

## App identity

- ✅ `app.json`: "Finisher Legacy", slug `FinisherLegacyMobile`, scheme `finisherlegacy`.
- ✅ `com.finisherlegacy.app` en iOS y Android — **no cambiar**.
- ✅ Build number / versionCode remotos en EAS (`appVersionSource: remote` + `autoIncrement`); ya no están en `app.json`.
- ✅ Ícono, adaptive icon y splash reales.
- ✅ `ios.supportsTablet: false` (V1 no se diseñó para iPad).
- ✅ Sin login social (solo correo y contraseña): Sign in with Apple no aplica.

## Plugins nativos (requieren development build / EAS, no Expo Go)

- ✅ `@stripe/stripe-react-native` (0.64.0) — se retira al pasar al checkout web de OpenPay.
- ✅ `expo-image-picker`, `expo-video`, `expo-audio`, `expo-location`, `expo-notifications`, `expo-secure-store`, `react-native-nfc-manager`.

## Permisos

- ✅ Android: `CAMERA`, `NFC`, `VIBRATE` + ubicación / servicios en primer plano de sus plugins. Bloqueados: `RECORD_AUDIO`, `SYSTEM_ALERT_WINDOW`, `READ_MEDIA_*`, `ACCESS_BACKGROUND_LOCATION`, `AD_ID` (ver `docs/store/README.md`).

## EAS

- ✅ `eas.json` con perfiles `development`, `preview` (APK) y `production` (AAB); `EXPO_PUBLIC_API_URL` inyectada en `preview`/`production`.
- ✅ `extra.eas.projectId` existe.

## Configuración externa pendiente (lo único que el código no puede resolver)

### Pagos — Stripe (backend `.env`)
- `STRIPE_KEY`, `STRIPE_SECRET`, `STRIPE_WEBHOOK_SECRET`; webhook en Stripe Dashboard → `https://finisherlegacy.com/api/webhooks/stripe`. Probar primero con llaves `pk_test_/sk_test_` y tarjetas de prueba de Stripe (**nunca cobros reales de prueba**). Detalle en `COMMERCE_ARCHITECTURE.md`.
- Sin llaves: la app muestra "El pago con tarjeta todavía no está activo" y el pedido queda guardado.

### Google / Apple sign-in
- Retirado de la app (código `socialSignIn` y variables `EXPO_PUBLIC_GOOGLE_*` eliminados). Las cuentas antiguas sin contraseña pueden eliminarse escribiendo ELIMINAR.

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
