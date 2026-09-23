> **OBSOLETO (2026-09-23).** Todos los huecos de backend listados aquí se cerraron en la pasada "Full Product Completion" (carrito por UUID, paginación de pedidos, reorder de media por UUID, UUID de carrera para prerregistro, borrar cuenta, reset de contraseña, Google/Apple, Stripe PaymentSheet, capa social Legacy Moments). Se conserva sólo como historial — estado actual: `ARCHITECTURE.md`, `COMMERCE_ARCHITECTURE.md`, `SOCIAL_ARCHITECTURE.md`, `RELEASE_CHECKLIST.md`.

# Mobile Backend Requirements

Deuda real, verificada leyendo el backend actual (`C:\wamp64\www\finisherLegacy`), que bloquea que una función de Mobile sea 100% real en vez de un estado honesto de "no disponible todavía". Cada sección corresponde a una función ya implementada en Mobile que consume la API real, pero que tiene un límite externo (contrato/cuenta/credenciales) documentado en vez de fingido. Organizado por prioridad; el detalle técnico exacto (snippets PHP reales, diffs mínimos) vive dentro de cada item, no se resume.

---

## P0 — Before Store (bloquea que una función ya construida sea 100% real)

### 1. Account deletion — sin endpoint API

Sólo existe `DELETE settings/profile` (`routes/settings.php`), ruta web de sesión Inertia (`App\Http\Controllers\Settings\ProfileController::destroy`), protegida por `ProfileDeleteRequest`. No hay equivalente token-based bajo `/api/v1`.

**Prioritario antes del lanzamiento** — Apple/Google exigen un mecanismo de eliminación de cuenta accesible desde dentro de la app cuando esta permite crear cuentas.

**Cambio mínimo requerido:**

```
DELETE /api/v1/account   { password }  🔒 -> 200/204
```

Reutilizando la misma validación de `ProfileDeleteRequest` (confirma password) y la misma lógica de borrado que `Settings\ProfileController::destroy` — nunca una segunda implementación de borrado de cuenta.

**Mientras tanto:** `src/app/settings/account.tsx` documenta el canal real de contacto (`hola@finisherlegacy.com`) en vez de fingir un botón de borrado funcional.

### 2. Password reset — sin endpoint API

No hay ninguna ruta bajo `routes/api.php` para forgot/reset password. Sólo existe el flujo web de Fortify (sesión), no expuesto vía token API.

**Cambio mínimo requerido (si se decide implementar):**

```
POST /api/v1/auth/forgot-password   { email }        -> 200 (siempre, no revela si el email existe)
POST /api/v1/auth/reset-password    { email, token, password, password_confirmation } -> 200
```

Reutilizando `Illuminate\Auth\Passwords\PasswordBroker` / las mismas notificaciones que ya usa Fortify — nunca una segunda implementación de generación de tokens de reseteo.

**Mientras tanto:** el enlace "¿Olvidaste tu contraseña?" en Login es honesto sobre su estado (toast "función no disponible todavía"), nunca finge un envío de correo.

### 3. Tienda — "Agregar al carrito" está bloqueado por un campo faltante

**Verificado leyendo el código real.** `POST /cart/items` (`App\Http\Requests\Api\AddCartItemRequest`) exige:

```php
'product_variant_id' => ['required', 'integer', 'exists:product_variants,id'],
```

Es decir, la **primary key entera** de `product_variants`, no el `uuid`. Pero la única forma en que Mobile ve una variante — `App\Http\Resources\Api\V1\ProductVariantResource::toArray()` — expone:

```php
['uuid' => ..., 'sku' => ..., 'name' => ..., 'attributes' => ..., 'base_price_minor' => ..., 'currency' => ..., 'active' => ..., 'in_stock' => ...]
```

**Nunca un `id` numérico.** No hay ninguna otra ruta/campo en `/api/v1` que exponga ese id para una variante dada. Con el contrato actual, **es imposible construir un `POST /cart/items` válido desde Mobile**.

Mismo problema en `LegacyPlateModelResource` (`GET /legacy-plate-models`): expone `uuid, name, slug, description, width_mm, height_mm, preview_image_url` pero `AddCartItemRequest` exige `legacy_plate_model_id` entero (`exists:legacy_plate_models,id`) para líneas tipo `legacy_plate`. Mismo bloqueo.

**Cambio mínimo requerido (recomendado: preferir UUID público, no exponer más PKs — ver §"Recomendación de identificadores" al final de este documento):**

```diff
 // App\Http\Requests\Api\AddCartItemRequest
-    'product_variant_id' => ['required', 'integer', 'exists:product_variants,id'],
+    'product_variant_uuid' => ['required', 'uuid', 'exists:product_variants,uuid'],
```

(y el mismo cambio para `legacy_plate_model_id` → `legacy_plate_model_uuid`). Alternativa menos preferida si el equipo backend decide no evitar exponer la PK: agregar `'id' => $this->id` a `ProductVariantResource`/`LegacyPlateModelResource`.

**Mientras tanto:** `src/app/store/[slug].tsx` muestra catálogo, galería, detalle y selector de variante/cantidad completos con datos reales, pero "Agregar al carrito" queda deshabilitado con un mensaje honesto — nunca envía un id inventado, nunca convierte el `uuid` a un número, nunca usa un índice de array como id. El resto del carrito/checkout/pedidos ya está implementado contra la API real y funcionará sin ningún cambio en Mobile en cuanto este campo exista.

### 4. Event Media — reorder bloqueado por el mismo patrón uuid-vs-id

**Verificado leyendo el código real.** `POST /me/events/{participant}/media/reorder` (`Me\EventMediaController::reorder`):

```php
$mediaIds = array_values(array_map(fn (mixed $id) => (int) $id, $request->array('media_ids')));
$reorder->handle($participant, $mediaIds);
// App\Actions\Media\ReorderAthleteEventMedia::handle():
$participant->media()->whereKey($mediaId)->update(['sort_order' => $index]);
```

`whereKey()` es la primary key entera de `athlete_event_media`. Pero `AthleteEventMediaResource::toArray()` — la única forma en que Mobile ve un item de media — expone únicamente `uuid, type, url, width, height, duration_seconds, is_public, sort_order`. Sin `id`. Mismo bloqueo exacto que el carrito.

**Cambio mínimo requerido (preferir uuids en el body, no exponer la PK):**

```diff
 // Me\EventMediaController::reorder()
-$mediaIds = array_values(array_map(fn (mixed $id) => (int) $id, $request->array('media_ids')));
-$reorder->handle($participant, $mediaIds);
+$mediaUuids = $request->array('media_uuids');
+$reorder->handle($participant, $mediaUuids); // ReorderAthleteEventMedia resuelve por uuid internamente
```

**Mientras tanto:** la galería (`src/app/my-events/[participantId].tsx`, `src/components/media/media-grid.tsx`) se muestra ordenada por el `sort_order` que el servidor ya tiene, pero no hay drag-to-reorder persistente — no existe ningún endpoint al que ese gesto pudiera llamar honestamente. No se implementó un "orden visual temporal no persistente" tampoco, para no crear la falsa impresión de que el cambio se guardó.

### 5. Pedidos — `GET /orders` pierde toda la metadata de paginación (bug real)

**Verificado leyendo el código real.** `App\Http\Controllers\Api\V1\Store\OrderController::index()`:

```php
$orders = Order::query()->where('user_id', ...)->with('items')->orderByDesc('created_at')->paginate(20);
return $this->respond(OrderResource::collection($orders));
```

A diferencia de `MedalController::index()`/`EventController::index()`, que devuelven `->response()` sobre la colección (activa `PaginatedResourceResponse` de Laravel → sobre estándar `{data:[], links, meta:{current_page,last_page,per_page,total}}`), aquí `OrderResource::collection($orders)` se pasa tal cual al helper `respond()` compartido. Al serializar así (no vía `toResponse()`), Laravel **descarta toda la información de paginación**. La respuesta real:

```json
{ "data": [ /* hasta 20 orders de la página pedida */ ], "message": null, "meta": { "request_id": "..." } }
```

El servidor sigue respetando `?page=N` (Laravel lo resuelve de la query string), pero el cliente nunca sabe si existe una página siguiente.

**Cambio mínimo requerido (una línea, mismo patrón que `MedalController`/`EventController`):**

```diff
-return $this->respond(OrderResource::collection($orders));
+return OrderResource::collection($orders)->response();
```

**Mientras tanto:** `src/api/orders.ts` documenta esto y usa un heurístico honesto ("si la página trajo exactamente 20, puede que haya más") en vez de fingir un total.

---

## P1 — Requiere configuración/credenciales externas, o gap real no bloqueante

### 1. Login con Google — sin backend

Verificado: `composer.json` no tiene `laravel/socialite`, no hay `config/services.php` con credenciales de Google, ni ninguna ruta que mencione Google en `routes/`. Gap real de backend, no sólo de Mobile.

**Lo que se necesita:**

1. **Google Cloud Console** (cuenta externa): proyecto OAuth con pantalla de consentimiento, Client ID tipo Web (para que el backend verifique el `id_token`), y si se usa SDK nativo, también Client ID iOS/Android (con el SHA-1 del keystore de `eas build` de producción — sólo existe una vez que exista un build real).
2. **Backend Laravel** (reutilizando arquitectura existente):
   - `composer require laravel/socialite` (o verificar `id_token` directamente con `google/apiclient`).
   - Migración: `users.google_id` (nullable, único), `users.password` pasa a nullable.
   - Nuevo endpoint, mismo patrón que `AuthController`:
     ```
     POST /api/v1/auth/google   { id_token }   -> { user, token }  (misma respuesta que /auth/login)
     ```
     Reutilizando `App\Actions\Athletes\EnsureAthleteForUser` y `LegacyIdService` para crear un atleta nuevo — nunca una segunda implementación.
   - Decisión de producto pendiente: si un email ya registrado con password intenta entrar con Google, ¿se vincula automáticamente o se rechaza?
3. **Mobile** — ya preparado para conectarse en cuanto el endpoint exista: `expo-auth-session` (flujo web/AuthSession, compatible con Expo Go; el flujo 100% nativo requiere development build). El botón "Continuar con Google" existe pero está oculto/deshabilitado honestamente (ver §"Google/Apple UX" abajo) en vez de intentar una llamada que fallaría.
4. **Apple** — si se ofrece Google en iOS, App Store Review Guideline 4.8 normalmente exige ofrecer también Sign in with Apple igual de visible. Resolver ambos juntos cuando se aborde Google, para no bloquear la revisión de iOS.

### 2. Login con Apple — sin backend

Mismo estado que Google: sin backend, sin credenciales. Ver nota de Guideline 4.8 arriba — si Google se agrega en iOS, Apple debe agregarse en el mismo pase.

### 3. Push — delivery real

`POST/DELETE /me/push-devices` (`App\Http\Controllers\Api\V1\Me\PushDeviceController`) es pura persistencia — confirmado leyendo el controller. Nunca llama a Expo/FCM/APNs. Mobile ya implementa el registro real (`src/app/settings/notifications.tsx`, `src/api/pushDevices.ts`).

**Actualización importante (corrige una nota anterior de este documento):** se verificó `app.json` en esta pasada y **`extra.eas.projectId` YA EXISTE** (`f6dce084-4b31-4f64-980a-917784b1f5c3`, `owner: zuriel2026s-team`) — alguien corrió `eas init`/`eas build:configure` desde la última auditoría. **Verificado además que no hace falta ningún cambio de código Mobile**: `src/app/settings/notifications.tsx` lee `Constants.expoConfig.extra.eas.projectId` en tiempo de ejecución (`getEasProjectId()`), nunca asumió que estuviera ausente — el gate `available = isPhysicalDevice && !!projectId` ya se resuelve automáticamente a verdadero ahora que el campo existe. El bloqueo del lado Mobile queda resuelto sin tocar código; sólo falta probarlo en un dispositivo físico real (no un simulador) para confirmar que `getExpoPushTokenAsync` devuelve un token válido en la práctica.

**Lo que sigue faltando (lado backend, bloqueante para que un push realmente llegue):** `docs/api/v1.md` documenta esto en "Lo que falta": el `PushNotificationGateway` del backend es hoy `NullPushNotificationGateway` — siempre reporta `push_available: false`. Guardar el token ya es real, pero nada se entrega de verdad hasta que exista una implementación real (Expo Push API o FCM/APNs directo) conectada a ese gateway.

**No se requiere ningún cambio de contrato/endpoint** — sólo la implementación real del gateway del lado del servidor.

### 4. Pagos en línea — credenciales/SDK

**Verificado leyendo el código real.** `POST /orders/{uuid}/payments/online` (`Store\PaymentController::online`) hoy sólo tiene un SDK real de Stripe conectado (`StripePaymentGateway`), que devuelve `client_payload: {client_secret, publishable_key}`. **No hay llaves reales de Stripe configuradas en este entorno** (`isConfigured()` revisa `config('finisher.payments.stripe.secret')` y `.webhook_secret`, ambos vacíos) — la respuesta realista hoy es **501 `INTERNAL_ERROR`**, documentado así en `docs/api/v1.md`. OpenPay tiene una clase de gateway (`OpenPayPaymentGateway.php`) pero no está verificada/lista para producción.

Mobile (`src/payments/gateway-adapter.ts`, `src/app/checkout/index.tsx`, `src/app/orders/[uuid].tsx`) maneja esto honestamente: crea la Order real vía `/checkout`, intenta el pago en línea, y si responde 501 muestra "el pago en línea todavía no está disponible" — el pedido queda `pending`, reintentable después desde Mis Pedidos. Nunca se marca un pedido como pagado sin confirmación real.

**Lo que falta para un formulario de tarjeta real:**
1. Llaves reales de Stripe (`secret`, `webhook_secret`) en el backend, y una `publishable_key` real.
2. En Mobile: `@stripe/stripe-react-native` (requiere development/EAS build, no funciona en Expo Go) configurado como config plugin con la publishable key real.
3. Reemplazar el estado "requires_client_action" del adapter por un formulario real que confirme el `client_secret`.

No se requiere ningún cambio de contrato adicional en `/api/v1` — sólo credenciales y la dependencia nativa.

### 5. `event_race_id` no expuesto en `GET /events/{slug}` — bloquea prerregistro real

Confirmado leyendo `App\Http\Controllers\Api\V1\EventController::show()`: `edition.races[]` sólo incluye `name`, `distance_value`, `distance_unit`, `start_time` — sin `id`. Pero `POST /events/{edition}/preregister` (`StorePreregistrationRequest`) exige `event_race_id` (`required|integer|exists:event_races,id`). Sin el `id` en la respuesta pública, el cliente no tiene forma legítima de saber qué id enviar.

**Cambio mínimo requerido:**

```diff
 'races' => $edition->races->map(fn ($race) => [
+    'id' => $race->id,
     'name' => $race->name,
     'distance_value' => $race->distance_value,
     'distance_unit' => $race->distance_unit,
     'start_time' => $race->start_time,
 ]),
```

Un campo adicional en un Resource ya existente — no requiere nueva ruta, tabla, ni lógica de negocio.

**Mientras tanto:** el detalle de evento muestra las distancias con datos reales, pero el CTA de prerregistro queda deshabilitado con un mensaje honesto en vez de simular un envío con un id inventado.

### 6. Inconsistencia de forma de paginación entre endpoints (no bloqueante, ya manejado defensivamente)

Verificado leyendo el código real: no todos los endpoints paginados devuelven el mismo sobre.

- **Estándar** (`->response()` sobre un Resource collection paginado — `/medals`, `/events`, `/store/products`\*): `{data:[], links:{first,last,prev,next}, meta:{current_page,last_page,per_page,total}}`.

  \* `/store/products` en realidad usa el patrón "flat meta" de abajo, no éste — ver siguiente punto.

- **Paginador crudo anidado** (`respond($paginator)` directo, sin pasar por un Resource — `/me/events`, `/me/history`, `/me/notifications`): el paginador nativo de Laravel queda anidado bajo `data`, con los campos de paginación (`current_page`, `per_page`, `last_page`, `total`, `links` en formato array de Blade) dentro de `data`, no en `meta`. Forma real: `{data:{current_page, data:[...], last_page, per_page, total, ...}, message, meta:{request_id}}`.

- **Meta plano** (`respond(collection, meta:[...])` — `/store/products`, `/me/support-sessions`): `data` es un array plano, `meta` sólo trae `current_page`/`last_page`/`total` (sin `per_page`, sin `links`).

Mobile ya distingue estas tres formas correctamente por tipo (`PaginatedResponse<T>` / `NestedPaginatorEnvelope<T>` / `FlatMetaPaginatedResponse<T>` en `src/types/api.ts`) — esto no es un bloqueante, pero sería una limpieza de consistencia real del lado backend: alinear `/me/events`, `/me/history`, `/me/notifications` al mismo patrón `->response()` que `/medals`/`/events` ya usan, en vez de tres formas distintas para el mismo concepto.

---

## P2 — Community / Legacy Moments (cero backend hoy, arquitectura preparada en Mobile, feature flag OFF)

El backend actual **no tiene** `follow`/`followers`/`following`, `feed`, `posts`/`moments`, `likes`, ni `comments` — confirmado: no existen esas tablas, modelos, controllers ni rutas en `routes/api.php`. Mobile no construye ninguna UI funcional de esto — ni siquiera una pantalla vacía — para no mostrar una red social falsa en producción. `COMMUNITY_ENABLED = false` en `src/features/community/flags.ts`.

**Lo que Laravel necesitaría, aproximadamente** (mismo patrón Action/Resource/Policy que el resto de la API):

Tablas: `athlete_follows` (follower_athlete_id, followed_athlete_id, ún: par), `legacy_moments` (athlete_id, event_participant_id nullable, medal_id nullable, caption, visibility), `legacy_moment_media` (moment_id, type, url/path, sort_order), `legacy_moment_likes` (moment_id, athlete_id, ún: par), `legacy_moment_comments` (moment_id, athlete_id, body, created_at).

Endpoints aproximados, mismo envelope/paginación estándar:

```
GET    /feed                                  🔒  paginado, moments de a quién sigo (+ propios)
POST   /athletes/{username}/follow            🔒
DELETE /athletes/{username}/follow            🔒
GET    /moments/{uuid}                            público si visibility=public, si no 🔒+dueño
POST   /moments                               🔒  crear desde un medal/participation existente
POST   /moments/{uuid}/like                    🔒
DELETE /moments/{uuid}/like                    🔒
GET    /moments/{uuid}/comments                    paginado
POST   /moments/{uuid}/comments                🔒
```

Decisiones de producto pendientes (no técnicas): moderación de comentarios, si un Legacy Moment se genera automáticamente al crear una medalla/subir media o siempre es una acción explícita del atleta, y si `visibility` hereda la del medal/media de origen o es independiente.

---

## P3 — Escala / futuro (no bloquea nada hoy)

### MediaEntitlement (memory packs pagados)

Ver `App\Services\Media\ResolveMediaEntitlement` (ya existe, resuelve hoy sólo el allowance gratis: 5 imágenes/1 video por participación). Para vender espacio adicional:

```
MediaEntitlement: athlete_id, event_participant_id, images_limit, videos_limit, order_item_id, starts_at, expires_at
```

y `ResolveMediaEntitlement` devolvería `free_allowance + paid_entitlement`. Ningún endpoint de "mi entitlement actual" existe — Mobile calcula 3/5 contando la lista de media ya subida contra el límite gratis hardcodeado (`EVENT_MEDIA_LIMITS` en `src/api/eventMedia.ts`). `src/app/my-events/memory-upgrades.tsx` muestra FREE/MEMORY PACK/MEMORY PACK MAX sin precios — el precio siempre vendría de `Product`/`ProductVariant` una vez exista un producto de tipo "memory pack", mismo patrón que cualquier otro producto de la tienda.

### Media scale (thumbnails, transcoding, CDN)

Confirmado en `docs/architecture/athlete-assets.md` §Deuda conocida: Event Media guarda originales sin thumbnail/redimensionado automático (`App\Services\ImageProcessingService` existe para medallas/perfil pero no está conectado a `event_media`), y sin transcodificación de video (se sirve el archivo tal cual se sube). `config/filesystems.php` confirma que el disco activo es `local`/`public` — no hay S3/CDN configurado hoy.

Para escalar: imágenes necesitarían variantes `thumb`/`feed`/`display`/`original`; video necesitaría un pipeline (`ffmpeg`, 720p/1080p, poster, cola de jobs) + almacenamiento de objeto (S3-compatible, ya soportado por `config/filesystems.php` pero sin credenciales configuradas) + CDN. No se debe intentar montar `ffmpeg` desde Mobile — esto es 100% trabajo de infraestructura backend.

---

## Observación menor (ya mitigada en el cliente, no requiere cambio de backend)

`LegacyCodeController::claim()` devuelve sus 403/409 con el envelope de éxito (`{data:null, message}`) en vez del envelope de error documentado (`{error:{code,message}}`) que usan la mayoría de rutas. `src/api/errors.ts` ya contempla ambos formatos — documentado aquí sólo para que quede claro por qué el parser tiene ese fallback.

---

## Recomendación de identificadores (aplica a los P0 #3 y #4 de arriba)

**Preferir UUID público sobre exponer una PK entera**, en cualquier endpoint nuevo que necesite identificar un recurso desde un cliente externo — patrón ya usado en Medallas (`uuid`), Legacy Code (`code`), Eventos (`slug`), Perfiles (`username`). Los dos gaps P0 de arriba (`product_variant_id`, `media reorder`) existen precisamente porque un Form Request nuevo usó `integer|exists:tabla,id` en vez de seguir ese patrón ya establecido en el resto de la API — no es una inconsistencia de diseño intencional, es el único rincón donde no se siguió la convención existente.
