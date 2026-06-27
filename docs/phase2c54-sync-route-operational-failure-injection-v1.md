# PHASE2C54_SYNC_ROUTE_OPERATIONAL_FAILURE_INJECTION_V1

Pruebas de fallos operativos del handler privado.

## Fallos inyectados

- Adapter throws.
- Service throws.
- Telemetry sink throws.
- Rate limiter throws.
- Idempotency store throws.
- Comando malformado.
- RequestId factory throws.

## Criterio de seguridad

El handler debe devolver error controlado o resultado seguro, sin stack trace, sin payload completo, sin snapshots y sin filtrar detalles internos de la dependencia rota.

## Evidencia

`scripts/phase2c54-sync-route-operational-failure-injection.test.ts` cubre fallos antes, durante y despues de construir el comando. La telemetria es evidencia in-memory y no debe tumbar la request.

## Estado

Failure injection local completado para el handler privado. No cambia comportamiento productivo ni habilita la route.
