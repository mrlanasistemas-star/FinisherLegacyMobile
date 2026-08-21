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

Todas las pantallas de la lista anterior están rediseñadas (`tsc`, `expo lint`, `expo-doctor`, `npx expo export` para Android e iOS, `npm test`, todo en verde). Ningún dato/hook/mutación real cambió — sólo composición, media y movimiento.

**Nota honesta (AGENTS.md §215):** "todo en verde" cubre tipos/lint/tests/bundle — no reemplaza revisar la app en un dispositivo real. Auth (Welcome/Login/Register/Onboarding) se marcó ✅ demasiado pronto en la primera pasada; con pruebas reales aparecieron CTAs cortados y una mascota puramente decorativa. Esa corrección específica está en `## Corrección Auth §186–217` más abajo — sólo esa sección puede considerarse validada contra dispositivo real hasta la próxima ronda de pruebas del usuario.

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

## Capa de componentes nativa tipo shadcn (`src/components/ui/`)

Filosofía shadcn (composable, accesible, minimal, themeable) aplicada con primitives 100% nativas — sin `shadcn/ui` web ni Radix. No se instaló una librería de sheets/dialogs dedicada: `Sheet` y `ConfirmDialog` se construyeron sobre `Modal` + `react-native-gesture-handler` + Reanimated, ya dependencias del proyecto (AGENTS.md §165 disciplina de dependencias).

- `Badge`, `Separator`, `SegmentedControl`, `Sheet`, `SheetActionRow`, `ConfirmDialog`, `Toast`/`toastStore`, `OfflineBanner`.
- `AppButton` ganó una variante `glass` y un highlight superior sutil en las variantes sólidas (primary/destructive) — se evolucionó el componente existente en vez de crear `Button`/`GoldButton` paralelos (AGENTS.md §167).
- **Toast** reemplaza el texto de éxito inline en Ajustes → Cuenta y la navegación silenciosa al editar/eliminar medalla.
- **ConfirmDialog** reemplaza `Alert.alert()` nativo para eliminar medalla y cerrar sesión — mismo copy de acción/consecuencia/cancelación, pero de marca.
- **Sheet** reemplaza los dos botones sueltos de editar/eliminar en Medal Detail por un menú de acciones (icono "más"), con eliminar separado y destructivo dentro del sheet.
- **SegmentedControl** filtra Eventos en Próximos/Pasados comparando `event_date` real contra hoy — sin nuevo parámetro de API inventado.
- **OfflineBanner** usa `expo-network`'s `useNetworkState()`; sin conexión muestra un banner discreto arriba, al reconectar dispara un toast "Conexión restaurada".
- **Compartir real**: perfil propio, perfil público (`https://finisherlegacy.com/@{username}`) y evento (`https://finisherlegacy.com/events/{slug}`) usan `Share` de React Native — URLs confirmadas leyendo `routes/web.php` del backend, no inventadas. Medalla no tiene URL pública en el backend, así que no se agregó "compartir medalla".

## Mascot Guide (`src/hooks/use-mascot-tip.ts`, `src/components/brand/mascot-tip.tsx`)

Tips contextuales de la mascota, cada uno con un `id` fijo, mostrados una sola vez y persistidos en `uiStore.seenTips` (AsyncStorage, igual que el onboarding). Presentes en: Legacy Vault (primer contenido), Eventos, Perfil. El copy del Scanner ("Apunta al código de tu placa") ya cubre la guía equivalente sin duplicar con una burbuja extra — evita sobreusar la mascota (AGENTS.md §101, 5–15% de momentos). El momento de reclamo de la primera medalla usa el conteo real de `useMedals()` después de invalidar la cache (total === 1) para mostrar "Tu primera historia ya está aquí." sólo quien realmente reclama por primera vez — no se inventa el estado.

## Corrección Auth §186–217

Pruebas en dispositivo Android real detectaron que Welcome/Login/Register no estaban al nivel — CTAs parcialmente ocultos, mascota puramente decorativa, formularios sin suficiente vida. Corregido:

- **Causa real del corte de CTA**: `Welcome` usaba un `View` con `flex: 1` para la sección de botones dentro de una pantalla ya de altura fija — en pantallas cortas ese `flex:1` se comprimía a una fracción insuficiente para el texto + 2 botones, y sin `ScrollView` el exceso quedaba fuera del viewport. Fix: la sección de CTA ahora tiene tamaño natural (sin `flex`), toda la pantalla es un `ScrollView`, y el alto del hero se calcula con `useResponsive().isShort` en vez de un porcentaje fijo. El mismo patrón (contenido sin `flex` + scroll) ya estaba correcto en Onboarding, que no tenía este bug.
- **Login**: el CTA ahora aparece inmediatamente después de los campos (antes había secciones intermedias que lo empujaban fuera de la primera vista). Se agregó enlace "¿Olvidaste tu contraseña?" — honesto, sin backend, muestra un toast en vez de fingir un envío (mismo patrón que Google).
- **Register**: CTA principal ahora **sticky** al fondo (`GlassSurface` + `AppButton`, con `paddingBottom` en el scroll para que ningún campo quede detrás), reachable sin importar cuánto haya scrolleado el usuario — sin convertirlo en wizard de varios pasos.
- **`useResponsive` ganó `heightClass`** (`short` < 700 / `regular` / `tall` > 850) y `isShort`, usado para achicar hero/mascota/tipografía en Welcome y Onboarding en pantallas cortas.
- **Mascota real, no decoración**: nuevo `MascotGuideBubble` — siempre visible (a diferencia de `MascotTip`, que se oculta tras verse una vez), con copy contextual real (bienvenida en Welcome, "qué bueno verte otra vez" en Login, "vamos a crear tu Legacy" en Register) y una microinteracción real al tocar el portrait (scale + rotate ≤2° + haptic + cambia de mensaje si hay más de uno) — nunca chatbot, nunca sonido.
- **`AppButton` primary**: ahora siempre lleva el glow dorado (antes era opt-in por pantalla), radio 16, `minHeight` 56, `pressed` con `translateY`+reducción de glow, y estados `onHoverIn/onHoverOut` reales para tablet/puntero (nunca requeridos para descubrir la acción — touch sigue siendo el camino principal).
- **`FormInput`**: el ícono y el label ahora también cambian a dorado en foco (antes sólo el borde animaba), más un glow externo sutil (`shadowOpacity`/`shadowRadius` animados) — nunca en estado de error.
- **`SocialButton`/Google**: hover real, radio 16, altura 54 — ya no se percibe como texto con ícono.
- **Nuevo `AppLink`**: unifica los enlaces de texto ("Regístrate", "Inicia sesión", "¿Olvidaste tu contraseña?") con hover (subrayado) y touch target de 44pt vía `hitSlop`, reemplazando `Pressable`+`AppText` sueltos repetidos en cada pantalla.
- **Ícono de engranaje flotante**: verificado por grep en todo `src/` — no existe ningún ícono de configuración/gear en el código de la app, ni superpuesto a Auth ni en ningún otro lado. Lo que se vio en el dispositivo es el propio overlay de desarrollo de Expo Go (menú "shake to open dev menu"), no parte de la app — desaparece por completo en un build real (`eas build`).

**Pendiente de confirmación real:** todo lo anterior está verificado por tipos/lint/tests/bundle, pero — siguiendo la regla de este mismo documento — no se marca `✅` definitivo hasta que se confirme en el dispositivo Android real que motivó esta corrección.

## Segunda corrección Auth — bug real de overlap + sticky CTA definitivo

La corrección anterior no fue suficiente. Dos causas raíz reales encontradas y corregidas:

1. **El botón/texto que "no se veía" era un bug real de Android, no percepción**: el `elevation: 8` que se agregó al glow del botón primary (y `shadows.card`/`shadows.gold` con elevation 6-8 usados en medal cards, event cards y el botón de escanear) promueve esa vista a su propia capa de composición en Android — con poco espacio entre elementos, esa capa se pintaba literalmente encima del control vecino, dejando sólo su borde visible. Confirmado y corregido bajando elevation a 2-3 en `theme/tokens.ts` (`shadows.card`/`shadows.gold`) y en `AppButton`.
2. **CTA ahora sticky en las tres pantallas, no sólo Register**: en vez de confiar en que el cálculo de `flex`/scroll deje suficiente espacio, Welcome y Login ahora usan el mismo patrón que Register — el CTA principal vive en una barra fija al fondo (`position: 'absolute'` + `GlassSurface` + safe-area), fuera del flujo de scroll. Es imposible que quede fuera de vista sin importar el alto del dispositivo o el copy.

Además:
- **Warning real de `BlurView` resuelto**: `blurMethod="dimezisBlurView"` requiere un `blurTarget` (ref a un `BlurTargetView`) que nunca se configuró — sin él, sólo generaba el warning y no aplicaba blur real de todas formas. Se quitó esa prop; `GlassSurface` ahora usa `blurMethod` por defecto (`'none'` en Android) con el tint translúcido existente como base — mismo look, cero warning. iOS conserva blur real.
- **Mascota reducida** ~30%: `portraitSize` bajó de 44-56 a 38-40, bubble en modo `compact` (menos padding, `numberOfLines={2}`, texto más chico) en Welcome/Login/Register, y el copy se acortó a una sola frase por pantalla.
- **Hero de Welcome**: tamaño de fuente bajado (52→36, 30 en pantallas cortas), altura del hero recalculada con `isShort`/`isTall`, párrafo de apoyo movido a `variant="caption"` con `maxWidth` para que no ocupe media pantalla.
- **`useResponsive` ganó `isTall`** además de `isShort`, con los cortes ajustados a ≤760 / 761–860 / >860.
- **Ícono flotante — reconfirmado por tercera vez**: grep completo de `src/` (incluyendo `_layout.tsx`, providers, y cualquier `position: 'absolute'` a nivel raíz) no encuentra ningún ícono de configuración. Tampoco hay plugin de DevTools de Expo Router instalado. Es el overlay propio de Expo Go — para confirmarlo de forma concluyente: si aparece igual en Home/Vault (pantallas ya autenticadas, código completamente distinto), es 100% Expo Go y no la app.
- **Cleanup**: nuevo `OrDivider` reemplaza el bloque de tres `View` duplicado en Login y Register; no se encontraron `Alert.alert` residuales, componentes huérfanos, ni `console.log` sueltos en un barrido completo de `src/`.
