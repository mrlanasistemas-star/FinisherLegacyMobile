# Arquitectura

## Stack

Expo SDK 57 · React Native 0.86 · React 19 (React Compiler) · TypeScript · Expo Router (file-based, `src/app`, typed routes) · TanStack Query v5 (+ persistencia en AsyncStorage) · Axios · Zustand · React Hook Form + Zod · Expo SecureStore · Expo Image / Image Picker / Image Manipulator · Expo Video · Expo Notifications · Reanimated · Gesture Handler · `react-native-nfc-manager` (activación de Finisher Legacy Tags) · `expo-location` + `expo-task-manager` (seguimiento en vivo) · `expo-web-browser` (checkout OpenPay). Stripe (`@stripe/stripe-react-native`) y el inicio de sesión con Google/Apple se retiraron de la app.

**Estilos:** StyleSheet + design system en `src/theme/tokens.ts` (paleta del Manual de Identidad 2026: producto CLARO — Blanco Hueso/blanco, texto Negro Carbono, oro solo como acento; texto dorado sobre claro = `colors.accent` / Oro Profundo). Tipografía: Manrope (UI), Montserrat (títulos), Syncopate Bold (momentos de marca, solo mayúsculas). Logo único: `assets/images/brand/fl-monograma.png`. Movimiento en `src/components/motion/` (sin barril `index.ts`: se importa cada archivo directo — PressableScale, StaggerItem/listEntering, ScrollHeader, TiltCard, AnimatedCounter, BrandRefreshControl), todo en hilo UI y respetando Reduce Motion. `tailwind.config.js` refleja los tokens; NativeWind no se usa en pantallas.

## Navegación

```
Inicio · Recuerdos · [ACTIVAR] · Comunidad · Colecciones
```

Consolidación final (spec §89–97, §135). **No hay escáner QR**: los productos físicos abren la app por NFC — el Finisher Legacy Tag (terminado por el proveedor y activado digitalmente desde `/activate`, URL `/t/{code}` → `/nfc/t/[code]`) y las piezas anteriores (`/n/{token}` → `/nfc/[token]`), ver Enlaces. Finisher Legacy **ya no produce placas metálicas grabadas**; los registros históricos de Legacy Plate se siguen mostrando (Mi evento, `legacy/[code]`, `PlateCard`) pero no hay catálogo de modelos ni flujo de grabado. Los códigos impresos de piezas anteriores se siguen aceptando escribiéndolos: `/legacy/scan` conserva su nombre histórico pero ya no usa cámara (Legacy Code → `/legacy/{code}`, código `AST…` → `/gear/claim?code=`). `expo-camera` se retiró; la cámara sólo la usa Image Picker para tomar fotos.

- **Inicio** — título grande que colapsa en barra translúcida; saludo, tarjeta **Activar mi Finisher Legacy** (→ `/activate`), apoyo en vivo, pedido en curso, Primeros pasos, próxima carrera, último recuerdo, comunidad y Colecciones. Búsqueda, campana y avatar (→ Perfil).
- **Recuerdos** (ruta `legacy`) — tu historia: carreras, medallas, equipo conectado por NFC → `my-events/[participantId]`.
- **Activar** (centro) — no es pestaña: acción principal que abre `/activate` (flujo NFC).
- **Comunidad** (ruta `explore`) — feed Siguiendo/Descubrir, atletas, eventos. `/feed` redirige aquí.
- **Colecciones** (ruta `store`) — catálogo de la tienda, carrito (badge), checkout, pedidos.
- **Perfil** (ruta `profile`, fuera de la barra) — desde el avatar del encabezado.

Pantallas apiladas: `search`, `moments/[uuid]`, `moments/create` (modal), `athlete/[username]` (+ `connections`), `events/*`, `medals/*`, `my-events/*`, `gear/*`, `legacy/*`, `store/[slug]`, `cart`, `checkout`, `orders/*`, `notifications`, `support/*`, `settings/*`, `activate/*` (asistente de escritura NFC), `tracking/[participantId]` (seguimiento en vivo), `training/*` (Entrenamientos y mensajes de ánimo); `nfc/[token]` y `nfc/t/[code]` (fuera de los guards: funciona con o sin sesión); y en `(auth)`: welcome (intro de 3 pasos + CTAs; reemplaza al onboarding), login, register, forgot-password, reset-password. Solo correo + contraseña (sin Google/Apple).

**Toda ruta autenticada debe registrarse en `Stack.Protected` de `src/app/_layout.tsx`.**

## Carpetas

```
src/
├── api/          # axios client + un módulo por recurso (social.ts, account.ts, payments.ts, …)
├── app/          # rutas Expo Router (+native-intent.tsx reescribe enlaces entrantes)
├── components/   # design system (ui/), social/, profile/, guide/, events/, media/, brand/,
│                 # motion/, nfc/, tag/ (render 3D del Tag), home/, legacy/, auth/
├── features/     # lógica por dominio (la parte pura, testeada): commerce/, links/map-incoming-path,
│                 # nfc/ (activación + NDEF), notifications/, push/, social/, tracking/, training/
├── hooks/        # TanStack Query (query-keys.ts centraliza TODAS las claves)
├── payments/     # payment-flow.ts (máquina de estados, testeada), openpay-checkout.ts y
│                 # checkout-return.ts (checkout web OpenPay de un solo uso)
├── providers/    # QueryProvider (persistencia + limpieza al cerrar sesión)
├── schemas/      # Zod (auth, profile, moment)
├── stores/       # Zustand: sesión, UI local, toasts
├── theme/        # tokens
├── types/        # contrato de API (api.ts, auth.ts, models.ts, social.ts)
└── utils/        # money, dates, relative-time, media-file, network, haptics, …
```

## Contrato con el backend

Laravel (`/api/v1`) es la fuente de verdad. Todo identificador público es un **UUID o username** — la app nunca necesita una PK entera:
carrito `product_variant_uuid`, reordenar media `media_uuids[]`, prerregistro `event_race_uuid`, momentos/comentarios `uuid`, atletas `username`.

Dominios: Auth (+ reset de contraseña, Google/Apple, borrar cuenta) · Perfil (portada/avatar con quitar, visibilidad, `social` counts) · Medallas · Legacy Codes · Eventos (+ prerregistro) · Mi Historia / Event Media (+ `media-entitlement`, reorder por uuid, `.mov`) · Gear · Tienda/Carrito/Checkout/Pedidos/Pagos → ver `COMMERCE_ARCHITECTURE.md` · Social → ver `SOCIAL_ARCHITECTURE.md` · Notificaciones (`target` estructurado + `unread_count`) · Push devices · Equipo de apoyo.

## Envelope y paginación

Recurso único: `{data, message, meta:{request_id}}`. Listas:

1. **Estándar** `{data, links, meta}` — medallas, eventos, **pedidos** (corregido en backend), comentarios, seguidores/siguiendo, bloqueados. `PaginatedResponse<T>`.
2. **Cursor** `{data, links, meta:{next_cursor}}` — feed y momentos de un atleta. `CursorPage<T>`.
3. **Paginador anidado** — `/me/events`, `/me/history`, `/me/notifications`. `NestedPaginatorEnvelope<T>`.
4. **Meta plano** — `/store/products` (+ `meta.categories`), `/me/support-sessions`. `FlatMetaPaginatedResponse<T>`.

## Errores

`src/api/errors.ts` normaliza todo a `AppError` (`kind`, mensaje en español, `code`, `fieldErrors`, `details`). Un 422 de dominio (`{error:{code}}`) es `business_rule`; uno de validación (`{errors}`) es `validation`. Las pantallas nunca muestran `AxiosError`, códigos ni stack traces: usan `InlineError` (con "Reintentar"), toasts, o `ErrorState` (distingue "sin conexión" de error del servidor). Un 401 limpia la sesión centralmente.

## Offline

- **Lectura:** TanStack persiste en AsyncStorage (24 h, versionado por versión de app) sólo datos de lectura — perfil, medallas, feed, atletas, momentos, historia, explorar, eventos. Nunca carrito, pedidos ni pagos.
- **Escritura:** follow, comentario, reacción, carrito, checkout, pago, subida de archivos y edición de perfil llaman `ensureOnline()` y fallan al instante con "Sin conexión…" — nunca un éxito falso.
- Al terminar la sesión (logout, token vencido, cuenta eliminada) se borra todo el caché, en memoria y persistido.
- **Conectividad:** `onlineManager` de TanStack escucha `expo-network` (refetch automático al reconectar) y `focusManager` usa `AppState`. Queries y mutaciones usan `networkMode: 'always'`: sin caché se ve "Sin conexión" al instante (nunca un skeleton infinito) y las escrituras siguen fallando rápido con `ensureOnline()`. Explorar y Legado conservan lo guardado y muestran "Te mostramos lo último que guardamos" si una actualización falla. `OfflineBanner` global.
- Las respuestas NFC (`['nfc', …]`) nunca se persisten: un tap siempre refleja al dueño actual.

## Sesión y seguridad

Token sólo en SecureStore. `useSessionBootstrap` valida con `GET /me` antes de ocultar el splash. El logger es silencioso en producción y nunca registra tokens, contraseñas, secretos de pago ni cuerpos de requests. Los datos de tarjeta nunca pasan por la app ni por Laravel: se escriben en el formulario Openpay.js del checkout web (navegador in-app) y OpenPay los tokeniza ahí.

## Archivos (fotos y videos)

`src/utils/media-file.ts`: toda foto se comprime a JPEG (≤2000 px, 80 %) y su nombre **siempre** termina en `.jpg`; los videos conservan un nombre coherente con su MIME (`video/quicktime` → `.mov`). Los límites vienen del backend (`GET /me/events/{participant}/media-entitlement`).

## Enlaces

`src/app/+native-intent.tsx` + `features/links/map-incoming-path.ts`: `finisherlegacy://athlete/u`, `finisherlegacy://moments/uuid`, `https://finisherlegacy.com/@u`, `/moments/uuid`, `/events/slug`, `/reset-password/{token}`, `/t/{code}` (Tag), `finisherlegacy://checkout/return?order=` (vuelta del checkout OpenPay → `/orders/{uuid}`); `/stripe-redirect` de builds antiguos se ignora sin navegar. Un enlace abierto sin sesión se guarda y se reproduce al iniciar sesión (`use-deep-links.ts`). Cualquier host `https` se acepta (el sistema sólo entrega a la app los dominios verificados; staging incluido).

### NFC (spec §32–33, §88)

La etiqueta lleva `https://<dominio>/n/{token}` (token aleatorio, sin datos personales). Con la app instalada abre `/nfc/[token]` (universal link iOS / app link Android); si no, la web. También `finisherlegacy://nfc/{token}`. La pantalla funciona con o sin sesión:

1. `GET /api/v1/nfc/{token}` (público) → `{status: unclaimed|claimed|disabled, owned_by_me, can_claim, target{type,title,subtitle,image_url,web_url,profile_username,event_slug}}`.
2. **Reclamado** → tarjeta de revelación (~1 s) y navega (`features/nfc/nfc-target.ts`): perfil/Legacy Plate → `/athlete/{u}`, evento → `/events/{slug}`, producto propio → `/gear`; sin destino nativo o sin sesión → "Ver historia" (web) / "Iniciar sesión".
3. **Sin reclamar** → tarjeta de activación → login/registro (el destino `/nfc/{token}` se guarda y se repite al entrar) → `POST /api/v1/nfc/{token}/claim` → confirmación → **Mi equipo**. 409 `NFC_ALREADY_CLAIMED` → mensaje humano.
4. **Desactivado / desconocido** → explicación tranquila, nunca códigos técnicos.

Dominio: `app.config.ts` lo toma de `EXPO_PUBLIC_WEB_URL` (default producción) y genera `ios.associatedDomains: ["applinks:<dominio>"]` y un `android.intentFilters` con `autoVerify` y `pathPrefix: "/n/"`.

**INFRA REQUERIDA (no es código de la app):**
- `https://<dominio>/.well-known/apple-app-site-association` — JSON sin extensión, `Content-Type: application/json`, sin redirecciones: `{"applinks":{"details":[{"appIDs":["<TEAMID>.com.finisherlegacy.app"],"components":[{"/":"/n/*"}]}]}}`.
- `https://<dominio>/.well-known/assetlinks.json` — `[{"relation":["delegate_permission/common.handle_all_urls"],"target":{"namespace":"android_app","package_name":"com.finisherlegacy.app","sha256_cert_fingerprints":["<SHA-256 del certificado de firma de Play/EAS>"]}}]`.
- Sin esos archivos el enlace abre la web, que es el fallback correcto.

### Push

- El permiso se pide **sólo** desde una acción contextual (tarjeta "Activa los avisos" en Inicio/Notificaciones, o Ajustes → Notificaciones) — nunca al abrir la app. Lógica en `features/push/push-registration.ts`.
- Con permiso ya concedido, al iniciar sesión se refresca el token Expo en `POST /me/push-devices` en silencio (`hooks/use-push.ts › usePushLifecycle`).
- Push en primer plano: banner + refresca la campana. Tocar un push (en caliente o arranque en frío) navega con la misma regla que la lista (`features/notifications/notification-href.ts`): `data.target` → `data.action_url`/`data.url` mapeada → web; marca leída `data.notification_id`. Contrato esperado del proveedor Expo del backend: `data: {notification_id, type, target, action_url}`.
- Requiere `extra.eas.projectId` y build en teléfono físico (Expo Go no recibe push remoto).

## Eliminación de cuenta

`DELETE /me/account` (contraseña, o escribir `ELIMINAR` en cuentas sólo Google/Apple): revoca tokens, borra perfil, fotos, momentos, comentarios, reacciones, follows, bloqueos y dispositivos push; anonimiza nombre/correo/teléfono; las medallas personales quedan privadas; pedidos y resultados oficiales se conservan de forma anónima; el usuario se soft-deletea.

## Módulos retirados

- **2026-11-10 — catálogo de modelos de Legacy Plate.** El negocio ya no produce placas metálicas grabadas (el producto es el Finisher Legacy Tag NFC, terminado por el proveedor y activado en la app). Se eliminaron `src/api/legacyPlateModels.ts`, `src/hooks/use-legacy-plate-models.ts` y el tipo `LegacyPlateModel` de `src/types/models.ts` (ningún import los usaba); el backend retira `GET /api/v1/legacy-plate-models` en la misma pasada. Se conservan `LegacyPlateModelDetail`/`legacyPlate` de `/me/events/{participant}` y el tipo de producto `legacy_plate` en la tienda, porque siguen llegando datos históricos.
- En la misma limpieza, sin referencias: `src/components/ui/separator.tsx`, el barril `src/components/motion/index.ts` y `assets/images/brand/fl-logo-principal.png` (logo único en la app: `fl-monograma.png`).
- Antes: Stripe PaymentSheet (`payments/stripe.ts`), Google/Apple Sign-In, `expo-camera`/escáner QR.
- La app nunca consumió las APIs de estación (Device API), Event Ops ni incidentes de admin que el backend también retira.

## Calidad

`npm run typecheck` · `npm run lint` · `npm test` · `npx expo export --platform android` — los cuatro en CI (`.github/workflows/mobile-ci.yml`), más `expo-doctor` informativo.
