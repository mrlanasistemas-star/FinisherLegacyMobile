# Arquitectura

## Stack

Expo SDK 57 · React Native 0.86 · React 19 (React Compiler) · TypeScript · Expo Router (file-based, `src/app`, typed routes) · TanStack Query v5 (+ persistencia en AsyncStorage) · Axios · Zustand · React Hook Form + Zod · Expo SecureStore · Expo Image / Image Picker / Image Manipulator · Expo Video · Expo Notifications · Reanimated · Gesture Handler · `@stripe/stripe-react-native` (PaymentSheet) · `expo-apple-authentication` · `expo-auth-session` (Google).

**Estilos:** StyleSheet + design system en `src/theme/tokens.ts` (colores, `control` para inputs, spacing, radius, tipografía). NativeWind sigue configurado pero no se usa.

## Navegación

```
Inicio · Explorar · [LEGADO] · Tienda · Perfil
```

Consolidación final (spec §89–97, §135). **No hay escáner QR**: los productos físicos (Legacy Plate, prendas, accesorios) abren la app por NFC (`/nfc/[token]`, ver Enlaces). Los códigos impresos de piezas anteriores se siguen aceptando escribiéndolos: `/legacy/scan` conserva su nombre histórico pero ya no usa cámara (Legacy Code → `/legacy/{code}`, código `AST…` → `/gear/claim?code=`). `expo-camera` se retiró; la cámara sólo la usa Image Picker para tomar fotos.

- **Inicio** — página personal, no dashboard: saludo, apoyo en vivo (sesión de apoyo activa/abierta), chip del pedido en curso, "Primeros pasos", tu próxima carrera (cuenta regresiva) o el próximo evento público, tu último capítulo (tarjeta grande), aviso contextual para activar push, 3 momentos de tu comunidad en filas compactas y lo nuevo de la tienda. Búsqueda (`/search`) y campana con badge real.
- **Explorar** — la comunidad: Siguiendo / Descubrir (feed con cursor `meta.next_cursor`, FlatList afinada para media, pull-to-refresh, reacciones optimistas, mensajes de apoyo en bottom sheet, compartir, atletas para seguir con follow optimista) y Eventos (descubrimiento). `/feed` redirige aquí.
- **Legado** (centro, medallón dorado elevado) — tu historia: cifras, **Mi equipo** (productos conectados por NFC), medallas y la línea de tiempo por año con tarjetas grandes → historia del evento (`my-events/[participantId]`: resultado, recuerdos, equipo usado, Legacy Plate, apoyo).
- **Tienda** — catálogo, carrito, checkout, pedidos.
- **Perfil** — identidad deportiva + atajos "Mis pedidos · Mi equipo · Privacidad"; cuenta, avisos, seguridad y cerrar sesión detrás del engrane.

Pantallas apiladas: `search`, `moments/[uuid]`, `moments/create` (modal), `athlete/[username]` (+ `connections`), `events/*`, `medals/*`, `my-events/*`, `gear/*`, `legacy/*`, `store/[slug]`, `cart`, `checkout`, `orders/*`, `notifications`, `support/*`, `settings/*`; `nfc/[token]` (fuera de los guards: funciona con o sin sesión); y en `(auth)`: onboarding, welcome, login, register, forgot-password, reset-password.

**Toda ruta autenticada debe registrarse en `Stack.Protected` de `src/app/_layout.tsx`.**

## Carpetas

```
src/
├── api/          # axios client + un módulo por recurso (social.ts, account.ts, payments.ts, …)
├── app/          # rutas Expo Router (+native-intent.tsx reescribe enlaces entrantes)
├── components/   # design system (ui/), social/, profile/, guide/, events/, media/, brand/
├── features/     # lógica pura y testeada: social/moment-state, commerce/order-timeline,
│                 # links/map-incoming-path, auth/social-sign-in
├── hooks/        # TanStack Query (query-keys.ts centraliza TODAS las claves)
├── payments/     # payment-flow.ts (máquina de estados, testeada) + stripe.ts (PaymentSheet)
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

Token sólo en SecureStore. `useSessionBootstrap` valida con `GET /me` antes de ocultar el splash. El logger es silencioso en producción y nunca registra tokens, contraseñas, secretos de pago ni cuerpos de requests. Los datos de tarjeta nunca pasan por la app→Laravel: van del SDK de Stripe a Stripe.

## Archivos (fotos y videos)

`src/utils/media-file.ts`: toda foto se comprime a JPEG (≤2000 px, 80 %) y su nombre **siempre** termina en `.jpg`; los videos conservan un nombre coherente con su MIME (`video/quicktime` → `.mov`). Los límites vienen del backend (`GET /me/events/{participant}/media-entitlement`).

## Enlaces

`src/app/+native-intent.tsx` + `features/links/map-incoming-path.ts`: `finisherlegacy://athlete/u`, `finisherlegacy://moments/uuid`, `https://finisherlegacy.com/@u`, `/moments/uuid`, `/events/slug`, `/reset-password/{token}`; el retorno de 3-D Secure de Stripe (`/stripe-redirect`) se entrega al SDK sin navegar. Un enlace abierto sin sesión se guarda y se reproduce al iniciar sesión (`use-deep-links.ts`). Cualquier host `https` se acepta (el sistema sólo entrega a la app los dominios verificados; staging incluido).

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

## Calidad

`npm run typecheck` · `npm run lint` · `npm test` · `npx expo export --platform android` — los cuatro en CI (`.github/workflows/mobile-ci.yml`), más `expo-doctor` informativo.
