# Notas para revisores (copiar y pegar)

Antes de enviar: en **producción** ejecuta

```bash
php artisan app:review-account revision@finisherlegacy.com
```

y reemplaza `<CORREO>` / `<CONTRASEÑA>` con lo que imprime. El comando crea (o renueva) una cuenta marcada «Revisión App (demo)», perfil privado, con una historia y una medalla de ejemplo tituladas «[DEMO]», visibles solo para esa cuenta. Volver a ejecutarlo reinicia la contraseña y los datos demo.

Sube el video a YouTube como **no listado** y reemplaza `<VIDEO_URL>`.

---

## App Store — Review Notes (English)

```
Demo account
Email: <CORREO>
Password: <CONTRASEÑA>
The account is pre-loaded with clearly labelled sample data ("[DEMO]") that only this account can see.

What the app does
Finisher Legacy keeps an athlete's sporting history: race results, medals, photos and memories, a community feed, live race tracking, and cheer messages from friends. Creating an account and every in-app feature are free.

NFC (Finisher Legacy Tag)
The Finisher Legacy Tag is a physical NFC keepsake (a strap with an NTAG chip) sold as a physical product. The app uses Core NFC only when the user taps "Activar una pieza con NFC" (Recuerdos tab) to link a new tag to their account and verify it. A reviewer has no tag, so the full flow is shown in this video: <VIDEO_URL>. Without a tag the screen shows the instructions and the "hold your tag near the phone" sheet. The tag does not unlock any paid digital content or app functionality; it opens the athlete's own story page.

Background location (UIBackgroundModes: location)
Used only by "Seguimiento en vivo": the athlete starts it from one of their races, accepts an in-app explanation, and their position is shared with people who have the tracking link while the phone is locked during the race. It stops when they end it or the race finishes. Shown in the video.

Background audio (UIBackgroundModes: audio)
Cheer messages and training audio keep playing with the screen locked while the athlete runs. Playback only; the app never records audio and does not request the microphone.
Guideline 2.5.4: in "Modo entrenamiento" with "one message every N minutes", the athlete starts a workout whose whole purpose is to hear their cheer messages through the headphones at set times while the phone is locked. Between two messages the app keeps its audio session alive with a near-silent track, mixed with (never interrupting) the athlete's music, so the next message plays on time. It runs only while a workout is active: it stops when the athlete pauses or ends the workout, or when every message has played. The screen shows "Sesión activa" and a battery note meanwhile.

Purchases
The store sells only physical goods (Finisher Legacy Tags, shipped to the user), paid through an external payment processor on our website (guideline 3.1.3(e)). No digital goods, subscriptions or content are sold in the app, and nothing in the app is unlocked by payment.

User-generated content (guideline 1.2)
- Users must accept the Terms (with zero-tolerance community rules) at sign-up.
- Objectionable language is filtered automatically before posting.
- Report: "…" menu on any moment ("Reportar momento"), flag icon on any comment, and "Reportar perfil" on any profile.
- Block: "Bloquear a @usuario" on any profile.
- Reports are reviewed by our team within 24 hours; content is removed and offending accounts are suspended.
- Contact: hola@finisherlegacy.com (also in Configuración › Escríbenos).

Account deletion
Perfil › Configuración (gear) › Contraseña y cuenta › Eliminar mi cuenta. Also available at https://finisherlegacy.com/eliminar-cuenta.

Sign-in
Email and password only (no third-party login).
```

## App Store — Notas de revisión (español)

```
Cuenta demo
Correo: <CORREO>
Contraseña: <CONTRASEÑA>
La cuenta tiene datos de ejemplo marcados como "[DEMO]" que solo ve esta cuenta.

Qué hace la app
Finisher Legacy guarda la historia deportiva del atleta: resultados, medallas, fotos y recuerdos, comunidad, seguimiento en vivo de carreras y mensajes de ánimo. Crear la cuenta y todas las funciones de la app son gratis.

NFC (Finisher Legacy Tag)
El Finisher Legacy Tag es un recuerdo físico con chip NFC que se vende como producto físico. La app usa Core NFC solo cuando el usuario toca "Activar una pieza con NFC" (pestaña Recuerdos) para vincular un tag nuevo a su cuenta y verificarlo. El revisor no tiene un tag; el flujo completo está en este video: <VIDEO_URL>. El tag no desbloquea contenido digital de pago ni funciones de la app: abre la página de la historia del propio atleta.

Ubicación en segundo plano
Solo para "Seguimiento en vivo": el atleta lo inicia desde una de sus carreras, acepta una explicación en la app y su posición se comparte con quien tenga el enlace mientras el teléfono está bloqueado durante la carrera. Se detiene al terminarlo. Se muestra en el video.

Audio en segundo plano
Los mensajes de ánimo y el audio del entrenamiento siguen sonando con la pantalla bloqueada. Solo reproducción; la app no graba ni pide el micrófono.
Directriz 2.5.4: en "Modo entrenamiento" con "un mensaje cada N minutos", el atleta inicia un entrenamiento cuyo propósito es escuchar sus mensajes de ánimo en los audífonos a intervalos con el teléfono bloqueado. Entre dos mensajes la app mantiene activa su sesión de audio con una pista casi silenciosa, mezclada con la música del atleta (nunca la interrumpe), para que el siguiente mensaje suene a tiempo. Solo funciona durante un entrenamiento activo: se detiene al pausarlo o terminarlo, o cuando ya sonaron todos los mensajes. Mientras tanto la pantalla muestra "Sesión activa" y un aviso de batería.

Compras
La tienda vende solo bienes físicos (Finisher Legacy Tag con envío), pagados con un procesador externo en nuestro sitio (3.1.3(e)). No se venden bienes digitales, suscripciones ni contenido, y nada de la app se desbloquea con un pago.

Contenido de usuarios (1.2)
- Aceptación obligatoria de los Términos (reglas de la comunidad con tolerancia cero) al registrarse.
- Filtro automático de lenguaje ofensivo antes de publicar.
- Reportar: menú "…" de cada momento, ícono de bandera en cada comentario y "Reportar perfil".
- Bloquear: "Bloquear a @usuario" en cualquier perfil.
- Revisamos los reportes en menos de 24 horas, retiramos el contenido y suspendemos cuentas infractoras.
- Contacto: hola@finisherlegacy.com.

Eliminación de cuenta
Perfil › Configuración › Contraseña y cuenta › Eliminar mi cuenta. También en https://finisherlegacy.com/eliminar-cuenta.
```

## Google Play — App access (English, as Play reviewers read it)

```
Sign in with: Email <CORREO> / Password <CONTRASEÑA> (tap "Ya tengo cuenta" on the welcome screen).
The account has sample data labelled "[DEMO]", visible only to this account.
NFC activation requires a physical Finisher Legacy Tag; the full flow, live tracking with the screen locked, and background audio are shown here: <VIDEO_URL>.
No other credentials, codes or hardware are needed for the rest of the app.
```

## Guion del video de demostración

Grabación de pantalla del teléfono (Android: `adb shell screenrecord /sdcard/demo.mp4`; iPhone: Centro de control › Grabar pantalla) + una toma de cámara mostrando el tag acercándose al teléfono. 2–3 minutos, sin datos personales reales.

1. Abrir la app, iniciar sesión con la cuenta de revisión.
2. **NFC:** Recuerdos › «Activar una pieza con NFC» → acercar un tag nuevo → confirmación → abrir la historia.
3. **Seguimiento en vivo:** abrir una carrera propia → «Seguimiento en vivo» → pantalla de consentimiento → permitir ubicación → iniciar → bloquear el teléfono → mostrar la notificación permanente (Android) / indicador azul (iOS) → abrir el enlace en otro dispositivo y ver la posición moverse → detener.
4. **Audio en segundo plano:** reproducir un mensaje de ánimo / audio de entrenamiento → bloquear pantalla → se sigue escuchando → pausar desde la pantalla bloqueada. Después: Modo entrenamiento › «3 min» › Empezar → mostrar «Sesión activa» → bloquear con música sonando → el siguiente mensaje llega a los 3 minutos sobre la música.
5. **Comunidad:** abrir un momento → menú «…» → Reportar; abrir un perfil → Bloquear.
6. **Eliminar cuenta:** Configuración › Contraseña y cuenta › Eliminar mi cuenta (mostrar el diálogo, sin confirmar).

El mismo video sirve para Google Play (declaraciones de servicios en primer plano `location` y `mediaPlayback`) y para Apple.
