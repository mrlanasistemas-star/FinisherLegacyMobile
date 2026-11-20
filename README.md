# Finisher Legacy — App Móvil

Aplicación oficial de Finisher Legacy para Android e iOS. Expo + React Native + TypeScript + Expo Router, consumiendo la API real en `https://finisherlegacy.com/api/v1`. No hay backend propio ni datos simulados — Laravel es la única fuente de verdad.

## Requisitos

- Node.js LTS, npm
- Expo Go (desarrollo rápido) o un development build (`eas build --profile development`) si se necesita código nativo fuera de Expo Go
- Cuenta de Expo/EAS para builds (`eas login`)

## Instalación

```bash
npm install
cp .env.example .env   # ya apunta a la API de producción real
npx expo start
```

## Variables de entorno

| Variable | Descripción |
|---|---|
| `EXPO_PUBLIC_API_URL` | Base de la API v1. Sólo información pública — nunca poner secretos en variables `EXPO_PUBLIC_*`. |
| `EXPO_PUBLIC_WEB_URL` | Origen web: enlaces para compartir y dominio de los enlaces universales / App Links (`app.config.ts`). Opcional, por defecto producción. |
| `EXPO_PUBLIC_EAS_PROJECT_ID` | Solo respaldo del projectId para registrar push si la build no lo trae. |

## Desarrollo

```bash
npx expo start          # Metro + QR para Expo Go
npx expo start --android
npx expo start --ios
```

## Estructura

Ver `docs/ARCHITECTURE.md`.

## Calidad

```bash
npm run lint
npx tsc --noEmit
npx expo-doctor
```

## Builds (EAS)

```bash
eas build --platform android --profile preview      # APK interno
eas build --platform android --profile production   # AAB para Google Play
eas build --platform ios --profile production       # IPA para TestFlight / App Store
```

El proyecto EAS ya está configurado (`extra.eas.projectId` en `app.json`). Perfiles, secretos de compilación (FCM, APNs, cuenta de servicio de Play) y envío: backend `docs/DESPLIEGUE.md` §B. Cualquier cambio en `app.json` / `app.config.ts` exige una compilación nativa nueva.

## Documentación

Documentación general del producto (vigente) en el repositorio del backend
[FinisherLegacy](https://github.com/mrlanasistemas-star/FinisherLegacy):
`README.md`, `docs/FUNCIONALIDADES.md`, `docs/ARQUITECTURA.md`,
`docs/DESPLIEGUE.md`, `docs/PUBLICACION_TIENDAS.md`,
`docs/PENDIENTES_EXTERNOS.md` y `docs/CIERRE_FINAL.md`.

Guía de uso de la app, paso a paso y con capturas (para el dueño, soporte y
revisores de las tiendas): backend `docs/GUIA_DE_LA_APP.md`.

En este repositorio:

- `docs/store/` — **fuente única para publicar en las tiendas** (fichas, Data safety, App Privacy, notas de revisión, capturas, pendientes externos).
- `docs/ARCHITECTURE.md` — estructura de la app.
- `docs/COMMERCE_ARCHITECTURE.md` — tienda, pago OpenPay en navegador, compras dentro de la app, envío y cancelación.
- `docs/NFC_ACTIVATION.md` — activación del Finisher Legacy Tag por NFC y matriz de pruebas.
- `docs/LIVE_TRACKING.md`, `docs/TRAINING_AUDIO.md`, `docs/SOCIAL_ARCHITECTURE.md` — seguimiento en vivo, audio de entrenamiento, comunidad.
- `docs/DEVICE_QA.md`, `docs/RELEASE_CHECKLIST.md` — verificación en dispositivo y checklist técnico.
- `docs/historico/` — planes y auditorías antiguas; **no son decisiones vigentes**.
