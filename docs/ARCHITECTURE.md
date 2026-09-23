# Arquitectura

## Stack

Expo SDK 57 · React Native 0.86 · React 19 (React Compiler) · TypeScript · Expo Router (file-based, `src/app`, typed routes) · TanStack Query v5 (+ persistencia en AsyncStorage) · Axios · Zustand · React Hook Form + Zod · Expo SecureStore · Expo Camera · Expo Image / Image Picker / Image Manipulator · Expo Video · Expo Notifications · Reanimated · Gesture Handler · `@stripe/stripe-react-native` (PaymentSheet) · `expo-apple-authentication` · `expo-auth-session` (Google).

**Estilos:** StyleSheet + design system en `src/theme/tokens.ts` (colores, `control` para inputs, spacing, radius, tipografía). NativeWind sigue configurado pero no se usa.

## Navegación

```
Inicio · Legacy · [ESCANEAR] · Tienda · Perfil
```

- **Inicio** — lanzadera: hero, "Primeros pasos" (guía derivada de datos reales que se oculta sola al completarse), próxima meta, última carrera (+ "Compartir como Legacy Moment"), vista previa del Legacy, CTA de escaneo, 2 momentos de la comunidad. Iconos de búsqueda (Explorar) y notificaciones (badge real de no leídas).
- **Legacy** — colección: medallas, carreras, recuerdos (tus momentos), equipo y Legacy Plates. "+" agrega cualquier cosa.
- **Escanear** — el FAB dorado central ocupa un slot real de la barra (espaciado parejo en cualquier ancho) y abre el escáner a pantalla completa.
- **Tienda** — buscador, categorías reales, lo más nuevo, catálogo; carrito con badge en la pestaña.
- **Perfil** — identidad deportiva (portada, avatar, @usuario, Legacy ID, bio, ubicación, stats tocables, Momentos/Carreras/Medallas/Equipo). Configuración sólo detrás del engrane.

Pantallas apiladas: `feed`, `explore`, `moments/[uuid]`, `moments/create` (modal), `athlete/[username]` (+ `connections`), `events/*`, `medals/*`, `my-events/*`, `gear/*`, `store/[slug]`, `cart`, `checkout`, `orders/*`, `notifications`, `support/*`, `settings/*` (cuenta, privacidad, seguridad, notificaciones, acerca de), y en `(auth)`: onboarding, welcome, login, register, forgot-password, reset-password.

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

## Sesión y seguridad

Token sólo en SecureStore. `useSessionBootstrap` valida con `GET /me` antes de ocultar el splash. El logger es silencioso en producción y nunca registra tokens, contraseñas, secretos de pago ni cuerpos de requests. Los datos de tarjeta nunca pasan por la app→Laravel: van del SDK de Stripe a Stripe.

## Archivos (fotos y videos)

`src/utils/media-file.ts`: toda foto se comprime a JPEG (≤2000 px, 80 %) y su nombre **siempre** termina en `.jpg`; los videos conservan un nombre coherente con su MIME (`video/quicktime` → `.mov`). Los límites vienen del backend (`GET /me/events/{participant}/media-entitlement`).

## Enlaces

`src/app/+native-intent.tsx` + `features/links/map-incoming-path.ts`: `finisherlegacy://athlete/u`, `finisherlegacy://moments/uuid`, `https://finisherlegacy.com/@u`, `/moments/uuid`, `/events/slug`, `/reset-password/{token}`; el retorno de 3-D Secure de Stripe (`/stripe-redirect`) se entrega al SDK sin navegar. Un enlace abierto sin sesión se guarda y se reproduce al iniciar sesión (`use-deep-links.ts`).

## Eliminación de cuenta

`DELETE /me/account` (contraseña, o escribir `ELIMINAR` en cuentas sólo Google/Apple): revoca tokens, borra perfil, fotos, momentos, comentarios, reacciones, follows, bloqueos y dispositivos push; anonimiza nombre/correo/teléfono; las medallas personales quedan privadas; pedidos y resultados oficiales se conservan de forma anónima; el usuario se soft-deletea.

## Calidad

`npm run typecheck` · `npm run lint` · `npm test` · `npx expo export --platform android` — los cuatro en CI (`.github/workflows/mobile-ci.yml`), más `expo-doctor` informativo.
