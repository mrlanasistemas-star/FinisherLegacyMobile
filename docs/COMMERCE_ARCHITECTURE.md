# Arquitectura de comercio (móvil)

> Estado: **implementado de punta a punta**. El único requisito externo pendiente son las llaves reales de Stripe (ver "Configuración").

## Flujo

```
Tienda → Producto → Carrito → Checkout (crea Order) → Stripe PaymentSheet → Confirmación (servidor) → Detalle del pedido
```

1. **Catálogo** — `GET /store/products?q=&category=<slug>&sort=newest` → productos + `meta.categories` (chips). Cada producto trae `in_stock` (booleano, nunca un conteo).
2. **Carrito** — `POST /cart/items {product_variant_uuid, quantity}`. El backend resuelve el UUID a su PK interna, valida activo/stock/precio. Todo cambio devuelve el `Cart` completo **calculado por el servidor**; la app nunca recalcula dinero. Cupones: `POST/DELETE /cart/coupon`.
3. **Checkout** — `POST /checkout` con `Idempotency-Key` (una llave por intento de carrito, reutilizada en reintentos → nunca dos pedidos por doble tap/timeout).
4. **Pago** — `POST /orders/{uuid}/payments/online {provider: "stripe"}` → `{client_payload: {client_secret, publishable_key, merchant_display_name}}`. La app presenta **PaymentSheet** (`@stripe/stripe-react-native`); los datos de tarjeta van directo a Stripe y nunca pasan por Laravel.
5. **Confirmación** — al cerrar la hoja, la app llama `POST /orders/{uuid}/payments/sync`: el servidor consulta a Stripe (server-to-server) y aplica el estado por el mismo camino que el webhook (`ProcessPaymentWebhook`: verificación de monto/moneda, matriz de transiciones, `MarkOrderPaid`). El webhook firmado `POST /api/webhooks/stripe` sigue siendo la otra vía equivalente.

**Nunca** se marca pagado desde el cliente: el resultado de PaymentSheet sólo significa "confirmando…".

## Reintentos sin doble cobro

- `CreateOnlinePayment` reserva la fila `Payment` bajo lock antes de llamar a Stripe.
- Si ya hay un intento en curso del **mismo** proveedor, el backend **reanuda el mismo PaymentIntent** (`ResumablePaymentGateway::resumePayment`) en lugar de crear otro. Cerrar la hoja, perder conexión o una tarjeta rechazada → "Intentar de nuevo" usa el mismo intent.
- Stripe además recibe `idempotency_key = payment-{uuid}` al crear el intent.

## Estados de pago (`OrderResource.payment_state`)

| `payment_state` | Significado | UI |
|---|---|---|
| `pending` | sin pago aún (o esperando al usuario) | "Pagar $X" |
| `processing` | Stripe lo está procesando (`provider_status = processing`) | "Pago en proceso" — sin éxito falso |
| `paid` | confirmado por el servidor | "Pago confirmado" |
| `failed` | último intento falló | mensaje + reintentar |
| `cancelled` | pedido cancelado/expirado sin pago | volver al carrito |
| `refunded` | reembolsado | informativo |

También: `payable` (el servidor decide si todavía se puede pagar) y `expires_at` (hasta cuándo queda apartado). Lógica en `src/payments/payment-flow.ts` (con tests) y `src/hooks/use-payment-flow.ts`.

`GET /orders` usa ahora paginación estándar `{data, links, meta}` (se quitó el workaround del cliente).

## Por qué Stripe (y no OpenPay) en móvil

Ambos gateways existen y son reales en el backend. OpenPay requiere tokenizar la tarjeta con **Openpay.js** (web) y no tiene SDK nativo oficial para React Native; Stripe tiene SDK oficial compatible con Expo SDK 57 (`@stripe/stripe-react-native@0.64.0`, instalado con `expo install`), PaymentSheet con 3-D Secure, y su webhook ya estaba firmado y probado. `config('finisher.payments.api_gateway')` = `stripe` por defecto para `/api/v1`; la web conserva `default_gateway`.

## Configuración (producción / sandbox)

Backend `.env`:
```
STRIPE_KEY=pk_live_… (o pk_test_… en sandbox)
STRIPE_SECRET=sk_live_…
STRIPE_WEBHOOK_SECRET=whsec_…
FINISHER_API_PAYMENT_GATEWAY=stripe
FINISHER_MERCHANT_DISPLAY_NAME="Finisher Legacy"
```
Stripe Dashboard → Webhooks → `https://finisherlegacy.com/api/webhooks/stripe` con eventos `payment_intent.succeeded`, `payment_intent.payment_failed`, `payment_intent.canceled`, `payment_intent.processing`.

Sin esas llaves el endpoint responde `501` y la app muestra "El pago con tarjeta todavía no está activo" — el pedido queda guardado y pagable después. La llave publicable viaja desde el backend, así que cambiar de test a live no requiere un build nuevo.

Apple Pay / Google Pay: desactivados (`merchantIdentifier: []`, `enableGooglePay: false` en `app.json`). Activarlos requiere un Merchant ID de Apple y configurar Google Pay en Stripe.

## Memory Packs (base preparada, apagada)

`media_entitlements` suma fotos/videos extra por participación sobre el plan gratis. `FINISHER_MEMORY_PACKS_ENABLED=false` hasta que exista un producto real con precio real. La app ya lee los límites de `GET /me/events/{participant}/media-entitlement`.

## Legacy Plates

Una Legacy Plate se graba con el resultado de un evento, así que no se agrega desde la ficha genérica del producto: la ficha lo explica y lleva a Eventos (el backend exige evento + modelo).
