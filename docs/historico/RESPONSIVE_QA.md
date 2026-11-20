> **Histórico/superseded** — auditoría de código de la primera pasada (auth/home/vault/scanner/events/profile). Las prácticas descritas aquí (Screen+SafeAreaView, sin `width`/`height` fijos, `numColumns`+flex en grids, `KeyboardAvoidingView`, `hitSlop`/`minHeight` táctil) siguen siendo la convención del proyecto y se usaron también en las pantallas nuevas, pero éstas no tuvieron la misma auditoría línea por línea documentada aquí. Ver [`DEVICE_QA.md`](./DEVICE_QA.md) para el checklist de verificación vigente (incluye las pantallas nuevas).

# Responsive QA

## Estado

Auditoría por código (no hay simuladores/dispositivos físicos disponibles en este entorno de desarrollo automatizado) — pendiente una pasada visual real en dispositivo antes de publicar.

## Prácticas aplicadas

- Ningún componente usa `width`/`height` fijos en píxeles para layout de pantalla completa; todo pasa por `flex`, `%`, `aspectRatio` o `useWindowDimensions` (usado en onboarding para el paging horizontal).
- `Screen` (`src/components/screen.tsx`) envuelve cada pantalla en `SafeAreaView` con `edges` explícitos — ningún contenido queda debajo de status bar / notch / Dynamic Island / barra de navegación Android.
- Grids (Legacy Vault) usan `numColumns` + `flex: 1` por celda, no anchos fijos — se adaptan a pantallas de 320px a tablet sin overflow.
- Formularios (`login`, `register`, `settings/account`, `medals/create`, `medals/edit`) están envueltos en `KeyboardAvoidingView` con `behavior="padding"` en iOS, y los `Screen scroll` correspondientes evitan que el teclado tape el input activo.
- Tamaños táctiles: botones (`AppButton`) usan `minHeight: 44/52`; iconos interactivos usan `hitSlop`.

## Pendiente antes de publicación

- Verificación visual real en: iPhone SE (pantalla pequeña), un iPhone Pro Max (Dynamic Island), un Android gama baja (320–360px), un Android grande, y un tablet Android/iPad.
- Verificar landscape en `legacy/scan` (cámara) — actualmente `orientation: portrait` está forzado en `app.json`, por lo que landscape no aplica en V1; si se habilita, la pantalla de escaneo es la primera candidata a revisar.
