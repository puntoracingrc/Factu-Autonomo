# 2E.4 Storage error taxonomy

Marker: `PHASE2E4_STORAGE_ERROR_TAXONOMY_V1`

Estado: taxonomia segura / redaccion / sin payload.

## Clasificaciones

- `quota_exceeded`
- `unavailable`
- `parse_error`
- `corrupted_payload`
- `version_mismatch`
- `write_blocked`
- `read_blocked`
- `delete_blocked`
- `non_synthetic_key_rejected`
- `suspicious_key`
- `unknown_error`

## Funciones

- `classifyLocalStorageResilienceError`
- `redactLocalStorageResilienceError`
- `summarizeLocalStorageResilienceError`

## Reglas

- No se devuelven stack traces.
- No se copia payload ni valor almacenado.
- La remediacion es prudente y mantiene fail-closed.
- Los errores de claves sospechosas se convierten en resumen seguro.
