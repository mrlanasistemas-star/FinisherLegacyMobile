# Google Play — Finisher Legacy

Paquete: `com.finisherlegacy.app` · targetSdk 36 · AAB firmado con Play App Signing.

## 1. Ficha de Play Store (Grow › Store presence › Main store listing)

**Nombre de la app** (≤ 30): `Finisher Legacy` (15)

**Descripción breve** (≤ 80):
`Guarda tus carreras, medallas y recuerdos, y activa tu Finisher Legacy Tag NFC.` (79)

**Descripción completa** (≤ 4000):

```
Finisher Legacy guarda tu historia deportiva en un solo lugar: tus carreras, tus resultados, tus medallas y los recuerdos que hacen que cada meta valga la pena.

TU LEGADO, ORGANIZADO
• Consulta tus eventos y resultados oficiales: distancia, tiempo y posición.
• Registra tus medallas con foto, tiempo, ritmo y la historia detrás de cada una.
• Guarda fotos y videos de cada carrera en tus recuerdos.

FINISHER LEGACY TAG (NFC)
• Activa tu Finisher Legacy Tag acercándolo al teléfono.
• Quien lo toque con su celular abre la historia que tú elijas, con la privacidad que tú decidas.

SEGUIMIENTO EN VIVO
• Comparte un enlace para que tu familia y amigos sigan tu avance durante la carrera.
• Solo se activa cuando tú lo inicias y se detiene cuando terminas.

COMUNIDAD
• Publica momentos de tus entrenamientos y carreras.
• Sigue a otros atletas, reacciona y comenta.
• Tú decides quién ve tu perfil y cada publicación: todos, seguidores o solo tú.
• Reporta contenido y bloquea perfiles en cualquier momento.

MENSAJES DE ÁNIMO
• Recibe mensajes de ánimo de tu equipo de apoyo y escúchalos mientras entrenas o corres, incluso con la pantalla bloqueada.

COLECCIONES
• Explora las colecciones del Finisher Legacy Tag y compra tus piezas físicas con pago seguro.

Tu cuenta es gratuita. Puedes eliminarla cuando quieras desde la app o en finisherlegacy.com/eliminar-cuenta.
```

**Categoría:** Deportes · **Etiquetas:** Correr, Fitness, Comunidad.
**Correo de contacto:** `hola@finisherlegacy.com` · **Sitio:** https://finisherlegacy.com · **Política de privacidad:** https://finisherlegacy.com/privacy

**Recursos gráficos:** ícono 512×512 PNG (exportar de `assets/images/icon.png`), gráfico de funciones 1024×500 JPG/PNG (obligatorio), 2–8 capturas de teléfono 9:16 (lado mínimo 320 px, máximo 3840 px). Ver [screenshots.md](./screenshots.md).

## 2. Contenido de la app (Policy › App content)

### Política de privacidad
`https://finisherlegacy.com/privacy`

### Acceso a la app
«Todas o algunas funciones están restringidas» → agregar instrucciones:
- Nombre: `Cuenta de revisión`
- Usuario / contraseña: los que imprime `php artisan app:review-account revision@finisherlegacy.com` (ejecutado en **producción**).
- Instrucciones: pegar el bloque «Google Play — App access» de [review-notes-es-en.md](./review-notes-es-en.md).

### Anuncios
**No**, la app no contiene anuncios. (El permiso `AD_ID` está bloqueado en `app.config.ts`.)

### Clasificación de contenido (cuestionario IARC)
Categoría: **Todas las demás tipos de apps** (no es juego). Respuestas:

| Pregunta | Respuesta |
|---|---|
| Violencia, miedo, sexualidad, lenguaje soez, drogas, apuestas | No |
| ¿Los usuarios pueden interactuar o intercambiar contenido? | **Sí** (momentos, comentarios, mensajes de ánimo) |
| ¿Comparte la ubicación del usuario con otros usuarios? | **Sí** (seguimiento en vivo, solo con quien tiene el enlace y solo si el usuario lo inicia) |
| ¿Permite comprar bienes digitales? | No (solo productos físicos) |
| ¿Contenido generado por usuarios moderado? | Sí: filtro automático, reportes, bloqueo y revisión manual |
| ¿Es una app de navegador web o motor de búsqueda? | No |

Resultado esperado: clasificación para adolescentes/«Mayores de 12» con descriptores «Los usuarios interactúan» y «Comparte ubicación».

### Público objetivo y contenido
- Edad objetivo: **18 años o más** (los Términos piden 18+ o autorización del tutor). No seleccionar rangos menores: evita el programa de Familias.
- ¿Podría atraer a niños? **No.**

### Seguridad de los datos (Data safety)

Preguntas generales:
- ¿Recopila o comparte datos de usuario? **Sí.**
- ¿Todos los datos se cifran en tránsito? **Sí** (HTTPS).
- ¿Ofrecen una forma de solicitar la eliminación? **Sí** → URL: `https://finisherlegacy.com/eliminar-cuenta`.
- Compartido con terceros: **No** en todos los tipos (proveedores de servicio —hosting, push, correo, paquetería, procesador de pagos— y lo que el usuario decide publicar o compartir no cuentan como «compartir»).

| Tipo de dato (Play) | Recopilado | Opcional | Fines | Origen en la app |
|---|---|---|---|---|
| Información personal › Nombre | Sí | No | Funcionalidad, Gestión de cuenta | Registro |
| Información personal › Dirección de correo | Sí | No | Funcionalidad, Gestión de cuenta, Comunicaciones | Registro, avisos de pedido |
| Información personal › IDs de usuario | Sí | No | Funcionalidad, Gestión de cuenta | Legacy ID, nombre de usuario |
| Información personal › Dirección | Sí | Sí | Funcionalidad | Envío de pedidos (checkout) |
| Información personal › Número de teléfono | Sí | Sí | Funcionalidad, Gestión de cuenta | Perfil / envío |
| Información financiera › Historial de compras | Sí | Sí | Funcionalidad | Mis pedidos |
| Ubicación › Ubicación precisa | Sí | Sí | Funcionalidad | Seguimiento en vivo iniciado por el usuario |
| Salud y fitness › Información de fitness | Sí | Sí | Funcionalidad | Resultados, tiempos, ritmos, medallas, entrenamiento |
| Fotos y videos › Fotos / Videos | Sí | Sí | Funcionalidad | Medallas, momentos, recuerdos, perfil |
| Mensajes › Otros mensajes en la app | Sí | Sí | Funcionalidad | Comentarios y mensajes de ánimo |
| Actividad en la app › Otro contenido generado por el usuario | Sí | Sí | Funcionalidad | Momentos, biografía |
| Actividad en la app › Otras acciones | Sí | Sí | Funcionalidad | Seguir, reaccionar, bloquear, reportar |
| ID del dispositivo u otros IDs | Sí | Sí | Funcionalidad | Token de notificaciones push |

No se recopila: información de pago (la tarjeta se captura en la página del procesador en el navegador, nunca en la app ni en nuestro servidor), contactos, calendario, archivos, audio grabado (la app no graba), historial web, diagnósticos/crash (no hay SDK de analítica). Si en el futuro se agrega Sentry/analytics, actualizar esta tabla y `app.config.ts › PRIVACY_MANIFEST`.

### Declaraciones de permisos

**Servicios en primer plano** (obligatorio, targetSdk ≥ 34):

| Tipo | Caso de uso | Descripción | Si se interrumpe | Video |
|---|---|---|---|---|
| `location` | Background Location Updates: User-initiated location sharing | El atleta inicia el seguimiento en vivo de su carrera para que las personas con su enlace vean su avance con la pantalla bloqueada. Aparece una notificación permanente y se detiene desde la app. | Sus seguidores dejan de ver su posición y el recorrido queda incompleto. | Enlace YouTube no listado (ver guion) |
| `mediaPlayback` | Media Playback | El atleta reproduce los mensajes de ánimo / audio de su entrenamiento y los sigue escuchando con la pantalla bloqueada mientras corre. | El audio se corta a media sesión. | Mismo video |

**Ubicación en segundo plano:** no aplica (`ACCESS_BACKGROUND_LOCATION` bloqueado; Android usa servicio en primer plano).
**Fotos y videos (`READ_MEDIA_*`):** no aplica (bloqueados; se usa el selector del sistema).
**Apps de salud:** si Play Console muestra la declaración de apps de salud, marcar «Actividad física y fitness» (seguimiento de carreras y entrenamiento), sin datos médicos.
**Funciones financieras, gobierno, noticias:** No.

## 3. Cuenta nueva personal: 12 testers durante 14 días

Las cuentas **personales** creadas después del 13-nov-2023 no pueden publicar en Producción hasta:
1. Tener una **prueba cerrada** con **al menos 12 testers inscritos de forma continua durante 14 días** (si alguien sale y vuelve, su conteo se reinicia).
2. Solicitar acceso: Panel › **Solicitar acceso a producción** (preguntas sobre la prueba, la audiencia y la preparación). Google responde en ≈7 días.

Con cuenta de **organización** (requiere D-U-N-S) este requisito no aplica. Planea ~3 semanas antes del lanzamiento público con cuenta personal.

Ruta: **Prueba interna** (hasta 100 testers, sin revisión larga, para validar el AAB) → **Prueba cerrada** (lista de correos de ≥12 personas reales que usen la app) → **Producción**.

## 4. Publicación

```bash
# 1. Una sola vez
npm i -g eas-cli && eas login
eas env:create --environment production --name GOOGLE_SERVICES_JSON --type file --value ./secrets/google-services.json --visibility secret

# 2. Build de producción (AAB, versionCode autoincrementado en EAS)
eas build -p android --profile production

# 3. Primer envío: Google exige subir el PRIMER AAB a mano en Play Console
#    (Prueba interna › Crear versión › subir el .aab que descarga EAS).
#    Después, envíos automáticos:
eas submit -p android --profile production   # track internal, borrador
```

Luego en Play Console: promover la versión de prueba interna → prueba cerrada → (tras 14 días y aprobación) producción.

Antes de cada envío:
- `php artisan app:review-account revision@finisherlegacy.com` en producción (renueva contraseña y datos demo).
- Agregar la huella SHA-256 de **Play App Signing** (Configuración › Integridad de la app) a `ANDROID_SHA256_CERT_FINGERPRINTS` en el `.env` del servidor (separadas por coma; incluye también la de la llave de subida de EAS si pruebas APKs internos), para que `/.well-known/assetlinks.json` verifique los App Links.
- Subir `version` en `app.json` si es una versión nueva para usuarios.

## 5. Productos integrados (In-app products)

Lo único digital que vende la app es **espacio extra de fotos para un recuerdo Legacy** («Ampliar espacio»), y solo con **Google Play Billing** (`expo-iap`, Play Billing 8), como exige la política de Pagos; la app nunca enlaza a la compra web. Detalle técnico y del servidor: `finisherLegacy/docs/renovacion/compras-dentro-de-app.md`.

1. **Perfil de pagos:** Configuración › **Perfil de pagos** con cuenta bancaria e información fiscal (cuenta de comerciante activa). Sin él no se pueden crear productos de pago.
2. **Permiso BILLING:** lo agrega el plugin `expo-iap`. Play Console solo muestra «Monetizar › Productos» después de subir un AAB que lo incluya (sube primero una build de prueba interna con `expo-iap`).
3. **Productos:** Monetizar › Productos › **Productos únicos** › Crear producto (la app lo **consume** al acreditarlo, así se puede volver a comprar). Un producto por ampliación; ID sugerido `fotos_10` (minúsculas, números, `_` y `.`; permanente). Nombre y descripción en español, **precio** predeterminado en MXN (Play convierte al resto de países; o fija precios por país), estado **Activo**.
4. **Admin web:** Límites y tarifas › abrir la ampliación › «ID de producto en Google Play» = el mismo ID.
5. **Cuenta de servicio (servidor):** Google Cloud del proyecto vinculado › habilitar **Google Play Android Developer API** › crear cuenta de servicio y llave JSON (guárdala fuera del repo). Play Console › Usuarios y permisos › invitar el correo de la cuenta de servicio con **Ver información financiera** y **Gestionar pedidos y suscripciones** para esta app. `.env` del servidor: `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON=/ruta/absoluta.json`, `GOOGLE_PLAY_PACKAGE_NAME=com.finisherlegacy.app`. Los permisos pueden tardar hasta 24 h en propagarse.
6. **Notificaciones en tiempo real (reembolsos):** Pub/Sub › tema `play-rtdn` con rol **Publicador de Pub/Sub** para `google-play-developer-notifications@system.gserviceaccount.com` › suscripción **push** a `https://finisherlegacy.com/api/webhooks/google-play` con autenticación (OIDC; audiencia = esa URL → `GOOGLE_PLAY_RTDN_AUDIENCE`; correo de la cuenta de push → `GOOGLE_PLAY_RTDN_SERVICE_ACCOUNT`). Alternativa sin OIDC: `…/google-play?token=` + `GOOGLE_PLAY_RTDN_TOKEN`. Luego Monetizar › Configuración de monetización › **Notificaciones para desarrolladores en tiempo real** › nombre del tema › «Enviar notificación de prueba». Un reembolso baja el límite de fotos; nunca borra fotos.
7. **Testers de licencia:** Configuración › **Pruebas de licencias** → agregar los Gmail de prueba (respuesta «LICENSED»). La app debe instalarse desde una pista de prueba de Play (no por `adb`). Con las tarjetas de prueba se cubren: compra aprobada, rechazada, **pago pendiente** (se acredita al aprobarse), modo avión justo después de pagar (al reabrir se acredita), «Restaurar compras» y reembolso desde Gestión de pedidos.
8. **Seguridad de los datos:** «Información financiera › Historial de compras» ya está declarado (§2); Google procesa el pago: no se declara información de pago.
9. Requiere **nueva build nativa** (AAB con Play Billing).
