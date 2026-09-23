# Device QA

Checklist manual en dispositivo físico (APK de `eas build --profile preview`; TestFlight en iOS). Complementa — no sustituye — typecheck/lint/test/export. Marcar sólo lo verificado en el dispositivo.

**Tamaños a cubrir:** 320×568 · 360×800 · 375×812 · 390×844 · 412×915 · 430×932. Android con navegación por gestos y con botones; iPhone con home indicator. Sin tablet en V1.

## Instalación y arranque
- [ ] Instalación limpia sin Metro/USB; datos móviles o Wi-Fi normal.
- [ ] Cold start sin pantalla blanca; sin crash.
- [ ] Reabrir la app: sesión restaurada sin login.

## Auth
- [ ] Registro (errores reales del backend), login correcto/incorrecto.
- [ ] "¿Olvidaste tu contraseña?" → correo recibido → abrir el enlace → restablecer (web o `finisherlegacy://reset-password?token=…&email=…`) → login con la nueva.
- [ ] (iOS) Continuar con Apple — incluye "Ocultar mi correo". (Con client ids) Continuar con Google. Sin ids configurados el botón no aparece.
- [ ] Logout: vuelve a Welcome; al entrar con otra cuenta no queda nada de la anterior (feed, perfil, carrito).

## Navegación
- [ ] Inicio · Legacy · Escanear · Tienda · Perfil — etiquetas legibles, haptic sutil al cambiar de pestaña.
- [ ] El FAB dorado queda centrado, no tapa contenido, respeta barra de gestos/home indicator.
- [ ] Badge de la Tienda = número de artículos del carrito; se actualiza al agregar/quitar.
- [ ] "Primeros pasos" en Inicio: cada paso lleva a su pantalla y se marca solo al cumplirse; "✕" lo oculta.

## Perfil
- [ ] Perfil propio: portada, avatar, @usuario, Legacy ID, bio, ubicación, stats; engrane → Configuración.
- [ ] Editar perfil: cambiar/quitar avatar y portada (vista previa inmediata), username (muestra `finisherlegacy.com/@…`), bio con contador, ubicación en hoja inferior, switch de perfil privado con explicación. Guardar persiste.
- [ ] Seguidores / Siguiendo tocables → lista con botón Seguir.
- [ ] Perfil de otro atleta: Seguir/Siguiendo (toast "Listo. Ya sigues a …"), compartir, ••• → reportar / bloquear.
- [ ] Perfil privado de otro: "Este perfil no está disponible".

## Social
- [ ] Feed "Siguiendo" / "Descubrir", pull-to-refresh, scroll infinito, ningún video se reproduce solo.
- [ ] ❤️ y 👏: respuesta instantánea, conteo correcto, idempotente (tocar rápido varias veces).
- [ ] Momento: detalle, mensajes de apoyo con input fijo sobre el teclado, borrar el propio, reportar ajeno.
- [ ] Crear momento: entrenamiento (distancia + tiempo → ritmo calculado), récord personal, recuerdo con fotos (hasta 4), visibilidad Todos/Seguidores/Solo yo.
- [ ] "Compartir como Legacy Moment" desde: última carrera (Inicio), detalle de carrera, foto recién subida, medalla reclamada, gear reclamado — llega prellenado y no se publica solo.
- [ ] Explorar: Para ti / Atletas / Eventos; búsqueda (espera ~350 ms, no busca por cada letra) de atletas, eventos y productos.
- [ ] Bloquear a alguien: desaparece de feed/búsqueda; Configuración › Privacidad lo lista y permite desbloquear.
- [ ] Notificaciones: agrupadas Hoy / Esta semana / Antes; seguidor/reacción/mensaje abren el perfil o momento correcto.

## Legacy
- [ ] Pestaña Legacy: medallas, carreras, recuerdos, equipo y Legacy Plates; "+" abre las acciones.
- [ ] Escanear Legacy Code (permiso de cámara), reclamar, pantalla de éxito.
- [ ] Detalle de carrera: subir foto (cámara/galería) y video (iOS `.mov` se sube sin error), contador contra el límite del backend, "Mover antes/después" reordena y persiste, límite alcanzado → Memory Upgrades.

## Tienda y pago
- [ ] Catálogo: buscador, chips de categoría, "Lo más nuevo", productos agotados marcados.
- [ ] Producto: galería con puntos, variantes (agotadas tachadas), cantidad, CTA fijo abajo "Agregar al carrito" (toast + haptic) y "Comprar ahora".
- [ ] Carrito: +/−, la papelera al llegar a 1, deslizar para quitar, cupón válido/inválido con motivo real, totales del servidor.
- [ ] Checkout → "Pagar $X" → PaymentSheet (tarjeta de prueba `4242 4242 4242 4242`) → "Confirmando…" → "Pago confirmado".
- [ ] Tarjeta rechazada (`4000 0000 0000 0002`) → "El pago no se completó" → "Intentar de nuevo" (mismo pedido, sin segundo cargo).
- [ ] 3-D Secure (`4000 0027 6000 3184`) → vuelve a la app y confirma.
- [ ] Cerrar la hoja → "Pago cancelado" → pagar después desde Mis pedidos.
- [ ] Doble tap en "Pagar" no crea dos pedidos.
- [ ] Pedido: línea de tiempo (creado → pagado → preparando → entregado), "Apartado hasta…" para pendientes.
- [ ] Sin llaves de Stripe: mensaje "no está activo", el pedido queda guardado.

## Eventos
- [ ] Lista Próximos/Pasados; detalle con distancias; "Prerregistrarme" (datos prellenados, elegir distancia) → confirmación.

## Cuenta
- [ ] Cambiar contraseña → correo enviado.
- [ ] Eliminar cuenta (contraseña incorrecta → error; correcta → sesión cerrada y login imposible con esa cuenta).

## Offline
- [ ] Modo avión con datos cargados: feed, perfil y Legacy siguen visibles; también tras cerrar y reabrir la app.
- [ ] Seguir, reaccionar, comentar, agregar al carrito, pagar, subir foto sin conexión → "Sin conexión…" inmediato, nada falso.
- [ ] Reconectar → toast "Conexión restaurada", todo funciona sin reiniciar.

## Accesibilidad
- [ ] TalkBack / VoiceOver: pestañas, botones de ícono, reacciones y pasos de "Primeros pasos" tienen nombre.
- [ ] Texto grande del sistema: sin textos cortados en botones ni filas.
- [ ] Todos los botones de ícono responden en un área cómoda (44×44).
