# Arquitectura

## Stack

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript · Expo Router (file-based, `src/app`) · TanStack Query · Axios · Zustand · React Hook Form + Zod · Expo SecureStore · Expo Camera · Reanimated · Gesture Handler.

**Estilos:** StyleSheet + un design system centralizado en `src/theme/tokens.ts` (colores, spacing, radius, tipografía, sombras), no NativeWind. Se evaluó NativeWind (ya estaba configurado por una sesión anterior — `tailwind.config.js`/`babel.config.js`/`metro.config.js` siguen en el repo) pero para esta fase el desarrollo continuó sobre componentes con tokens directos por simplicidad; los archivos de NativeWind no se eliminaron por si se retoma su uso.

## Carpetas

```
src/
├── api/          # axios client + un módulo por recurso (auth, medals, events, ...)
├── components/    # design system: AppText, AppButton, Screen, Card, FormInput, ...
├── hooks/         # hooks de TanStack Query + hooks de sesión/deep links
├── schemas/       # Zod schemas de formularios
├── stores/        # Zustand: authStore (sesión), uiStore (onboarding, deep link pendiente)
├── theme/         # tokens de diseño
├── types/         # tipos del contrato de API (api.ts, auth.ts, models.ts)
├── utils/         # fechas, env, logger, uuid
└── app/           # rutas Expo Router
    ├── (auth)/    # onboarding, welcome, login, register
    ├── (tabs)/    # inicio, medallas, eventos, perfil
    ├── medals/, legacy/, events/, athlete/, settings/
```

## Sesión

`src/hooks/use-session-bootstrap.ts` lee el token de SecureStore al iniciar, valida con `GET /me`, y resuelve `authStore.status` a `authenticated` o `unauthenticated` antes de ocultar el splash — nunca se ve un flash de login. `src/app/_layout.tsx` usa `Stack.Protected` para separar el árbol `(auth)` del árbol autenticado (todas las rutas que requieren sesión están declaradas explícitamente dentro de ese `Stack.Protected`, no sólo `(tabs)`).

## Manejo de errores

Cada función de `src/api/*.ts` normaliza cualquier error de Axios a una instancia de `AppError` (`src/api/errors.ts`) con un `kind` (`validation`, `unauthenticated`, `network`, etc.), mensaje en español y `fieldErrors` cuando aplica. Las pantallas nunca manejan `AxiosError` directamente. Un 401 en cualquier request autenticado limpia la sesión centralizadamente desde el interceptor de `src/api/client.ts` (con guard contra múltiples 401 simultáneos).

## Deep links

`src/hooks/use-deep-links.ts` — Expo Router ya enruta `finisherlegacy://...` automáticamente mientras el usuario está autenticado. El hook sólo cubre el caso que Router no resuelve solo: un link abierto sin sesión activa se captura en `uiStore.pendingDeepLink` y se reproduce con `router.replace` en cuanto el status pasa a `authenticated`.
