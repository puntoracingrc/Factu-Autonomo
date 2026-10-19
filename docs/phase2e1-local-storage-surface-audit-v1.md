# 2E.1 Local storage surface audit

Marker: `PHASE2E1_LOCAL_STORAGE_SURFACE_AUDIT_V1`

Estado: evidencia tecnica interna / auditoria de superficie / sin mutacion.

## Superficies actuales

- Persistencia local del navegador usada por el modo sin cuenta.
- Backup/export/import historico de copia JSON.
- Contratos 2D de local data safety, import dry-run, recovery snapshot y review flow.
- UI de import/restore todavia bloqueada o no conectada segun los gates 2D.

## Riesgos identificados

- Cuota del navegador: una escritura futura podria fallar si el perfil esta cerca del limite.
- Corrupcion JSON: datos truncados, editados manualmente o incompatibles pueden fallar al parsear.
- Sobrescritura: un restore futuro podria destruir borradores, emitidos, counters o snapshots si se conectara sin backup previo.
- Multi-tab: dos pestanas pueden leer estados distintos y pisar cambios si no hay versionado.
- Navegador/perfil: limpieza, modo privado, cambio de dispositivo o perfil distinto pueden dejar al usuario sin datos.
- Versiones: shapes legacy o parciales requieren clasificacion antes de cualquier migracion.
- Seguridad: claves no sinteticas y campos peligrosos deben rechazarse en pruebas.

## Limites de esta fase

- No se lee ni escribe almacenamiento real.
- No se crea UI, ruta, navegacion ni endpoint.
- No se aplica import ni restore.
- No se tocan documentos, facturas, numeracion ni historicos reales.
- No se usa Supabase, produccion ni staging remoto.

## Recomendaciones

- Mantener un adapter disabled por defecto.
- Usar fake/in-memory adapters para acceptance local.
- Exigir backup-before-write antes de cualquier escritura futura.
- Clasificar corrupcion, versiones y shapes legacy antes de preview.
- Mantener safe reports sin payload ni valores de storage.
