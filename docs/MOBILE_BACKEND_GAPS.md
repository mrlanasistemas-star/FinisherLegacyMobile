# Mobile Backend Gaps

Gaps reales encontrados al auditar `C:\wamp64\www\finisherLegacy` (Laravel 13) contra `docs/api/v1.md`, `routes/api.php`, controllers, Form Requests y Resources reales. Nada hipotético — cada punto fue verificado leyendo el código fuente del backend, no inferido.

## 1. Recuperación de contraseña — NO existe en `/api/v1`

No hay ninguna ruta bajo `routes/api.php` para forgot/reset password. Solo existe el flujo web de Fortify (sesión), no expuesto vía token API.

**Cambio mínimo requerido (si se decide implementar):**

```
POST /api/v1/auth/forgot-password   { email }        -> 200 (siempre, no revela si el email existe)
POST /api/v1/auth/reset-password    { email, token, password, password_confirmation } -> 200
```

Reutilizando `Illuminate\Auth\Passwords\PasswordBroker` / las mismas notificaciones que ya usa Fortify — nunca una segunda implementación de generación de tokens de reseteo.

**Mientras tanto:** la app no debe simular un envío de correo. La UI de login puede quedar preparada (botón "¿Olvidaste tu contraseña?") pero debe mostrar un estado "función no disponible todavía" o quedar oculta, no fingir éxito.

## 2. Eliminación de cuenta — NO existe en `/api/v1`

Solo existe `DELETE settings/profile` (`routes/settings.php`), que es una ruta web de sesión Inertia (`App\Http\Controllers\Settings\ProfileController::destroy`), protegida por `ProfileDeleteRequest`. No hay equivalente token-based bajo `/api/v1`.

Esto es **prioritario antes del lanzamiento** — Apple/Google exigen un mecanismo de eliminación de cuenta accesible desde dentro de la app cuando esta permite crear cuentas.

**Cambio mínimo requerido:**

```
DELETE /api/v1/account   { password }  🔒 -> 200/204
```

Reutilizando la misma validación de `ProfileDeleteRequest` (confirma password) y la misma lógica de borrado que `Settings\ProfileController::destroy` — nunca una segunda implementación de borrado de cuenta.

**Mientras tanto:** no construir un botón que finja eliminar la cuenta. La pantalla de Ajustes → Cuenta puede documentar "Para eliminar tu cuenta, contáctanos" con el canal de soporte real disponible, hasta que el endpoint exista.

## 3. `GET /events/{slug}` no expone `event_race_id` — bloquea prerregistro real

Confirmado leyendo `App\Http\Controllers\Api\V1\EventController::show()`: el array `edition.races[]` sólo incluye `name`, `distance_value`, `distance_unit`, `start_time` — sin `id`.

Pero `POST /events/{edition}/preregister` (`StorePreregistrationRequest`) exige `event_race_id` (`required|integer|exists:event_races,id`), y `PreregistrationController::store()` lo resuelve con `EventRace::query()->where('event_edition_id', $edition->id)->findOrFail(...)`.

Sin el `id` en la respuesta pública, el cliente móvil no tiene forma legítima de saber qué id enviar — no se puede construir un selector de distancia real sin inventar o adivinar el id.

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

**Mientras tanto:** el detalle de evento en la app muestra las distancias disponibles (nombre, distancia, hora de salida) con datos reales, pero el CTA de prerregistro queda deshabilitado con un mensaje honesto en vez de simular un envío con un id inventado.

## 4. Observación (ya mitigada en el cliente): envelope de error inconsistente en `LegacyCodeController::claim()`

No es un gap que requiera cambio de backend, pero vale dejarlo registrado: los errores 403/409 de `claim()` se devuelven con el envelope de éxito (`{data:null, message, meta}`) en vez del envelope de error documentado (`{error:{code,message}, request_id}`) que sí usan la mayoría de las demás rutas. El parser de errores del cliente (`src/api/errors.ts`) ya contempla ambos formatos (usa `body.error.message` si existe, si no cae a `body.message`), así que los mensajes específicos del backend ("Esta placa ya forma parte de otro Legacy.", etc.) sí llegan al usuario. Documentado aquí únicamente para que quede claro por qué el parser tiene ese fallback.

## 5. Resumen de impacto en la app

| Funcionalidad | Estado | Bloqueante para store |
|---|---|---|
| Password recovery | Sin endpoint API | No bloqueante para V1, pero deseable |
| Account deletion | Sin endpoint API | **Sí — requerido por políticas de Apple/Google si la app permite crear cuenta** |
| Prerregistro a evento | Falta `id` en `edition.races[]` | No bloqueante para V1 (CTA deshabilitado honestamente); deseable antes de publicar |

Ninguno bloquea el desarrollo del resto de la app. Se documenta aquí y se continúa con todo lo demás, según §70 y §71 del prompt de implementación.
