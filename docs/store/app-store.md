# App Store — Finisher Legacy

Bundle ID: `com.finisherlegacy.app` · Solo iPhone (`supportsTablet: false`) · Vertical.

## 1. Apple Developer (developer.apple.com › Certificates, IDs & Profiles)

1. **Team ID**: Membership details → copiar (10 caracteres). Va en:
   - `eas.json › submit.production.ios.appleTeamId` (reemplaza `REEMPLAZAR_APPLE_TEAM_ID`);
   - `.env` del servidor: `APPLE_TEAM_ID=` (activa `/.well-known/apple-app-site-association`).
2. **Identifiers › App ID** `com.finisherlegacy.app` con capabilities:
   - **NFC Tag Reading** (entitlement `com.apple.developer.nfc.readersession.formats = [TAG]`).
   - **Associated Domains** (`applinks:finisherlegacy.com`).
   - **Push Notifications**.
   - **In-App Purchase** (ampliaciones de fotos — ver §7).
   EAS sincroniza estas capabilities en el primer `eas build` si inicias sesión con la cuenta del equipo; revisa que queden marcadas.
3. **Keys › APNs key** (.p8): `eas credentials -p ios` → Push Notifications → subir o generar. Sin ella no llegan las notificaciones push.
4. No se usa Sign in with Apple ni Apple Pay (no hay login social). Los productos físicos se pagan en el checkout web (OpenPay); los bienes digitales (espacio de fotos) solo con compras dentro de la app (§7).

## 2. App Store Connect › Mi app

| Campo | Valor |
|---|---|
| Nombre (≤ 30) | `Finisher Legacy` |
| Subtítulo (≤ 30) | `Tu historia deportiva, viva` |
| Idioma principal | Español (México) |
| Categoría principal / secundaria | Deportes / Redes sociales |
| SKU | `finisherlegacy-ios` |
| URL de soporte | https://finisherlegacy.com/contact |
| URL de marketing | https://finisherlegacy.com |
| URL de política de privacidad | https://finisherlegacy.com/privacy |
| Licencia (EULA) | Personalizada → pegar/enlazar https://finisherlegacy.com/terms (incluye reglas de la comunidad con tolerancia cero) |
| Copyright | `2026 Finisher Legacy` |
| Precio | Gratis · sin compras dentro de la app |

**Texto promocional** (≤ 170): `Activa tu Finisher Legacy Tag, guarda cada carrera y deja que tu gente te siga en vivo el día de la carrera.`

**Palabras clave** (≤ 100, sin espacios tras comas): `correr,maratón,medallas,carreras,running,NFC,resultados,seguimiento,atletas,trail,triatlón`

**Descripción:** la misma descripción completa de [google-play.md](./google-play.md#1-ficha-de-play-store-grow--store-presence--main-store-listing).

### Clasificación por edad (cuestionario)
- Contenido generado por usuarios / interacción entre usuarios: **Sí** (moderado: filtro, reportes, bloqueo).
- Mensajería o chat: **Sí** (comentarios y mensajes de ánimo).
- Comparte ubicación: **Sí**, solo con quien tiene el enlace de seguimiento.
- Violencia, contenido sexual, drogas, apuestas, terror, lenguaje soez, contenido médico: **No / Ninguno**.
- Navegador web sin restricciones: **No**.
- Anuncios: **No**.
Apple calcula la edad resultante (esperado: 13+ por la interacción entre usuarios).

### Cumplimiento de exportación
`ITSAppUsesNonExemptEncryption = false` ya está en el Info.plist: App Store Connect no volverá a preguntar. Respuesta equivalente: «Solo usa cifrado exento (HTTPS / cifrado del sistema)».

## 3. Privacidad de la app (etiquetas «nutricionales»)

¿Recopila datos? **Sí.** Para todos los tipos: **vinculados a la identidad del usuario**, **no** usados para rastreo, única finalidad **Funcionalidad de la app** (no Publicidad, no Analítica, no Personalización de producto).

| Categoría Apple | Tipo | Origen |
|---|---|---|
| Información de contacto | Nombre, Correo electrónico, Número de teléfono, Dirección física | Registro, perfil, envío de pedidos |
| Salud y fitness | Fitness | Resultados, tiempos, medallas, entrenamiento |
| Ubicación | Ubicación precisa | Seguimiento en vivo iniciado por el usuario |
| Contenido del usuario | Fotos o videos; Otro contenido del usuario | Medallas, momentos, recuerdos, comentarios, mensajes de ánimo |
| Identificadores | ID de usuario; ID del dispositivo | Legacy ID / username; token de push |
| Compras | Historial de compras | Pedidos |

**No** se declara «Información financiera › Pago»: la tarjeta se captura en la página del procesador (navegador), nunca en la app ni en nuestros servidores. Esta tabla es idéntica a `app.config.ts › PRIVACY_MANIFEST › NSPrivacyCollectedDataTypes`; cámbialas juntas.

**Privacy Manifest (APIs con motivo declarado):** UserDefaults `CA92.1`; FileTimestamp `C617.1`, `0A2A.1`, `3B52.1`; SystemBootTime `35F9.1`; DiskSpace `E174.1`, `85F4.1`. `NSPrivacyTracking = false`.

## 4. Información para la revisión (App Review Information)

- **Inicio de sesión requerido:** Sí → usuario/contraseña impresos por `php artisan app:review-account revision@finisherlegacy.com` (en **producción**, justo antes de enviar).
- **Contacto:** nombre, teléfono y correo reales del responsable (ver pendientes).
- **Notas:** bloque «App Store — Review Notes» de [review-notes-es-en.md](./review-notes-es-en.md).
- **Adjunto:** enlace al video de demostración (NFC + seguimiento en vivo + audio en segundo plano) dentro de las notas.

## 5. Capturas

Con `supportsTablet: false` **no** se piden capturas de iPad.

| Tamaño | Píxeles verticales aceptados | ¿Obligatorio? |
|---|---|---|
| iPhone 6.9" (Dynamic Island grande) | 1320×2868, 1290×2796, 1260×2736 | Recomendado (cubre 6.5") |
| iPhone 6.5" (Face ID grande) | 1284×2778, 1242×2688 | Solo si no subes 6.9" |

Hasta 10 por tamaño, PNG/JPG **sin transparencia**. Ver [screenshots.md](./screenshots.md). Recomendación: mantener `supportsTablet: false` hasta diseñar para iPad; activarlo obligaría a capturas de 13" y a pasar revisión en iPad.

## 6. Build, TestFlight y envío

```bash
eas login
eas build -p ios --profile production     # buildNumber autoincrementado en EAS
eas submit -p ios --profile production    # sube a App Store Connect (requiere ascAppId y appleTeamId reales)
```

1. El build aparece en TestFlight tras el procesamiento (10–30 min). Responder el cumplimiento de exportación no será necesario.
2. **TestFlight interno**: agrega tu equipo, prueba en un iPhone real NFC (XS o posterior), seguimiento en vivo con pantalla bloqueada, audio con pantalla bloqueada, push y eliminación de cuenta.
3. App Store Connect › versión 1.0.0 → seleccionar el build → completar campos de las secciones 2–5 → **Enviar a revisión**.
4. `ascAppId` = «Apple ID» numérico de la app en App Store Connect › Información de la app. Guárdalo también en `IOS_APP_STORE_ID` del servidor (smart app banner).

## 7. Compras dentro de la app (In-App Purchases)

Lo único digital que vende la app es **espacio extra de fotos para un recuerdo Legacy** («Ampliar espacio»). Se cobra **solo** con StoreKit 2 (`expo-iap`), como exige la guía 3.1.1; la app nunca enlaza a la compra web. Detalle técnico y del servidor: `finisherLegacy/docs/renovacion/compras-dentro-de-app.md`.

1. **Contrato:** App Store Connect › Business › **Paid Apps Agreement** firmado por el Account Holder, con **cuenta bancaria** y **formularios fiscales** completos (estado *Active*). Sin esto los productos no cargan y la app oculta la compra.
2. **Productos:** Mi app › Monetización › **Compras dentro de la app** › «+» → tipo **Consumible** (se puede comprar varias veces y para distintos recuerdos). Un producto por ampliación; ID de referencia sugerido `com.finisherlegacy.app.fotos10` (el ID es permanente). Completar:
   - Nombre de referencia y **localización es-MX**: nombre visible (p. ej. «10 fotos más») y descripción («Agrega 10 fotos a un recuerdo Legacy»).
   - **Precio:** elegir el punto de precio (Apple publica una tabla de ~900 puntos por país; normalmente el equivalente a la tarifa web vigente). Apple convierte a cada tienda; impuestos incluidos.
   - Disponibilidad: todos los países donde se publica la app.
   - **Información para la revisión:** captura de la hoja de compra (pantalla Historia › «Ampliar espacio») y nota: «Adds photo slots to the user's Legacy story; consumable; delivered by our server after verification».
   - El **primer** producto se envía a revisión **junto con una versión de la app** (selecciónalo en la versión antes de «Enviar a revisión»).
3. **Admin web:** Límites y tarifas › abrir la ampliación › «ID de producto en App Store» = el mismo ID.
4. **Llave del servidor:** Usuarios y acceso › Integraciones › **Compras dentro de la app** › generar llave → `.env` del servidor: `APPLE_IAP_KEY_ID`, `APPLE_IAP_ISSUER_ID`, `APPLE_IAP_PRIVATE_KEY` (contenido o ruta del .p8, se descarga una sola vez), `APPLE_BUNDLE_ID=com.finisherlegacy.app`. Sin ellas el servidor responde `IAP_NOT_CONFIGURED` y la app oculta la compra.
5. **Notificaciones de reembolso:** Información de la app › **App Store Server Notifications** › **Versión 2** → URL de producción **y** de sandbox: `https://finisherlegacy.com/api/webhooks/app-store` → «Enviar notificación de prueba» (debe dar 200). Un reembolso baja el límite de fotos; nunca borra fotos.
6. **Sandbox testers:** Usuarios y acceso › **Sandbox** › Testers → crear correos de prueba (no Apple ID reales). En el iPhone: Ajustes › App Store › Cuenta de sandbox. Probar con TestFlight o build de desarrollo (no Expo Go): comprar, cancelar, Ask to Buy (pendiente), modo avión justo después de pagar (al reabrir se acredita), «Restaurar compras», y reembolso.
7. **Revisión:** la cuenta de revisión (§4) debe tener al menos un recuerdo activado para que el revisor llegue a «Ampliar espacio». Apple compra en sandbox; el servidor lo acepta (`APPLE_IAP_ALLOW_SANDBOX=true`).
8. **Privacidad:** «Compras › Historial de compras» ya está declarado (§3); no cambia. Apple procesa el pago: no se declara información financiera.
9. Requiere **nueva build nativa** (`expo-iap` agrega StoreKit; plugin en `app.config.ts`).
