> **Histórico/superseded** — este documento cubre sólo FASE 0-15 (auth/profile/medals/legacy/events, previo a la sincronización completa con el ecosistema de tienda/media/comunidad). Para el estado actual del proyecto ver [`ARCHITECTURE.md`](./ARCHITECTURE.md); para deuda de backend ver [`MOBILE_BACKEND_REQUIREMENTS.md`](./MOBILE_BACKEND_REQUIREMENTS.md); para checklist de publicación ver [`RELEASE_CHECKLIST.md`](./RELEASE_CHECKLIST.md). Se conserva sin cambios por su valor histórico (contrato de API confirmado en su momento, identidad de marca, estado por fase original).

# Mobile Implementation Plan

Plan corto de FASE 0, basado en la auditoría real del backend `C:\wamp64\www\finisherLegacy` (Laravel 13 + Sanctum) y del proyecto móvil ya scaffoldeado con `create-expo-app` (Expo SDK 57, Router, TS, tabs template).

## Estado inicial del proyecto móvil

Ya existe un proyecto Expo Router (SDK ~57) con el template default de tabs (`src/app`, `src/components`, `src/constants/theme.ts`, `src/hooks`). Se reutiliza la base (package.json, app.json, tsconfig, Reanimated/Gesture Handler ya instalados) y se reemplaza el contenido de ejemplo por la app real. No se re-crea el proyecto desde cero.

Dependencias ya presentes: `expo-router`, `expo-image`, `expo-linking`, `expo-splash-screen`, `expo-status-bar`, `expo-system-ui`, `react-native-reanimated` 4.5.1, `react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-screens`.

Dependencias a agregar vía `npx expo install`/npm: `@tanstack/react-query`, `axios`, `zustand`, `expo-secure-store`, `react-hook-form`, `zod`, `@hookform/resolvers`, `expo-camera`, `expo-haptics`, `nativewind` + `tailwindcss`, `lucide-react-native` + `react-native-svg`.

## Contrato de API confirmado (fuente: código real, no docs adivinadas)

Base: `https://finisherlegacy.com/api/v1`. Auth: Sanctum Bearer token (no expira, se revoca con logout). Envelope de éxito `{ data, message, meta }`, error unificado `{ error: { code, message, details }, request_id }` excepto 422 (formato Laravel estándar `{ message, errors }`). Detalle completo por endpoint en el historial de auditoría de esta sesión; resumen operativo:

- **Auth**: `POST auth/register` (first_name, last_name, email, password, password_confirmation), `POST auth/login` (email, password), `POST auth/logout` 🔒, `GET me` 🔒.
- **Perfil**: `GET profile` 🔒 (puede ser `null`), `PATCH profile` 🔒 multipart (username, bio, city, state, country, main_sport_id, profile_visibility, profile_photo, cover_photo).
- **Perfil público**: `GET athletes/{username}` — `{ profile, stats, medals[] }`.
- **Medallas** 🔒: CRUD completo por `uuid`. Crear/editar es multipart (front_image requerida en create, back_image y gallery_images opcionales, story, visibility, distance_label, official_time, pace, etc).
- **Legacy Codes**: `GET legacy-codes/{code}` público (lookup, no consume medalla), `POST legacy-codes/{code}/claim` 🔒. El QR físico codifica la URL `https://finisherlegacy.com/l/{code}`, no el código plano — el parser del scanner debe extraer el code de esa URL además de aceptar el code plano tecleado.
- **Eventos**: `GET events` (paginado, `EventEditionCardResource`), `GET events/{slug}`.
- **Prerregistro**: `POST events/{edition}/preregister`, `GET preregistrations/{token}`.
- **Health**: `GET health` público.
- **Event Ops / Device API / Integrations**: existen pero son fuera de alcance V1 (personal operativo), confirmado por `can:operator.access` / `device.token` middleware — no se tocan.

Rate limits reales: login/register 5/min, legacy lookup 30/min/IP, legacy claim 10/min/usuario, resto autenticado 60/min. El cliente debe evitar loops de reintento y nunca consultar lookup por cada tecla.

## Identidad de marca confirmada (fuente: `resources/css/app.css`, `public/images/brand/`)

Tema único oscuro — negro/grafito/dorado, sin modo claro alterno:

- `fl-black` `hsl(240 8% 4%)`, `fl-graphite` `hsl(240 6% 10%)`, `fl-graphite-light` `hsl(240 5% 16%)`
- `fl-gold` `hsl(42 55% 58%)`, `fl-gold-soft` `hsl(42 65% 72%)`, `fl-gold-dim` `hsl(42 30% 42%)`
- Texto principal `hsl(0 0% 96%)`, borde `hsl(240 5% 18%)`, destructive `hsl(0 72% 55%)`
- Tipografía: Instrument Sans
- Radio base 8px, motion `cubic-bezier(0.16,1,0.3,1)`, duraciones 160/280/600/1100ms

Assets reales reutilizables ya en el repo backend: `public/images/brand/logo/logo-mark-gold.png` (icono), `logo-horizontal-light.png` (navbar/auth), mascota `public/images/brand/mascot/mascot-hero.jpeg`. Estos se copian al proyecto móvil (no se referencian por URL remota) para app icon, splash y estados vacíos.

## Gaps del backend

Ver `docs/MOBILE_BACKEND_GAPS.md` — password recovery y account deletion no existen en `/api/v1`. Account deletion es bloqueante para publicación en tiendas; se documenta y se avanza con todo lo demás.

## Plan de fases

Se sigue el orden de FASE 1 a FASE 15 tal como está definido en `AGENTS.md` §67+. Este documento no repite ese detalle; se actualizará con notas breves de progreso real conforme cada fase se complete, evitando documentación redundante.

## Estado por fase

- ✅ **FASE 0 — Auditoría**: completa (este documento + `MOBILE_BACKEND_GAPS.md`).
- ✅ **FASE 1 — Foundation**: cliente API, tipos, manejo de errores (`AppError`), stores (`authStore`, `uiStore`), theme tokens, providers, `.env`.
- ✅ **FASE 2 — Auth**: splash, onboarding (3 slides, se guarda localmente), welcome, login, register, restauración de sesión (`GET /me` al abrir), logout. Todo contra la API real.
- ✅ **FASE 3 — Shell + Design System**: tabs (Inicio/Medallas/Eventos/Perfil), `AppText`, `AppButton`, `FormInput`, `Card`, `EmptyState`, `ErrorState`, `Skeleton`, `ScreenHeader`.
- ✅ **FASE 4 — Home**: saludo, Legacy ID si existe, accesos rápidos a Vault/Scanner/Eventos. Sin métricas inventadas.
- ✅ **FASE 5 — Legacy Vault + Medals CRUD**: grid con paginación/pull-to-refresh/skeleton/empty/error, detalle, crear (origen manual), editar, eliminar con confirmación. **Pendiente**: crear medalla con origen "registered" (requiere selector de evento/edición/carrera — se decidió no construirlo en esta pasada por alcance, no es un gap de backend).
- ✅ **FASE 6 — Legacy Code**: scanner QR con permisos/torch/anti-doble-lectura, entrada manual, lookup, claim con animación y haptics, invalidación de cache de medallas.
- ✅ **FASE 7 — Eventos**: lista con paginación, detalle con distancias reales. Prerregistro con CTA deshabilitado — ver gap #3 en `MOBILE_BACKEND_GAPS.md`.
- ✅ **FASE 8 — Perfil**: perfil propio, editar perfil (con fotos), perfil público por username, Ajustes (privacidad/acerca de/cuenta/logout).
- ✅ **FASE 9 — Deep Links**: scheme `finisherlegacy://` configurado; `useDeepLinks` captura y reproduce el destino pendiente si el link llega sin sesión. Universal Links/App Links (HTTPS) documentados como pendientes de credenciales reales en `STORE_RELEASE_CHECKLIST.md`.
- ⚠️ **FASE 10/11/12 — Responsive/Android/iOS QA**: auditoría por código completa (ver `RESPONSIVE_QA.md`); falta verificación visual en dispositivos/simuladores reales.
- ✅ **FASE 13 — Release preparation**: `app.json` con bundle id/package/scheme/splash/permisos reales, `eas.json` con perfiles development/preview/production.
- ✅ **FASE 14 — Hardening**: `npx tsc --noEmit`, `npx expo lint`, `npx expo-doctor` limpios; suite de pruebas (`npm test`) cubriendo parser de errores de API, parser de Legacy Code, fechas y schemas de auth.
- ✅ **FASE 15 — Build ready**: el proyecto exporta bundle sin errores (`npx expo export`); listo para `eas build --profile preview`, pendiente sólo de `eas login`/`eas init` con una cuenta real.
