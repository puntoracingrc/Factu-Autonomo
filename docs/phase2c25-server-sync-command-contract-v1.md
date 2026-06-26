# PHASE2C25_SERVER_SYNC_COMMAND_CONTRACT_V1

## Objetivo

Definir un contrato server-only para comandos de sincronizacion documental
derivados del servidor.

## Alcance

Archivo principal:

- `src/lib/document-sync-integrity/server-sync-command.ts`

## Contrato

El comando contiene:

- `kind`;
- auth derivada por servidor;
- `requestId` seguro;
- candidate single o batch;
- opciones seguras de batch;
- resumen seguro sin cuerpo documental.

Command kinds:

- `dry_run_single`
- `apply_single`
- `dry_run_batch`
- `apply_batch`
- `get_safe_state`
- `get_conflict_report`
- `get_safe_report`

## Reglas

- `userId` y `scopeId` proceden del auth context server-derived.
- El payload no puede sobrescribir `userId` ni `scopeId`.
- El limite por defecto de batch es 25.
- La respuesta del contrato usa `safe_summary`.
- No se aceptan cuerpos documentales completos ni cuerpos binarios.
- No crea clientes externos.
- No lee variables de entorno.
- No crea endpoints.
- No toca UI.

## Validacion

- `src/lib/document-sync-integrity/server-sync-command.test.ts`
- `validate:phase2c25-server-sync-command-contract`
