# Device QA

Checklist manual para correr en un dispositivo físico real (APK de `eas build --profile preview` en Android, TestFlight/simulador real en iOS) — nada de esto sustituye a `npm run typecheck`/`lint`/`test`, los complementa. Marcar cada casilla sólo tras verificarla en el dispositivo, no por inferencia del código.

## Instalación y arranque

- [ ] Instalar el APK/build sin depender de Metro/USB/LAN — el dispositivo debe estar en datos móviles o Wi-Fi normal, sin PC cerca.
- [ ] Cold start: splash aparece inmediatamente, sin pantalla blanca/negra intermedia.
- [ ] Ningún crash al abrir por primera vez.

## Auth

- [ ] Onboarding (si es la primera vez) — 3 slides, swipe funciona, "Saltar"/"Continuar" correctos.
- [ ] Welcome — CTA principal visible sin scroll, texto completo dentro del botón.
- [ ] Registro — todos los campos, validación de errores real (probar email inválido, password corto), CTA alcanzable con teclado abierto.
- [ ] Login — credenciales correctas entran; credenciales incorrectas muestran error real del backend, no genérico.
- [ ] Cerrar la app completamente y reabrir — sesión se restaura sin pasar por login (SecureStore).
- [ ] Logout — confirmación, vuelve a Welcome, no queda ningún dato de sesión anterior visible.

## Perfil

- [ ] Ver perfil propio con datos reales.
- [ ] Editar perfil — cambiar bio/ciudad/username, subir foto de perfil y portada — persiste tras recargar.
- [ ] Perfil público de otro atleta (`/athlete/[username]`) carga correctamente.

## Medallas / Legacy Vault

- [ ] Crear medalla manual — foto frontal obligatoria, galería opcional, guarda y aparece en el Vault.
- [ ] Ver detalle de medalla.
- [ ] Editar medalla.
- [ ] Eliminar medalla — confirmación, desaparece de la lista.

## Legacy Code

- [ ] Escanear un QR real de Legacy Code — cámara pide permiso la primera vez, detecta y navega.
- [ ] Entrada manual de código.
- [ ] Reclamar un código — animación de éxito, medalla aparece en el Vault.
- [ ] Código ya reclamado por otro — mensaje de error real, no crash.

## Eventos

- [ ] Lista de eventos próximos/pasados (segmented control).
- [ ] Detalle de evento — distancias reales, botón de prerregistro (deshabilitado honestamente, ver `MOBILE_BACKEND_REQUIREMENTS.md` P1 `event_race_id`).
- [ ] Store teaser visible en la parte superior de la pestaña Eventos, navega a `/store`.

## Mis Eventos / Historia

- [ ] Timeline de participaciones carga con datos reales (o empty state honesto si el atleta no tiene ninguna).
- [ ] Detalle de una participación — resultado, splits (si existen), medallas, Legacy Plate, gear usado, compras, teaser de soporte.
- [ ] Sección "Recuerdos" (media) — contador de fotos/videos correcto contra el límite real (5/1).
- [ ] Subir foto desde cámara — preview antes de confirmar, progreso real durante upload, aparece en la galería.
- [ ] Subir foto desde galería.
- [ ] Subir video — warning si es pesado, progreso real.
- [ ] Alcanzar el límite gratis — mensaje honesto + CTA a "Memory Upgrades" (sin precios, sin compra real).
- [ ] Cambiar visibilidad de un item (público/sólo yo).
- [ ] Eliminar un item de media — confirmación.
- [ ] Abrir el visor a pantalla completa — swipe entre items, video reproduce sólo cuando está activo, se pausa al salir.

## Mi Equipo (Digital Closet)

- [ ] Lista de gear propio (o empty state si no tiene ninguno).
- [ ] Detalle de un item — historial de uso si existe.
- [ ] Reclamar gear por QR.
- [ ] Reclamar gear por código manual.
- [ ] Código ya reclamado — error honesto, no crash.

## Tienda

- [ ] Catálogo carga con imágenes/precios reales.
- [ ] Filtro por categoría/tipo si aplica.
- [ ] Detalle de producto — galería swipeable, variantes, selector de cantidad.
- [ ] **"Agregar al carrito" debe aparecer deshabilitado con mensaje honesto** (gap real de backend, `product_variant_id` — ver `MOBILE_BACKEND_REQUIREMENTS.md` P0). Si en algún momento el backend resuelve este gap y el botón queda habilitado, retomar el resto de este checklist de Tienda/Carrito/Checkout.
- [ ] Carrito — si llegó a tener algún item de una sesión anterior, verificar que subtotal/descuento/total vienen del backend (no recalculados).
- [ ] Cupón — aplicar uno inválido muestra el motivo real de rechazo, no un genérico.
- [ ] Checkout — sólo si el gap de carrito ya se resolvió; de lo contrario, confirmar que no hay forma de llegar a un estado de checkout roto desde una UI que ya bloqueó el paso anterior.
- [ ] Mis Pedidos — lista carga (o empty state), detalle de un pedido muestra items/estados reales.
- [ ] Pago en línea — botón "Pagar" intenta el flujo real; en este entorno (sin llaves Stripe reales) debe mostrar honestamente "pago no disponible todavía", nunca fingir éxito.

## Notificaciones

- [ ] Badge de no leídas visible en Home cuando corresponde.
- [ ] Lista de notificaciones carga.
- [ ] Marcar una como leída / marcar todas.
- [ ] `action_url` de una notificación navega correctamente (interno) o abre el navegador (externo).

## Soporte

- [ ] Crear una sesión de apoyo.
- [ ] Ver detalle — QR visible, botón compartir funciona (`Share.share` nativo).
- [ ] Si existen mensajes, reproducir uno de audio — play/pause reales, sin loop, se detiene al salir de la pantalla.

## Ajustes

- [ ] Cuenta — editar datos.
- [ ] Notificaciones push — el estado mostrado debe ser honesto según si `Notifications.getExpoPushTokenAsync()` realmente puede obtener un token en este dispositivo/build.
- [ ] Privacidad — enlaces reales abren el navegador a las URLs correctas.

## Offline

- [ ] Activar modo avión con datos ya cargados — pantallas con cache reciente siguen mostrando datos (lectura), banner discreto de "sin conexión" visible.
- [ ] Intentar una escritura (subir media, reclamar código, agregar al carrito si aplica) sin conexión — bloqueado con mensaje claro, nunca un fake success.
- [ ] Reconectar — banner desaparece, un toast/indicador confirma la reconexión, las siguientes acciones funcionan normalmente sin necesidad de reiniciar la app.

## General

- [ ] Rotar el dispositivo — la app está forzada a `portrait`, confirmar que no rota (excepto si se decide soportar landscape en el futuro).
- [ ] Botón de escaneo central (FAB) — no tapa contenido, respeta la gesture navigation bar de Android y el home indicator de iOS.
- [ ] Ningún texto se corta/desborda en botones o tarjetas en el dispositivo probado.
