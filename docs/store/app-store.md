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
   EAS sincroniza estas capabilities en el primer `eas build` si inicias sesión con la cuenta del equipo; revisa que queden marcadas.
3. **Keys › APNs key** (.p8): `eas credentials -p ios` → Push Notifications → subir o generar. Sin ella no llegan las notificaciones push.
4. No se usa Sign in with Apple ni Apple Pay (no hay login social; el pago es web).

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
