# Visual Overhaul

Dirección de arte para la reconstrucción visual de Finisher Legacy Mobile. Cambia composición/media/movimiento — no toca API, auth, stores, navegación ni CRUD ya construidos.

## Principios

1. **La medalla y la historia del atleta son las protagonistas** — no el dashboard. Cada pantalla responde "¿qué logró esta persona?", no "¿qué datos hay que mostrar?".
2. **Negro es parte de la marca.** Silencio visual > saturar de gradients/glow/glass. Dorado es acento, no color base.
3. **Edge-to-edge sobre cards.** `Card` sigue existiendo para contenido tabular real (stats, settings), pero deja de ser la unidad universal de layout — fotografía/medallas van a sangre completa con overlays, no dentro de una tarjeta con padding.
4. **Tipografía editorial.** Números y titulares grandes cargan tanto peso visual como la fotografía.
5. **Movimiento con personalidad, no decoración gratuita.** Springs rápidos y "weighted", nunca bounce de caricatura. Hero/scroll motion sólo en pantallas hero (Home, Medal Detail, Event Detail, Profile).
6. **Degradación con gracia.** Video → imagen → gradiente. Nunca un rectángulo vacío.

## Tokens (`src/theme/tokens.ts`)

Se amplía, no se reemplaza: escala tipográfica editorial (`hero`, `metric`, tracking/uppercase helpers), tokens de superficie (`surface.canvas/elevated/hero`), gradientes de marca (`gradients.ts`) y helpers de breakpoint (`useResponsive`). Paleta se mantiene: `black #0A0A0C`, `graphite #19191C/#28282F`, `gold #C9A159/#DFC08E/#8C7A54`.

## Media

- **Hero de video real confirmado**: `https://finisherlegacy.com/media/home/hero/finisher-hero-desktop.mp4` (200 OK, ~17MB, soporta Range requests). No hay `ffmpeg` disponible en este entorno para generar una versión móvil optimizada, así que **no se auto-reproduce en datos móviles** — `CinematicHero` sólo reproduce video cuando la red es Wi-Fi (`expo-network`), la pantalla tiene foco, y no falló antes; en cualquier otro caso usa el fallback estático (gradiente + numeral gigante decorativo + logo/mascota), nunca un vacío negro.
- Assets reales ya integrados: los 5 logos + `mascot-hero.png` de `assets/images/brand/`. Ninguno se elimina.
- Imágenes remotas (medallas, eventos, perfiles) siguen viniendo de la API vía `expo-image` con cache — nunca se descargan como asset estático del bundle.
- `assets/images/react-logo*`, `expo-badge*`, `expo-logo.png`, `tutorial-web.png`, `logo-glow.png`, `tabIcons/*` son residuos del template de `create-expo-app` sin ninguna referencia en el código real (verificado con grep) — se eliminan en Foundation.

## Componentes nuevos (`src/components/brand/`, `src/components/motion/`)

`CinematicHero`, `GoldGlow`, `MetricNumber`, `SectionTitle`, `LegacyIdTag`, `GlassSurface` (usa `expo-blur`, cross-platform, en vez de `expo-glass-effect` directamente porque ese paquete sólo funciona en iOS 26+ y cae a `View` plano en todo lo demás — `GlassSurface` da un resultado consistente en Android desde el día uno). Motion: `FadeInUp`, `PressScale`, `Stagger` como wrappers reutilizables sobre Reanimated, no snippets copiados por pantalla.

## Orden de implementación

Foundation → Navigation (tab bar + scan action) → Auth (welcome/onboarding/login/register) → Home → Vault + Medal Card → Medal Detail → Scanner + Claim → Events → Profile → Settings → polish/responsive. Se sigue este orden; cada bloque termina con `typecheck` + `lint` + `expo-doctor` limpios antes de continuar.

## Estado

Todas las pantallas de la lista anterior están rediseñadas y verificadas (`tsc`, `expo lint`, `expo-doctor`, `npx expo export` para Android e iOS, `npm test`, todo en verde). Ningún dato/hook/mutación real cambió — sólo composición, media y movimiento.

Componentes de marca nuevos: `CinematicHero`, `GradientOverlay`, `GoldGlow`, `MetricNumber`, `SectionTitle`, `LegacyIdTag`, `PlateCard`, `GlassSurface`, `HeroFallback`, `MedalHeroTile`. Motion: `Reveal`/`Stagger`, `PressScale`. `MedalCard`/`EventCard` reconstruidos edge-to-edge con gradient overlay en vez del patrón ícono+texto anterior.

Ícono de app/adaptive icon regenerado a partir de la marca real (`logo-mark-gold.png` sobre negro `#0A0A0C`) con `sharp`, reemplazando el placeholder azul de `create-expo-app`; `assets/expo.icon` (Icon Composer del template) y los assets sin usar (`react-logo*`, `expo-badge*`, `expo-logo.png`, `tutorial-web.png`, `logo-glow.png`, `tabIcons/*`, `splash-icon.png`) se eliminaron tras confirmar por grep que ninguno tenía referencias reales.

Pendiente real (no bloqueante, requiere assets que el usuario todavía no ha proporcionado):

| Archivo | Tipo | Formato recomendado | Dónde se usaría |
|---|---|---|---|
| `finisher-hero-mobile.mp4` | Video vertical-friendly, sin audio, corto | H.264, 720×1280 aprox., <5–7MB | `CinematicHero` en Welcome/Home — hoy usa el video desktop real (`finisherlegacy.com/media/home/hero/finisher-hero-desktop.mp4`, confirmado 200 OK) pero sólo se autorreproduce en Wi-Fi para no gastar datos móviles; con una versión ligera podría autorreproducirse siempre |
| Foto de corredores/meta/comunidad | JPEG/PNG, orientación retrato | 1080×1350 aprox. | Fallback de `CinematicHero` en Welcome/Home cuando no hay video (hoy usa una composición decorativa: gradiente + glow + numeral) |
| Foto de placa (frente/reverso) | JPEG/PNG | cuadrada o 4:5 | `PlateCard` en el lookup de Legacy Code (hoy es una composición tipográfica, no una fotografía) |
| Fotos de eventos | JPEG/PNG | 16:10 aprox. | Ya conectado a `event.cover_url`/`edition.event.cover_url` reales de la API — sólo falta que los eventos reales tengan foto cargada en el backend |

No se usaron placeholders genéricos para ninguno de estos — donde falta el asset, el fallback es una composición de marca (gradiente/glow/tipografía/mascota), nunca un rectángulo vacío ni una imagen de stock inventada.
