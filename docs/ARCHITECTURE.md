# Arquitectura

## Stack

Expo SDK 57 · React Native 0.86 · React 19 · TypeScript · Expo Router (file-based, `src/app`) · TanStack Query · Axios · Zustand · React Hook Form + Zod · Expo SecureStore · Expo Camera · Expo Image Picker · Expo Image Manipulator (compresión client-side) · Expo Video · Expo Notifications · Reanimated · Gesture Handler.

**Estilos:** StyleSheet + un design system centralizado en `src/theme/tokens.ts` (colores, spacing, radius, tipografía, sombras), no NativeWind. Se evaluó NativeWind (ya estaba configurado por una sesión anterior — `tailwind.config.js`/`babel.config.js`/`metro.config.js` siguen en el repo) pero el desarrollo continuó sobre componentes con tokens directos por simplicidad; los archivos de NativeWind no se eliminaron por si se retoma su uso.

## Carpetas

```
src/
├── api/          # axios client + un módulo por recurso
├── components/    # design system + componentes de dominio (gear-card, product-card, media/, ...)
├── features/      # arquitectura preparada para dominios sin backend real (community/, moments/) — feature-flagged OFF
├── hooks/         # hooks de TanStack Query + hooks de sesión/deep links
├── payments/      # PaymentGatewayAdapter — abstracción sobre el gateway de pago online
├── schemas/       # Zod schemas de formularios
├── stores/        # Zustand: authStore (sesión), uiStore (onboarding, mascot tips vistos, deep link pendiente, pushDeviceUuid)
├── theme/         # tokens de diseño
├── types/         # tipos del contrato de API (api.ts, auth.ts, models.ts)
├── utils/         # fechas, env, logger, uuid, money, image-compress
└── app/           # rutas Expo Router — TODA ruta autenticada debe registrarse explícitamente en
                    # `Stack.Protected` dentro de src/app/_layout.tsx, no basta con crear el archivo
    ├── (auth)/    # onboarding, welcome, login, register
    ├── (tabs)/    # inicio, medallas (Legacy Vault), eventos, perfil
    ├── medals/, legacy/, events/, athlete/, settings/
    ├── my-events/  # Mi Historia — timeline + detalle de participación + media
    ├── gear/       # Digital Closet — mi equipo + claim QR/manual
    ├── store/, cart/, checkout/, orders/   # ecosistema comercial
    ├── notifications/, support/            # inbox + Mi Equipo de Apoyo
```

## API real — dominios cubiertos

**Auth/Profile/Medals/Legacy Codes/Events/Preregistrations/Public Athlete** — base original, sin cambios de contrato en esta pasada.

**My Events/History** (`src/api/meEvents.ts`) — `GET /me/events`/`/me/history` (mismo controller, mismo Query — `me/history` acepta los mismos filtros), `GET /me/events/{participant}` (detalle bundleado: resultado+splits, medallas, Legacy Plate, media, gear, compras, sesión de apoyo — una sola llamada).

**Event Media** (`src/api/eventMedia.ts`) — `GET/POST /me/events/{participant}/media`, `PATCH/DELETE /me/media/{uuid}`. Límites reales (`config('finisher.event_media')`, nunca hardcodeados por adivinanza): 5 imágenes/1 video gratis por participación, 8MB/100MB máx, `image/jpeg|png|webp` + `video/mp4|webm`. Reorder (`POST .../media/reorder`) **no implementado** — gap real de backend, ver `MOBILE_BACKEND_REQUIREMENTS.md` P0.

**Event Gear** (`src/api/eventGear.ts`) — gear usado en una participación específica, distinto del Digital Closet general.

**Gear / Digital Closet** (`src/api/gear.ts`) — `GET /me/gear`, `POST /gear/{code}/claim`, `GET /gear/{code}` (público, sin PII). El QR de gear codifica la URL cruda de la API (`/api/v1/gear/{code}`), formato distinto al de Legacy Code (`/l/{code}`) — parsers separados, nunca reutilizados entre sí.

**Store/Cart/Checkout/Orders/Payments** (`src/api/storeProducts.ts`, `cart.ts`, `checkout.ts`, `orders.ts`, `payments.ts`) — catálogo público, carrito/checkout/pedidos autenticados. **"Agregar al carrito" deshabilitado honestamente** — gap real de backend (`product_variant_id` entero nunca expuesto), ver `MOBILE_BACKEND_REQUIREMENTS.md` P0. Checkout usa `Idempotency-Key` generado antes del primer intento y reutilizado en reintentos del mismo intento (`src/hooks/use-checkout.ts`). Pagos vía `src/payments/gateway-adapter.ts` — gateway-agnostic, sin `@stripe/stripe-react-native` instalado (sin llaves reales que probar contra), maneja el 501 "gateway no configurado" honestamente.

**Legacy Plate Models** (`src/api/legacyPlateModels.ts`) — catálogo público, usado en la selección de modelo de placa dentro del flujo de compra de `legacy_plate`.

**Notifications/Push** (`src/api/notifications.ts`, `pushDevices.ts`) — inbox con badge de no-leídos derivado client-side (no existe endpoint de conteo). Push es persistencia real en backend; delivery real depende de `extra.eas.projectId` (existe en `app.json`) y de que el backend reemplace su `NullPushNotificationGateway` — ver `MOBILE_BACKEND_REQUIREMENTS.md` P1.

**Support** (`src/api/support.ts`) — "Mi Equipo de Apoyo": sesiones, manifest (metadata sin contenido, para no arruinar sorpresas), triggered (contenido real una vez disparado), mensajes de audio reproducidos vía `expo-video`'s `useVideoPlayer` en modo sólo-audio (sin instalar `expo-av`/`expo-audio`).

## Sesión

`src/hooks/use-session-bootstrap.ts` lee el token de SecureStore al iniciar, valida con `GET /me`, y resuelve `authStore.status` a `authenticated` o `unauthenticated` antes de ocultar el splash — nunca se ve un flash de login. `src/app/_layout.tsx` usa `Stack.Protected` para separar el árbol `(auth)` del árbol autenticado — **toda ruta autenticada debe declararse explícitamente ahí**, no sólo `(tabs)`; añadir una carpeta bajo `src/app/` sin registrar su `Stack.Screen` la deja fuera del guard de autenticación.

## Manejo de errores

Cada función de `src/api/*.ts` normaliza cualquier error de Axios a una instancia de `AppError` (`src/api/errors.ts`) con un `kind`, mensaje en español, y opcionalmente `fieldErrors`/`code`/`details`. Las pantallas nunca manejan `AxiosError` directamente. Un 401 en cualquier request autenticado limpia la sesión centralizadamente desde el interceptor de `src/api/client.ts` (con guard contra 401 simultáneos).

**`kind` no se decide sólo por status HTTP** — un 422 puede ser `validation` (Laravel `ValidationException`, shape `{message, errors}`) o `business_rule` (una `App\Exceptions\Api\ApiException` de dominio — `COUPON_NOT_APPLICABLE`, `MEDIA_LIMIT_REACHED`, `PRODUCT_OUT_OF_STOCK`, etc. — shape `{error:{code,message,details}}`, la misma que usan los demás status). `toAppError()` distingue por la forma real del body (¿tiene `errors`? ¿tiene `error.code`?), nunca asume por el status code solo — confirmado leyendo `App\Support\Api\ApiExceptionRenderer`, que envuelve cualquier `ApiException` igual sin importar el status. Código que necesite reaccionar a un error de negocio específico debe leer `error.code` (y `error.details` cuando aplica, p. ej. `details.reason` de un cupón rechazado), nunca comparar `error.message`.

## Envelope y paginación

Éxito de recurso único: `{data, message, meta:{request_id}}`. Listas: **tres formas distintas conviven en la API real** (verificado leyendo cada controller, no asumido uniforme):

1. **Estándar** (`ResourceCollection::response()`) — `/medals`, `/events`, `/athletes` — `{data:[], links:{first,last,prev,next}, meta:{current_page,last_page,per_page,total}}`. `PaginatedResponse<T>` en `src/types/api.ts`.
2. **Paginador crudo anidado** (`respond($paginator)` sin pasar por Resource) — `/me/events`, `/me/history`, `/me/notifications` — el paginador de Laravel completo queda anidado en `data.data`, con `current_page`/`per_page`/`last_page`/`total` dentro de `data`, no en `meta`. `NestedPaginatorEnvelope<T>`.
3. **Meta plano** (`respond(collection, meta:[...])`) — `/store/products`, `/me/support-sessions` — `data` plano, `meta` sólo con `current_page`/`last_page`/`total`. `FlatMetaPaginatedResponse<T>`.

Cada módulo de `src/api/*.ts` usa el tipo correcto para su endpoint — nunca asumir que todas las listas se ven igual. `GET /orders` es un caso aparte: por un bug real de backend (ver `MOBILE_BACKEND_REQUIREMENTS.md` P0), no expone metadata de paginación en absoluto; `src/api/orders.ts` usa un heurístico ("página llena de 20 → puede haber más") en vez de fingir un total.

## Deep links

`src/hooks/use-deep-links.ts` — Expo Router enruta `finisherlegacy://...` automáticamente mientras el usuario está autenticado. El hook cubre el caso que Router no resuelve solo: un link abierto sin sesión activa se captura en `uiStore.pendingDeepLink` y se reproduce con `router.replace` en cuanto el status pasa a `authenticated`. `action_url` de una notificación (`GET /me/notifications`) se resuelve con la misma lógica cuando es un path interno; si no, se abre externamente.

## Rutas EAS / distribución

`extra.eas.projectId` existe en `app.json` (`eas init` ya se corrió). `ios.supportsTablet` está deliberadamente en `false` para V1 — ningún layout de la app se diseñó ni verificó específicamente para tablet; ver `RELEASE_CHECKLIST.md`.

## Comunidad / Legacy Moments

`src/features/community/`, `src/features/moments/` — sólo tipos TypeScript anticipados y un flag (`COMMUNITY_ENABLED = false`). El backend no tiene follow/feed/moments/likes/comments hoy — ver `MOBILE_BACKEND_REQUIREMENTS.md` P2. No hay ninguna pantalla ni hook construido contra esto; construirlos antes de que el backend exista significaría fingir una red social o dejar código muerto.
