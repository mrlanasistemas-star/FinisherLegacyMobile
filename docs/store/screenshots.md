# Capturas de pantalla

Usa la **cuenta de revisión** (datos demo) o una cuenta real con permiso de las personas que aparezcan. Nunca muestres datos personales de terceros, correos ni tokens.

## Pantallas a capturar (en este orden)

1. **Inicio** (pestaña Inicio) — resumen de tu legado.
2. **Recuerdos** — medallas e historias.
3. **Detalle de medalla** — foto, tiempo, ritmo e historia.
4. **Activar Finisher Legacy Tag** — pantalla «Acerca tu tag» del flujo NFC (`Recuerdos › Activar una pieza con NFC`).
5. **Seguimiento en vivo** — panel activo de una carrera (requiere una participación real; si no tienes, omítela).
6. **Comunidad** — feed de momentos.
7. **Perfil** — perfil del atleta.
8. **Colecciones** — catálogo del Finisher Legacy Tag.

Play: 2–8 capturas 9:16. App Store: 3–10 por tamaño (6.9").

## Android con `adb` (teléfono conectado por USB)

```bash
adb devices                                   # el teléfono debe aparecer como "device"
# Barra de estado limpia (hora 9:41, batería llena, sin notificaciones)
adb shell settings put global sysui_demo_allowed 1
adb shell am broadcast -a com.android.systemui.demo -e command enter
adb shell am broadcast -a com.android.systemui.demo -e command clock -e hhmm 0941
adb shell am broadcast -a com.android.systemui.demo -e command battery -e level 100 -e plugged false
adb shell am broadcast -a com.android.systemui.demo -e command network -e wifi show -e level 4
adb shell am broadcast -a com.android.systemui.demo -e command notifications -e visible false

# Una captura por pantalla (navega en el teléfono y luego):
adb exec-out screencap -p > docs/store/shots/android/01-inicio.png

# Al terminar
adb shell am broadcast -a com.android.systemui.demo -e command exit
```

`docs/store/shots/` no se versiona si pesa mucho; guárdalas donde prefieras. Las capturas de un teléfono moderno (p. ej. 1080×2400) cumplen los límites de Play (320–3840 px). Si la proporción supera 2:1, Play las acepta; si prefieres 9:16 exacto, recórtalas a 1080×1920.

## iPhone

- **Simulador (recomendado para tamaños exactos):** en una Mac, `eas build -p ios --profile development` con `ios.simulator: true` o `npx expo run:ios`, abrir el simulador **iPhone 16 Pro Max** (1320×2868, 6.9") y usar `xcrun simctl io booted screenshot 01-inicio.png`. Barra limpia: `xcrun simctl status_bar booted override --time 9:41 --batteryLevel 100 --cellularBars 4`.
  - Las pantallas NFC no funcionan en simulador; captura la pantalla «Acerca tu tag» igualmente (se muestra antes de leer).
- **iPhone real:** botón lateral + subir volumen. Un iPhone 15/16 Pro Max da 1290×2796 / 1320×2868 (6.9"). Revisa que no tengan transparencia (las capturas del sistema no la tienen).

## Gráfico de funciones (solo Play)

1024×500 px, fondo claro de marca `#F8F7F3`, monograma FL y el tag. Sin texto pequeño ni bordes con información importante (Play lo recorta en algunos lugares).
