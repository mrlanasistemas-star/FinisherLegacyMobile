# Actualizaciones por aire (EAS Update)

La app recibe cambios de JavaScript, textos e imágenes sin reinstalar ni pasar
por la tienda. Está configurada con `expo-updates`:

- `app.json` › `updates.url`: el servidor de EAS Update del proyecto
  (`f6dce084-4b31-4f64-980a-917784b1f5c3`, cuenta `zuriel2026s-team`).
- `app.json` › `runtimeVersion: { policy: "appVersion" }`: un build solo recibe
  actualizaciones publicadas con su misma `version` (hoy `1.0.0`).
- `eas.json`: cada perfil de build tiene su canal (`development`, `preview`,
  `production`). Un APK de `preview` solo escucha el canal `preview`.
- `checkAutomatically: ON_LOAD`: la app busca la actualización al abrirse y la
  descarga en segundo plano. **Se ve en la siguiente apertura** (cerrar la app
  por completo y volver a abrirla).

## Publicar una actualización

```bash
npm run update:preview -- "Qué cambió"        # teléfonos con el APK de prueba
npm run update:production -- "Qué cambió"     # usuarios de la tienda
```

El script `scripts/publish-update.mjs` fija `EXPO_PUBLIC_API_URL` y
`EXPO_PUBLIC_WEB_URL` a los valores de producción de `eas.json` antes de llamar
a `eas update`. Así una actualización nunca sale apuntando al `localhost` de
`.env.local`. No uses `eas update` a mano por esa razón.

Revisar o revertir:

```bash
npx eas-cli update:list --branch preview
npx eas-cli update:rollback          # vuelve a la actualización anterior
```

## Cuándo NO basta una actualización (hace falta build nuevo)

Necesitan `eas build` (y subir `version` en `app.json`, p. ej. `1.0.1`):

- instalar o actualizar una librería con código nativo (`npx expo install …`
  de un paquete nativo, `expo install --fix` del SDK);
- permisos, plugins o cualquier cambio en `app.json` / `app.config.ts`;
- icono, splash, nombre, identificador o esquema.

Si no subes `version` tras un cambio nativo, la actualización llegaría a builds
viejos que no tienen ese código nativo y la app podría cerrarse al abrir.

## Primer build con actualizaciones

Los builds hechos antes de instalar `expo-updates` **no** reciben nada. Hay que
instalar al menos una vez un build nuevo:

```bash
npx eas-cli build -p android --profile preview      # APK para probar
npx eas-cli build -p android --profile production   # AAB para Play
```
