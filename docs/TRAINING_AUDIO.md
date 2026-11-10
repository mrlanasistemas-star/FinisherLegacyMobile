<!--
  Entrenamientos audio: how cheer messages share the audio session with the
  athlete's music, how interval workouts survive a locked screen, the
  lock-screen controls per platform, expired-URL recovery, and the device
  test matrix (NOT YET VERIFIED on hardware).
-->

# Entrenamientos — audio en segundo plano y pantalla bloqueada

Código: `src/features/training/` — `audio-driver.ts` (único archivo que toca `expo-audio` ~57.0.5), `audio-session.ts` (política pura de fases), `remote-commands.ts` (comandos de la pantalla bloqueada inferidos), `url-refresh.ts` (URLs firmadas vencidas), `player-controller.ts` (motor). Recurso: `assets/silence.m4a` (10 s de silencio AAC mono 16 kb/s, ~4 KB, generado con `ffmpeg -f lavfi -i anullsrc=r=44100:cl=mono -t 10 -c:a aac -b:a 16k silence.m4a`).

## Fases de la sesión de audio (Modo entrenamiento)

| Fase | Cuándo | Sesión del SO | Música del atleta |
|---|---|---|---|
| `off` | Sin entrenamiento, cola agotada o terminada | La de expo-audio por mensaje (se libera al terminar) | — |
| `message` | Suena una nota de voz | «Mezclar» → `duckOthers` · «Pausar» → `doNotMix` | Baja / se pausa |
| `keepAlive` | Entrenamiento activo sin nota de voz sonando (esperando el intervalo o un mensaje de solo texto) | `mixWithOthers` + pista silenciosa en bucle (vol. 0.01) | Intacta |
| `paused` | Entrenamiento en pausa | Liberada (nada suena, guideline 2.5.4) | Vuelve |

Transiciones (todas en una sola cadena de promesas, nunca se intercalan):

- `message → keepAlive`: iOS desactiva la sesión con `notifyOthersOnDeactivation` (`setIsAudioActiveAsync(false)`), así la música vuelve a volumen normal o se reanuda; luego `mixWithOthers` y play del silencio. Necesario porque el keep-alive se crea con `keepAudioSessionActive: true` y expo-audio ya no desactiva solo.
- `keepAlive → message` con «Mezclar»: se libera la sesión y `play()` la reactiva con `duckOthers` (iOS solo atenúa al **activar**). Una activación mezclable desde segundo plano está permitida.
- `keepAlive → message` con «Pausar»: se cambia la categoría sobre la sesión que ya mantiene el keep-alive (iOS rechaza activar una sesión no mezclable desde segundo plano). Si iOS aun así rechaza `play()`, el mensaje cae a `duckOthers` (la música baja en lugar de pausarse).
- `paused`/`off`: el silencio se detiene y se libera la sesión. En Android la notificación queda como «En pausa» para poder reanudar desde ella.

**Latido (heartbeat).** Las actualizaciones de estado del keep-alive (cada 1 s) son eventos nativos y llaman a `sessionTick()` y al temporizador de mensajes de texto. Esto importa en Android: React Native pausa sus temporizadores JS (`JavaTimerManager.onHostPause`) en cuanto la actividad pasa a segundo plano, aunque el proceso siga vivo; sin este latido el programador «un mensaje cada N minutos» no avanzaría con la pantalla apagada. En iOS los temporizadores sí siguen mientras la app no esté suspendida, y el latido es redundante pero inocuo.

**Android y el servicio en primer plano.** expo-audio solo promueve su `AudioControlsService` (tipo `mediaPlayback`) cuando un reproductor está activo para la pantalla bloqueada; sin eso el audio en segundo plano se corta a los ~3 min. Por eso en `keepAlive` el reproductor silencioso toma la notificación («Modo entrenamiento · Sesión activa»), y la cede a cada mensaje. Según el código fuente, el servicio sobrescribe `onUpdateNotification` y no llama a `stopForeground` al pausar, así que debería seguir en primer plano en `paused` (filas 15–17 de la matriz lo comprueban). Pausar desde esa notificación pausa el entrenamiento; reproducir lo reanuda.

## Controles en la pantalla bloqueada

- **iOS** solo muestra Now Playing para una sesión **no mezclable**. Decisión: con «Mezclar con mi música» (`duckOthers`, mezclable) no hay controles en iPhone — la música del atleta conserva su Now Playing —; con «Pausar mi música» (`doNotMix`) sí. No se añadió un interruptor «Controles en pantalla de bloqueo»: activarlo en «Mezclar» obligaría a una sesión no mezclable que pausa la música, es decir, sería «Pausar» con otro nombre. La hoja de audio lo explica en una línea (`mixModeCaption`).
- **Android** muestra la notificación multimedia en ambos modos.
- **Siguiente / anterior.** expo-audio 57 no expone next/previous para un `AudioPlayer` (Android elimina explícitamente `COMMAND_SEEK_TO_NEXT/PREVIOUS`; iOS solo registra play/pause/toggle, cambiar posición y skip ±10 s, todo resuelto en nativo sin avisar a JS). expo-audio 58 añade `showNextTrack/showPreviousTrack`, pero solo para `AudioPlaylist` y requiere SDK 58. Solución: se muestran los botones ±10 s y `remote-commands.ts` infiere el comando por el salto de posición que no originó JS:
  - +10 s (±1 s, descontando el avance natural según la velocidad) o terminar justo tras un salto → **siguiente mensaje**;
  - −10 s, o salto a 0 desde los primeros ~10 s → **anterior** con la regla de Apple Music (pasados 3 s reinicia).
  - Solo si hay más de un mensaje en la cola y existe a dónde ir; si no, se deja el salto nativo.
  - Limitación: el ícono dice «10» aunque cambia de mensaje; un arrastre de la barra que caiga a ≈10 s también cambia de mensaje.
- Pausas nativas (pantalla bloqueada, audífonos desconectados, llamada) pausan el reloj del entrenamiento; la reanudación nativa (incluida la de iOS al terminar una llamada) lo reanuda.

## URLs firmadas vencidas

Al recibir `status.error` de un mensaje remoto (no descargado), el controlador pide una URL nueva una sola vez por mensaje (`createRetryGate`): `refetchQueries` de las listas cacheadas → buscarlo en la caché → si no está, páginas 1–3 de «Todos» (`fetchTrainingMessages`). Reemplaza la fuente, vuelve a la posición donde falló y sigue reproduciendo. Si falla otra vez se muestra «No pudimos reproducir este audio…»; tocar reproducir recarga y rearma el reintento automático.

## Matriz de pruebas en dispositivo — NOT YET VERIFIED

Ninguna fila se ha probado en hardware. Requiere una build nativa que incluya expo-audio (ya presente) — los cambios de esta tarea son solo JS + un recurso, no requieren rebuild. Marcar ✅/❌ con modelo y versión de SO.

Preparación: 6+ mensajes con audio (y 1 de solo texto), Spotify o Apple Music sonando, audífonos Bluetooth.

| # | Plataforma | Pantalla | Modo música | Escenario | Esperado | Estado |
|---|---|---|---|---|---|---|
| 1 | iPhone | Desbloqueada | Mezclar | Reproducir un mensaje desde la lista | Música baja durante el mensaje y vuelve a volumen normal al terminar | NOT YET VERIFIED |
| 2 | iPhone | Bloqueada | Mezclar | Mensaje sonando, ver pantalla bloqueada | Sin controles de Finisher Legacy; los de la app de música siguen | NOT YET VERIFIED |
| 3 | iPhone | Bloqueada | Pausar | Mensaje sonando | Música en pausa; Now Playing con remitente; ⏯ funciona; ⏩ = siguiente mensaje; ⏪ = reiniciar/anterior | NOT YET VERIFIED |
| 4 | iPhone | Bloqueada | Pausar | Fin del mensaje | La música se reanuda sola | NOT YET VERIFIED |
| 5 | iPhone | Bloqueada | Mezclar | Entrenamiento «3 min», 15 min con pantalla bloqueada | Un mensaje a 0:00, 3:00, 6:00, 9:00, 12:00, 15:00 (±2 s), música atenuada solo durante cada uno | NOT YET VERIFIED |
| 6 | iPhone | Bloqueada | Pausar | Entrenamiento «3 min», 10 min | Mensajes a tiempo; la música se pausa en cada uno (o, si iOS rechaza la sesión no mezclable en segundo plano, solo baja — anotar cuál) | NOT YET VERIFIED |
| 7 | iPhone | Bloqueada | Mezclar | Entrenamiento «5 min» SIN música | Mensajes a tiempo; nada audible entre mensajes | NOT YET VERIFIED |
| 8 | iPhone | Desbloqueada | — | Pausar el entrenamiento, bloquear 10 min, reanudar | Nada suena en pausa; el siguiente mensaje respeta el tiempo de entrenamiento | NOT YET VERIFIED |
| 9 | iPhone | Bloqueada | Mezclar | Llamada entrante durante la espera y durante un mensaje | El entrenamiento se pausa; al colgar se reanuda | NOT YET VERIFIED |
| 10 | iPhone | Bloqueada | Mezclar | Desconectar audífonos durante un mensaje | El mensaje y el entrenamiento se pausan | NOT YET VERIFIED |
| 11 | iPhone | Bloqueada | Mezclar | Cola agotada («Escuchaste todos») | Se detiene el silencio (Ajustes › Batería sin audio de la app después) | NOT YET VERIFIED |
| 12 | Android | Desbloqueada | Mezclar | Reproducir un mensaje | Música baja y vuelve | NOT YET VERIFIED |
| 13 | Android | Bloqueada | Mezclar | Mensaje sonando | Notificación multimedia con remitente; ⏩ = siguiente; ⏪ = reiniciar/anterior | NOT YET VERIFIED |
| 14 | Android | Bloqueada | Pausar | Mensaje sonando y al terminar | Música se pausa y se reanuda al terminar | NOT YET VERIFIED |
| 15 | Android | Bloqueada | Mezclar | Entrenamiento «3 min», 15 min, pantalla apagada | Notificación «Modo entrenamiento · Sesión activa» entre mensajes; mensajes a tiempo (prueba del latido nativo) | NOT YET VERIFIED |
| 16 | Android | Bloqueada | — | Pausar desde la notificación «Sesión activa» y reanudar | El reloj se pausa («En pausa») y se reanuda | NOT YET VERIFIED |
| 17 | Android | Bloqueada | Mezclar | Entrenamiento «10 min» 30 min con ahorro de batería activado | Mensajes a tiempo; anotar si el fabricante (Xiaomi/Samsung) mata el servicio | NOT YET VERIFIED |
| 18 | Ambas | Bloqueada | — | Mensaje de solo texto dentro de la cola «Seguido» | El tiempo de lectura avanza y pasa al siguiente con la pantalla bloqueada | NOT YET VERIFIED |
| 19 | Ambas | Desbloqueada | — | Cola cargada hace >1 h (URL firmada vencida) | Breve carga y el audio suena (URL re-firmada), sin mensaje de error | NOT YET VERIFIED |
| 20 | Ambas | Desbloqueada | — | Mismo caso sin conexión | «No pudimos reproducir este audio…»; con conexión, tocar reproducir lo recupera | NOT YET VERIFIED |
| 21 | Ambas | Desbloqueada | — | Cambiar Mezclar ↔ Pausar con un mensaje sonando | Cambia al momento; en iPhone aparecen/desaparecen los controles bloqueados | NOT YET VERIFIED |
| 22 | Ambas | — | — | Terminar el entrenamiento | Desaparece «Sesión activa» y la notificación (Android); nada sigue sonando | NOT YET VERIFIED |
