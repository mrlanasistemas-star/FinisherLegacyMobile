# Activar mi Finisher Legacy (escritura NFC nativa)

> **Estado: implementado en código, NO VERIFICADO EN HARDWARE.** Nada de este
> flujo se ha probado aún con un teléfono real ni con chips NTAG213/215/216.
> Requiere un build nativo nuevo (no funciona en Expo Go ni en el dev build
> anterior: la app muestra "Actualiza Finisher Legacy").

El asistente escribe la URL permanente del Finisher Legacy Tag
(`https://<EXPO_PUBLIC_WEB_URL host>/t/{code}`) en un chip NTAG21x en blanco
con el NFC del propio teléfono, sin apps de terceros.

## Librería

- `react-native-nfc-manager@4.2.0` (línea v4, "built for the New Architecture
  and Expo Development Builds"; peerDeps `react-native >=0.76`, `react >=18.2`,
  `@expo/config-plugins *`; TurboModule con `codegenConfig`).
- Config plugin `app.plugin.js` usado desde `app.config.ts`:
  - iOS: `NFCReaderUsageDescription` (español) y
    `com.apple.developer.nfc.readersession.formats = [TAG]` (`includeNdefEntitlement: false`:
    la app nunca usa `NFCNDEFReaderSession`, y `NDEF` provoca el error de subida ITMS-90778).
    `requestTechnology` abre una `NFCTagReaderSession`, por eso TAG es obligatorio.
    El App ID necesita la capability **NFC Tag Reading** en Apple Developer.
  - Android: `android.permission.NFC`; el manifest de la librería declara
    `android.hardware.nfc required="false"` (teléfonos sin NFC pueden instalar).
- El módulo nativo lanza al importarse si no está en el binario, así que
  `src/features/nfc/nfc-driver.ts` lo carga de forma diferida (`require` en try).

## Flujo

| Paso | Pantalla | Qué pasa |
| --- | --- | --- |
| 1 Cuenta | `/activate` | Sin sesión: Iniciar sesión / Crear cuenta. Se guarda `/activate` como deep link pendiente y se reanuda tras login. |
| 2 Código | `/activate` | Código de la tarjeta del empaque con máscara `XXXX-XXXX-XXXX` (12 caracteres). Acepta `?code=` en la ruta. |
| 3 Acercar | `/activate` | Ilustración teléfono/tag animada (Reanimated), consejos por plataforma, "Estoy listo". |
| 4 Activar | `/activate` | Una sola sesión NFC (`runActivation`): detectar → inspeccionar → `start` → validar `write_url` → guardar intento pendiente → escribir → releer y verificar → cerrar sesión → `confirm`. |
| 5 Listo | `/activate/success` | Destello dorado sutil, háptica de éxito, CTA "Completar mi recuerdo" (abre `edit_url`, solo si es de nuestro dominio). |

Inspección del chip (`describeContent`):

- `read_only` → error, nada se escribe. `unsupported` → "no compatible".
- Android `NdefFormatable` (chip sin formato) → se usa `formatNdef` (nunca `formatReadOnly`).
- Vacío → se escribe.
- Ya tiene **nuestra** URL `/t/{code}` → se manda `tag_code` a `start`; si
  `write_url` es idéntica no se reescribe (solo se verifica y confirma). Si es
  **otro** Finisher Legacy → `different_fl_tag`, jamás se reescribe. Si el backend
  responde `TAG_ALREADY_ACTIVATED` → se ofrece abrir `/nfc/t/{code}`.
- Datos ajenos (otro enlace, texto, otra app) → se cierra la sesión y se pide
  consentimiento explícito (`ConfirmDialog` que dice qué se borrará, p. ej.
  "un enlace a example.com"). El consentimiento queda atado al UID del chip; se
  vuelve a acercar para escribir.

## Seguridad

- Solo se escribe el `write_url` devuelto por `POST /tags/activation/start`, y
  solo si `isAllowedWriteUrl` lo acepta: mismo esquema y host (con puerto) que
  `EXPO_PUBLIC_WEB_URL`, ruta exacta `/t/{code}`, sin query, sin fragmento, sin
  userinfo, solo ASCII imprimible, y `{code}` igual al `tag_code` de la misma
  respuesta (alfabeto del backend, sin 0/O/1/I/L). Si falla: `unsafe_url`, se
  llama `fail` y no se escribe nada.
- No existe UI ni API interna para escribir URLs arbitrarias.
- Nunca se bloquea un chip (no se llama `makeReadOnly` ni `formatReadOnly`).
- La respuesta de `start`/`confirm` se valida con zod (`src/schemas/activation.ts`).
- El intento pendiente se guarda en SecureStore (`fl_nfc_pending_activation`),
  con el `user_id`; nunca se confirma el intento de otro usuario.

## Recuperación

- `confirm` falla por red/429 tras escribir y verificar → pantalla "Tu Finisher
  Legacy ya quedó escrito" con Reintentar (no hay que volver a acercarlo). El
  intento queda en `phase: 'written'`.
- La app se cierra entre escribir y confirmar → al abrir `/activate` aparece el
  mismo paso; además `usePendingActivationRecovery()` confirma en silencio
  (montarlo una vez en la raíz, ver Pendientes).
- Se pierde el chip **durante** la escritura → el intento se conserva
  (`authorized`) y no se llama `fail`; en el siguiente toque, si el chip ya tiene
  esa URL exacta, se confirma sin nuevo `start`.
- Fallos definitivos (verificación con otra URL, sin espacio, URL insegura,
  error del backend) → `POST /fail` con `reason` corto (`too_small`,
  `api:TAG_UID_MISMATCH`…) y se borra el pendiente.

## Matriz de errores

| Situación | `kind` | Mensaje / acción |
| --- | --- | --- |
| Binario sin módulo NFC (Expo Go, build viejo) | `module_unavailable` | "Actualiza Finisher Legacy" |
| Teléfono sin NFC | `unsupported` | Explica que necesita NFC |
| NFC apagado (Android) | `disabled` | "Abrir ajustes de NFC" (`goToNfcSetting`) + "Ya lo encendí" |
| Usuario cancela (hoja iOS / botón Cancelar Android) | `cancelled` | Sin háptica de error; reintentar |
| iOS cierra la sesión (60 s) / timeout | `timeout` | Consejos de posición; reintentar |
| Chip se mueve (`TagLostException`, `IOException`, iOS 100/104) | `tag_lost` | "Se movió antes de terminar"; intento conservado |
| Doble toque / sesión duplicada | `busy` | Bloqueo a nivel módulo + botones deshabilitados |
| Chip protegido contra escritura | `read_only` | Contactar soporte |
| No NDEF y no formateable | `not_ndef` | "No compatible" |
| Mensaje > capacidad | `too_small` | Contactar soporte; `fail` |
| Relectura distinta | `verify_failed` | Reintentar; `fail` |
| Chip ya es otro Finisher Legacy | `different_fl_tag` | Nunca se reescribe |
| `write_url` fuera de política / incompleta | `unsafe_url` | Nada escrito; `fail` |
| 422 `ACTIVATION_CODE_INVALID` | `api` | "Corregir código" |
| 422 `TAG_ALREADY_ACTIVATED` | `api` / `existing_fl_tag` | Ver historia / abrir tag |
| 422 `TAG_NOT_ACTIVATABLE` | `api` | Contactar soporte |
| 422 `TAG_UID_MISMATCH` | `api` | "Acerca el del mismo empaque" |
| 429 | `rate_limited` | Esperar |
| Sin red | `network` | Reintentar (antes de escribir) / reintentar confirm (después) |
| 401 | `unauthenticated` | Iniciar sesión |

## Lectura (sin escribir)

`/legacy/scan` ("Leer mi Finisher Legacy") lee un chip y enruta:
`/t/{code}` → `/nfc/t/{code}` (nueva pantalla, `GET /tags/{code}?src=nfc`),
`/n/{token}` → `/nfc/{token}`, `/l/{code}` → `/legacy/{code}`, chip vacío →
ofrece `/activate`. El código impreso sigue funcionando.

## Archivos

- `src/features/nfc/url-policy.ts` — política de URL, máscara del código.
- `src/features/nfc/ndef.ts` — codificador/decodificador NDEF URI.
- `src/features/nfc/nfc-driver.ts` — único archivo que toca la librería.
- `src/features/nfc/activation-session.ts` — máquina de estados de la sesión.
- `src/features/nfc/activation-flow.ts` — reducer del asistente.
- `src/features/nfc/nfc-errors.ts`, `activation-copy.ts`, `pending-activation.ts`, `nfc-uid.ts`, `use-activation.ts`.
- `src/api/activation.ts`, `src/schemas/activation.ts`.
- `src/app/activate/index.tsx`, `src/app/activate/success.tsx`, `src/app/nfc/t/[code].tsx`, `src/app/legacy/scan.tsx`.
- `src/components/nfc/{activation-shell,activation-progress,step-button,tap-illustration,gold-burst}.tsx`.
- Pruebas: `src/features/nfc/*.test.ts` (`npx jest src/features/nfc`).

## Matriz de prueba en hardware (PENDIENTE — NO VERIFICADO)

Marcar cada celda con fecha, modelo y resultado. Chips: NTAG213 (137 B),
NTAG215 (504 B), NTAG216 (888 B).

| # | Caso | Android (p. ej. Pixel / Samsung) | iPhone (XS o posterior, iOS 17+) |
| --- | --- | --- | --- |
| 1 | NTAG213 de fábrica (NDEF vacío) → activar | ☐ | ☐ |
| 2 | NTAG215 de fábrica → activar | ☐ | ☐ |
| 3 | NTAG216 de fábrica → activar | ☐ | ☐ |
| 4 | Chip sin formato NDEF (Android `NdefFormatable`) | ☐ | n/a (iOS no formatea; esperado `not_ndef`) |
| 5 | Chip con URL ajena → diálogo → reemplazar | ☐ | ☐ |
| 6 | Chip con URL ajena → "No, usar otro chip" (no se escribe) | ☐ | ☐ |
| 7 | Chip ya activado con nuestra URL → abrir tag | ☐ | ☐ |
| 8 | Chip bloqueado (read-only) | ☐ | ☐ |
| 9 | Retirar el chip a mitad de escritura → reintento recupera | ☐ | ☐ |
| 10 | Modo avión tras escribir → "Reintentar" confirma | ☐ | ☐ |
| 11 | Matar la app entre escribir y confirmar → reabrir recupera | ☐ | ☐ |
| 12 | NFC apagado → ajustes → volver | ☐ | n/a |
| 13 | Cancelar la lectura | ☐ | ☐ |
| 14 | Dejar expirar la hoja iOS (60 s) | n/a | ☐ |
| 15 | Código inválido / UID que no coincide | ☐ | ☐ |
| 16 | Tras activar: tocar el chip con la app cerrada abre la web `/t/{code}` | ☐ | ☐ |
| 17 | `/legacy/scan` lee chip activado, vacío y ajeno | ☐ | ☐ |
| 18 | Pantalla pequeña (≤ 360 pt) + teclado en el paso del código | ☐ | ☐ |
| 19 | Reducir movimiento activado | ☐ | ☐ |
| 20 | Lectura en otro teléfono (NFC Tools de solo lectura) muestra exactamente la URL | ☐ | ☐ |
