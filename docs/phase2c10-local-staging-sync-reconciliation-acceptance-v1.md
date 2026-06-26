# PHASE2C10_LOCAL_STAGING_SYNC_RECONCILIATION_ACCEPTANCE_V1

Fecha: 2026-06-26
Estado: acceptance local/staging sintetica

## Alcance

Acceptance in-memory para demostrar reconciliacion local/staging sin Supabase, sin produccion, sin endpoint, sin UI y sin documentos reales.

## Escenarios cubiertos

- Device A crea un borrador sintetico.
- Device B actualiza el mismo borrador con `expectedVersion` actual.
- Device A intenta actualizar con version antigua y recibe conflict.
- Documentos sinteticos `issued`, `locked`, `canceled` y legacy no borrador se rechazan.
- Cambios de `snapshotHash`, `pdfSnapshotHash` y numeracion protegida se rechazan.
- Cross-user y cross-scope desde payload no confiable se rechazan.
- Conflict report y safe report no devuelven cuerpos completos ni payload amplio.
- Runtime observable sin Supabase, red ni filesystem.

## Datos

Todos los IDs usan prefijo `SYNTHETIC_ONLY_*`. No hay datos reales ni facturas reales.
