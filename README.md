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
eas build --platform android --profile preview
eas build --platform ios --profile preview
eas build --platform all --profile production
```

Requiere `eas login` con una cuenta real y `eas init` para generar el `projectId` — ver `docs/STORE_RELEASE_CHECKLIST.md` para todo lo que depende de cuentas externas (Apple Developer, Google Play Console).

## Documentación

- `docs/MOBILE_IMPLEMENTATION_PLAN.md` — plan y estado por fase
- `docs/MOBILE_BACKEND_GAPS.md` — lo que el backend real todavía no expone
- `docs/ARCHITECTURE.md` — estructura del proyecto
- `docs/API_INTEGRATION.md` — contrato de API confirmado
- `docs/RESPONSIVE_QA.md` — estado de QA responsive
- `docs/STORE_RELEASE_CHECKLIST.md` — qué falta para publicar en las tiendas
