# Integración con la API

Base: `EXPO_PUBLIC_API_URL` (`.env` / `.env.example`) → `https://finisherlegacy.com/api/v1` en producción.

Cliente central: `src/api/client.ts`. Nunca construir URLs sueltas en pantallas — siempre pasar por un módulo de `src/api/`.

## Envelope

Éxito: `{ data, message, meta: { request_id, ... } }` (`ApiSuccessEnvelope<T>`, `src/types/api.ts`). Listas paginadas: formato estándar Laravel `{ data: T[], links, meta: { current_page, last_page, ... } }` (`PaginatedResponse<T>`).

Errores: la mayoría de rutas usa `{ error: { code, message, details }, request_id }`; validación 422 usa el formato Laravel `{ message, errors }`. Una excepción real confirmada: `LegacyCodeController::claim()` devuelve sus 403/409 con el envelope de éxito (`{data:null, message}`) — `src/api/errors.ts` contempla ambos formatos.

## Autenticación

Bearer token de Sanctum, guardado únicamente en `expo-secure-store` (`src/api/secureStore.ts`, key `fl_auth_token`) — nunca AsyncStorage. El interceptor de request lo adjunta desde `authStore.token` (no desde SecureStore en cada request, por rendimiento).

## X-Request-ID

Confirmado en `App\Http\Middleware\AssignRequestId`: el backend reutiliza el `X-Request-ID` que el cliente envíe (o genera uno si no llega). `src/api/client.ts` genera un UUID por request para poder correlacionar un error con los logs del backend si es necesario.

## Rate limits confirmados

`auth/register` y `auth/login`: `throttle:api-register` / `throttle:login`. `legacy-codes/{code}` (lookup): `throttle:api-legacy-lookup`. `legacy-codes/{code}/claim`: `throttle:api-claim`. El cliente nunca dispara lookup en cada tecla (requiere submit explícito) y no reintenta agresivamente ante 429 (`AppError.kind === 'rate_limited'`).

## Endpoints y su módulo cliente

| Recurso | Módulo | Endpoints reales |
|---|---|---|
| Auth | `src/api/auth.ts` | `auth/register`, `auth/login`, `auth/logout`, `me` |
| Perfil | `src/api/profile.ts` | `GET/PATCH profile` (multipart, `_method=PATCH` spoof — Laravel no parsea PATCH multipart real) |
| Perfil público | `src/api/athletes.ts` | `athletes/{username}` |
| Medallas | `src/api/medals.ts` | CRUD completo por `uuid`, create/update multipart |
| Legacy Codes | `src/api/legacyCodes.ts` | `GET legacy-codes/{code}` (público), `POST .../claim` (🔒) |
| Eventos | `src/api/events.ts` | `events`, `events/{slug}` |
| Prerregistro | `src/api/preregistrations.ts` | `POST events/{edition}/preregister`, `GET preregistrations/{token}` |

Ver `docs/MOBILE_BACKEND_GAPS.md` para los campos/endpoints que el backend real todavía no expone (password recovery, account deletion, `event_race_id` en el detalle de evento).
