# Documentos históricos

Los documentos de esta carpeta **son históricos y no describen decisiones
vigentes**: planes por fase, auditorías y huecos de backend de septiembre y
octubre de 2026 (ya cerrados), la primera dirección visual (que asumía una
interfaz oscura), Stripe PaymentSheet, inicio de sesión con Google/Apple y
escaneo QR, todo retirado. Se conservan solo como historial.

Documentación vigente:

- Producto, arquitectura, despliegue, tiendas y pendientes externos: repositorio
  del backend [FinisherLegacy](https://github.com/mrlanasistemas-star/FinisherLegacy)
  (`README.md`, `docs/FUNCIONALIDADES.md`, `docs/ARQUITECTURA.md`,
  `docs/DESPLIEGUE.md`, `docs/PUBLICACION_TIENDAS.md`, `docs/PENDIENTES_EXTERNOS.md`).
- App: [`../ARCHITECTURE.md`](../ARCHITECTURE.md), [`../COMMERCE_ARCHITECTURE.md`](../COMMERCE_ARCHITECTURE.md),
  [`../NFC_ACTIVATION.md`](../NFC_ACTIVATION.md), [`../DEVICE_QA.md`](../DEVICE_QA.md),
  [`../RELEASE_CHECKLIST.md`](../RELEASE_CHECKLIST.md).
- Tiendas: [`../store/`](../store/README.md) (fuente única).

| Documento | Antes en | Reemplazado por |
|---|---|---|
| `MOBILE_IMPLEMENTATION_PLAN.md` | `docs/` | `docs/ARCHITECTURE.md` |
| `MOBILE_BACKEND_GAPS.md`, `MOBILE_BACKEND_REQUIREMENTS.md` | `docs/` | Huecos cerrados; API vigente en el backend `docs/api/v1.md` |
| `API_INTEGRATION.md` | `docs/` | `docs/ARCHITECTURE.md` › Integración con la API |
| `VISUAL_OVERHAUL.md` | `docs/` | `docs/ARCHITECTURE.md` › Estilos (identidad solo clara) |
| `RESPONSIVE_QA.md` | `docs/` | `docs/DEVICE_QA.md` |
| `STORE_RELEASE_CHECKLIST.md` | `docs/` | `docs/store/` y `docs/RELEASE_CHECKLIST.md` |
